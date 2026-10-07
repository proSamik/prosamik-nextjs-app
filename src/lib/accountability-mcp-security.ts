import { createHash } from 'node:crypto';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const SCOPE_TOKEN_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type VerifiedMcpPrincipal = {
    /** Subject from the already signature/JWKS-verified OAuth access token. */
    ownerId: string;
    /** OAuth client ID; kept server-side and hashed before use as an update source. */
    clientId: string;
    sourceId: string;
    scopes: string[];
    token: string;
    expiresAt?: number;
    resource: URL;
    /** Set only for database-backed personal API keys. */
    apiKeyId?: string;
};

export type PersonalApiKeyToken = { token: string; keyId: string };

export function isPersonalApiKeyAuthorization(authorizationHeader: string | null): boolean {
    return /^Bearer\s+psamik_/i.test(authorizationHeader ?? '');
}

/** Parse only the exact selector.secret format issued by the admin key flow. */
export function parsePersonalApiKeyAuthorization(authorizationHeader: string | null): PersonalApiKeyToken | null {
    const match = authorizationHeader?.match(/^Bearer\s+(psamik_([A-Za-z0-9_-]{8,40})\.([A-Za-z0-9_-]{43}))$/i);
    return match ? { token: match[1], keyId: match[2] } : null;
}

function isBoundedIdentifier(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 255
        && value.trim() === value
        && /^[\x21-\x7e]+$/.test(value);
}

/**
 * Resolve the same canonical resource URL configured in Better Auth. Remote
 * deployments must use HTTPS; plain HTTP is accepted only for loopback dev.
 */
export function resolveAccountabilityMcpResourceUrl(baseUrl: string, configuredResource?: string): URL {
    const resourceText = configuredResource?.trim() || new URL('/api/mcp', baseUrl).toString();
    const resource = new URL(resourceText);
    const isLoopbackHttp = resource.protocol === 'http:' && LOOPBACK_HOSTS.has(resource.hostname.toLowerCase());
    if ((resource.protocol !== 'https:' && !isLoopbackHttp)
        || resource.username
        || resource.password
        || resource.search
        || resource.hash
        || resource.pathname !== '/api/mcp') {
        throw new Error('The MCP resource must be a canonical HTTPS /api/mcp URL.');
    }
    return resource;
}

/**
 * Reject cross-host requests and browser-originated cross-origin calls before
 * OAuth verification or protocol parsing. Origin is optional for native MCP
 * clients, but if supplied it must be the resource origin exactly.
 */
export function validateAccountabilityMcpRequest(request: Request, resource: URL): boolean {
    let requestUrl: URL;
    try {
        requestUrl = new URL(request.url);
    } catch {
        return false;
    }

    const host = request.headers.get('host');
    if (!host || host.toLowerCase() !== resource.host.toLowerCase()) return false;
    if (requestUrl.host.toLowerCase() !== resource.host.toLowerCase()
        || requestUrl.protocol !== resource.protocol
        || requestUrl.pathname !== resource.pathname
        || requestUrl.search !== ''
        || requestUrl.hash !== '') return false;

    const origin = request.headers.get('origin');
    if (origin === null) return true;
    try {
        return new URL(origin).origin === resource.origin;
    } catch {
        return false;
    }
}

/**
 * Build the request principal only from Better Auth's verified JWT claims.
 * The caller still uses `requireMcpAuth`, which verifies signature, issuer,
 * audience and expiry. Rechecking issuer/audience/expiry here makes the owner
 * binding explicit at the application boundary as well.
 */
export function principalFromVerifiedMcpClaims(
    claims: Record<string, unknown>,
    authorizationHeader: string | null,
    expectedIssuer: string,
    resource: URL,
    nowSeconds = Math.floor(Date.now() / 1000),
): VerifiedMcpPrincipal | null {
    const aud = claims.aud;
    const audiences = typeof aud === 'string' ? [aud]
        : Array.isArray(aud) && aud.every((item) => typeof item === 'string') ? aud as string[]
            : [];
    const expiresAt = claims.exp;
    const scopeClaim = claims.scope;
    const authorization = authorizationHeader?.match(/^(?:Bearer|DPoP)\s+([^\s]+)$/i);

    if (claims.iss !== expectedIssuer
        || !audiences.includes(resource.toString())
        || typeof expiresAt !== 'number'
        || !Number.isSafeInteger(expiresAt)
        || expiresAt <= nowSeconds
        || !isBoundedIdentifier(claims.sub)
        || !isBoundedIdentifier(claims.client_id)
        || typeof scopeClaim !== 'string'
        || scopeClaim.length > 4096
        || !authorization) return null;

    const scopes = scopeClaim ? scopeClaim.split(/\s+/) : [];
    if (scopes.some((scope) => !SCOPE_TOKEN_PATTERN.test(scope))) return null;

    return {
        ownerId: claims.sub,
        clientId: claims.client_id,
        sourceId: `client:${createHash('sha256').update(claims.client_id).digest('hex').slice(0, 40)}`,
        scopes,
        // The SDK only needs an opaque auth-context value for its request
        // handlers; keep the actual bearer token out of tool callback context.
        token: createHash('sha256').update(authorization[1], 'utf8').digest('base64url'),
        expiresAt,
        resource,
    };
}
