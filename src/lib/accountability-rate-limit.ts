import { getDatabase } from '@/lib/database';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };
let cleanupTick = 0;

async function pruneExpiredRateLimitWindows(sql: ReturnType<typeof getDatabase>): Promise<void> {
    cleanupTick = (cleanupTick + 1) % 128;
    if (cleanupTick !== 0) return;

    // Opportunistic indexed cleanup is strictly bounded and never touches an
    // active window. Multiple instances use SKIP LOCKED to avoid contention.
    await sql`
        WITH expired AS (
            SELECT ctid
            FROM accountability_pre_auth_rate_limit_windows
            WHERE expires_at < NOW() - INTERVAL '5 minutes'
            ORDER BY expires_at ASC
            LIMIT 250
            FOR UPDATE SKIP LOCKED
        )
        DELETE FROM accountability_pre_auth_rate_limit_windows AS rate_window
        USING expired
        WHERE rate_window.ctid = expired.ctid
    `.catch(() => undefined);
    await sql`
        WITH expired AS (
            SELECT ctid
            FROM accountability_rate_limit_windows
            WHERE expires_at < NOW() - INTERVAL '5 minutes'
            ORDER BY expires_at ASC
            LIMIT 250
            FOR UPDATE SKIP LOCKED
        )
        DELETE FROM accountability_rate_limit_windows AS rate_window
        USING expired
        WHERE rate_window.ctid = expired.ctid
    `.catch(() => undefined);
}

/** Fixed-window counters live in PostgreSQL so they are shared by app instances. */
export async function consumeAccountabilityRateLimit(
    ownerId: string,
    bucketKey: string,
    maxHits: number,
    windowSeconds: number,
    apiKeyId: string | null = null,
): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const expiresAt = new Date(windowStart.getTime() + windowMs);
    const sql = getDatabase();

    const rows = apiKeyId
        ? await sql`
            INSERT INTO accountability_rate_limit_windows (
                owner_id, api_key_id, bucket_key, window_start, window_seconds, hit_count, expires_at
            ) VALUES (
                ${ownerId}, ${apiKeyId}, ${bucketKey}, ${windowStart}, ${windowSeconds}, 1, ${expiresAt}
            )
            ON CONFLICT (owner_id, api_key_id, bucket_key, window_start)
                WHERE api_key_id IS NOT NULL
            DO UPDATE SET
                hit_count = accountability_rate_limit_windows.hit_count + 1,
                updated_at = NOW()
            RETURNING hit_count
        `
        : await sql`
            INSERT INTO accountability_rate_limit_windows (
                owner_id, api_key_id, bucket_key, window_start, window_seconds, hit_count, expires_at
            ) VALUES (
                ${ownerId}, NULL, ${bucketKey}, ${windowStart}, ${windowSeconds}, 1, ${expiresAt}
            )
            ON CONFLICT (owner_id, bucket_key, window_start)
                WHERE api_key_id IS NULL
            DO UPDATE SET
                hit_count = accountability_rate_limit_windows.hit_count + 1,
                updated_at = NOW()
            RETURNING hit_count
        `;

    const hits = Number(rows[0]?.hit_count ?? 0);
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - windowStart.getTime())) / 1000));
    await pruneExpiredRateLimitWindows(sql);
    return { allowed: hits <= maxHits, retryAfterSeconds };
}

/**
 * Throttle untrusted MCP requests before JWT/JWKS or personal-key verification.
 * The configured edge header must be overwritten by the trusted reverse proxy.
 * Only a secret-keyed digest is persisted; raw client addresses are never stored.
 */
export async function consumePreAuthMcpRateLimit(request: Request): Promise<RateLimitResult> {
    const secret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) throw new Error('MCP pre-auth rate-limit secret is not configured.');

    const allowedHeaders = new Set(['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']);
    const configuredHeader = (process.env.MCP_TRUSTED_CLIENT_IP_HEADER || 'cf-connecting-ip').trim().toLowerCase();
    const header = allowedHeaders.has(configuredHeader) ? configuredHeader : 'cf-connecting-ip';
    const forwarded = request.headers.get(header)?.slice(0, 256) ?? '';
    const candidate = header === 'x-forwarded-for' ? forwarded.split(',')[0].trim() : forwarded.trim();
    const ip = isIP(candidate) ? candidate : null;
    const requestUrl = new URL(request.url);
    const source = ip ? `ip:${ip}` : `shared:${requestUrl.host.toLowerCase()}`;
    const windowSeconds = 60;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const expiresAt = new Date(windowStart.getTime() + windowMs);
    const sql = getDatabase();
    const consume = async (subject: string, bucket: string, maxHits: number) => {
        const subjectHash = createHmac('sha256', secret).update(subject, 'utf8').digest();
        const rows = await sql`
            INSERT INTO accountability_pre_auth_rate_limit_windows (
                subject_hash, bucket_key, window_start, window_seconds, hit_count, expires_at
            ) VALUES (
                ${subjectHash}, ${bucket}, ${windowStart}, ${windowSeconds}, 1, ${expiresAt}
            )
            ON CONFLICT (subject_hash, bucket_key, window_start)
            DO UPDATE SET
                hit_count = accountability_pre_auth_rate_limit_windows.hit_count + 1,
                updated_at = NOW()
            RETURNING hit_count
        `;
        return Number(rows[0]?.hit_count ?? 0) <= maxHits;
    };

    // The per-source bucket protects one caller; the shared host-wide bucket
    // also limits floods that rotate or spoof source addresses.
    const [sourceAllowed, globalAllowed] = await Promise.all([
        consume(source, 'mcp.pre_auth.source', ip ? 120 : 3000),
        consume(`global:${requestUrl.host.toLowerCase()}`, 'mcp.pre_auth.global', 10000),
    ]);
    await pruneExpiredRateLimitWindows(sql);
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - windowStart.getTime())) / 1000));
    return { allowed: sourceAllowed && globalAllowed, retryAfterSeconds };
}
