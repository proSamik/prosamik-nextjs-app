/** Check the browser origin against public app URLs, not a proxy's internal URL. */
export function isSameOriginRequest(
    request: Request,
    configuredBaseUrls: readonly (string | undefined)[] = [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.NEXT_PUBLIC_SITE_URL,
    ],
): boolean {
    const origin = request.headers.get('origin');
    if (!origin) return false;
    try {
        const parsedOrigin = new URL(origin);
        if (
            !['http:', 'https:'].includes(parsedOrigin.protocol) ||
            parsedOrigin.origin !== origin
        ) return false;

        const configured = configuredBaseUrls.filter(
            (value): value is string => Boolean(value?.trim()),
        );
        if (configured.length > 0) {
            // Explicit configuration is authoritative. Never trust arbitrary
            // Host or X-Forwarded-* headers to add another allowed origin.
            return configured.some((baseUrl) => {
                try {
                    const url = new URL(baseUrl.trim());
                    return !url.username && !url.password && url.origin === origin;
                } catch {
                    return false;
                }
            });
        }

        // Direct hosting without a configured public URL retains the strict
        // same-origin check, including the original Host header and port.
        const requestUrl = new URL(request.url);
        const host = request.headers.get('host');
        return (!host || host.toLowerCase() === requestUrl.host.toLowerCase())
            && origin === requestUrl.origin;
    } catch {
        return false;
    }
}
