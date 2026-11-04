const NATIVE_HTTP_LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isNativeRedirectUri(value: unknown): boolean {
    if (typeof value !== 'string') {
        return false;
    }

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    if (url.protocol === 'http:') {
        return NATIVE_HTTP_LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
    }

    // Private-use schemes (e.g. com.example.app:/callback) only make sense for
    // native apps; https and everything else keeps the RFC default of "web".
    return url.protocol !== 'https:' && url.protocol !== 'javascript:' && url.protocol !== 'data:';
}

/**
 * Many MCP clients are local apps that register an http loopback redirect
 * without sending `application_type`. OIDC DCR defaults that to "web", which
 * forbids loopback redirects, so registration fails. When every redirect URI
 * is native-only, infer `application_type: "native"` instead. The library
 * still applies its full native redirect validation afterwards.
 */
export function inferNativeApplicationType(body: unknown): Record<string, unknown> | null {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }

    const metadata = body as Record<string, unknown>;
    if (metadata.application_type !== undefined) {
        return null;
    }

    const redirectUris = metadata.redirect_uris;
    if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every(isNativeRedirectUri)) {
        return null;
    }

    return { ...metadata, application_type: 'native' };
}
