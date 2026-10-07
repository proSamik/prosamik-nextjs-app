const ADMIN_EMAIL = (process.env.AUTH_ADMIN_EMAIL || '').trim().toLowerCase();

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
    return ADMIN_EMAIL !== '' && (email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

/** Restrict post-login redirects to the private admin area and OAuth consent route. */
export function getSafeAdminRedirect(candidate: unknown): string {
    if (typeof candidate !== 'string' || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
        return '/samik-admin';
    }

    try {
        const url = new URL(candidate, 'https://internal.invalid');
        if (url.origin !== 'https://internal.invalid') return '/samik-admin';
        if (url.pathname === '/oauth-consent') return `${url.pathname}${url.search}`;
        if (url.pathname === '/samik-admin' || url.pathname.startsWith('/samik-admin/')) {
            return `${url.pathname}${url.search}`;
        }
    } catch {
        return '/samik-admin';
    }

    return '/samik-admin';
}
