import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { headers } from 'next/headers';
import {
    ACCOUNTABILITY_SCOPES,
    ApiKeyCreateRequestSchema,
    ApiKeyRevokeRequestSchema,
} from '@/lib/accountability-contract';
import {
    getAccountabilityOwner,
    isSameOriginRequest,
    privateJson,
} from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import { getDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export { ACCOUNTABILITY_SCOPES };

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return {
            error: privateJson(
                { error: 'Origin not allowed.' },
                { status: 403 },
            ),
        };
    }

    const requestHeaders = await headers();
    const owner = await getAccountabilityOwner(requestHeaders);
    if (!owner)
        return {
            error: privateJson({ error: 'Unauthorized.' }, { status: 401 }),
        };

    const rateLimit = await consumeAccountabilityRateLimit(
        owner.id,
        'api-keys',
        mutation ? 3 : 30,
        60,
    );
    if (!rateLimit.allowed) {
        return {
            error: privateJson(
                { error: 'Too many requests.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': rateLimit.retryAfterSeconds.toString(),
                    },
                },
            ),
        };
    }

    return { error: null, owner };
}

export async function GET(request: Request) {
    const authorization = await authorize(request);
    if (authorization.error || !authorization.owner) return authorization.error;

    const sql = getDatabase();
    const rows = await sql`
        SELECT
            key.id,
            key.label,
            key.key_prefix,
            key.created_at,
            key.expires_at,
            key.revoked_at,
            key.last_used_at,
            COALESCE(array_agg(scope.scope ORDER BY scope.scope) FILTER (WHERE scope.scope IS NOT NULL), ARRAY[]::TEXT[]) AS scopes
        FROM accountability_api_keys AS key
        LEFT JOIN accountability_api_key_scopes AS scope
            ON scope.owner_id = key.owner_id AND scope.api_key_id = key.id
        WHERE key.owner_id = ${authorization.owner.id}
        GROUP BY key.id
        ORDER BY key.created_at DESC
        LIMIT 100
    `;

    const logs =
        await sql`SELECT id, api_key_id, client_id, method, tool_name, outcome, http_status, duration_ms, occurred_at FROM accountability_mcp_access_logs WHERE owner_id=${authorization.owner.id} ORDER BY occurred_at DESC LIMIT 100`;
    return privateJson({
        data: {
            logs,
            keys: rows,
            availableScopes: ACCOUNTABILITY_SCOPES,
            oauth: {
                endpoint: '/api/mcp',
                authorizationServer: '/api/auth',
                scopes: ['openid', 'offline_access', ...ACCOUNTABILITY_SCOPES],
                status: 'configured_after_private_environment_setup',
            },
        },
    });
}

export async function POST(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;

    const body = await request.json().catch(() => null);
    const parsed = ApiKeyCreateRequestSchema.safeParse(body);
    if (!parsed.success)
        return privateJson(
            { error: 'Invalid API key settings.' },
            { status: 400 },
        );

    const id = randomUUID();
    const keyId = randomBytes(9).toString('base64url');
    const secret = randomBytes(32).toString('base64url');
    const token = `psamik_${keyId}.${secret}`;
    const verifierHash = createHash('sha256').update(token, 'utf8').digest();
    const keyPrefix = token.slice(0, 15);
    const issuedAt = Date.now();
    const expiresAt = parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : new Date(
              issuedAt +
                  (parsed.data.expiresInMinutes ??
                      (parsed.data.expiresInDays ?? 90) * 1440) *
                      60000,
          );
    const lifetime = expiresAt.getTime() - issuedAt;
    if (lifetime < 60000 || lifetime > 365 * 86400000)
        return privateJson(
            {
                error: 'Expiration must be between one minute and 365 days from now.',
            },
            { status: 400 },
        );

    try {
        const sql = getDatabase();
        await sql.begin(async (tx) => {
            await tx`
                INSERT INTO accountability_api_keys (
                    id, owner_id, key_id, key_prefix, label, verifier_hash, expires_at
                ) VALUES (
                    ${id}, ${authorization.owner.id}, ${keyId}, ${keyPrefix}, ${parsed.data.label}, ${verifierHash}, ${expiresAt}
                )
            `;
            for (const scope of [...new Set(parsed.data.scopes)]) {
                await tx`
                    INSERT INTO accountability_api_key_scopes (owner_id, api_key_id, scope)
                    VALUES (${authorization.owner.id}, ${id}, ${scope})
                `;
            }
            await tx`
                INSERT INTO accountability_audit_events (id, owner_id, event_type, entity_id)
                VALUES (${randomUUID()}, ${authorization.owner.id}, 'api_key.created', ${id})
            `;
        });
    } catch {
        return privateJson(
            { error: 'Unable to create an API key.' },
            { status: 500 },
        );
    }

    // This is the only response containing the raw key. The database stores only a SHA-256 verifier.
    return privateJson(
        {
            data: {
                id,
                label: parsed.data.label,
                keyPrefix,
                scopes: [...new Set(parsed.data.scopes)],
                expiresAt: expiresAt.toISOString(),
                token,
            },
        },
        { status: 201 },
    );
}

export async function DELETE(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;

    const body = await request.json().catch(() => null);
    const parsed = ApiKeyRevokeRequestSchema.safeParse(body);
    if (!parsed.success)
        return privateJson({ error: 'Invalid API key.' }, { status: 400 });

    const sql = getDatabase();
    const revoked = await sql.begin(async (tx) => {
        const rows = await tx`
            UPDATE accountability_api_keys
            SET revoked_at = NOW()
            WHERE owner_id = ${authorization.owner.id}
              AND id = ${parsed.data.id}
              AND revoked_at IS NULL
            RETURNING id
        `;
        if (rows.length === 0) return false;
        await tx`
            INSERT INTO accountability_audit_events (id, owner_id, event_type, entity_id)
            VALUES (${randomUUID()}, ${authorization.owner.id}, 'api_key.revoked', ${parsed.data.id})
        `;
        return true;
    });

    if (!revoked)
        return privateJson({ error: 'API key not found.' }, { status: 404 });
    return privateJson({ ok: true });
}
