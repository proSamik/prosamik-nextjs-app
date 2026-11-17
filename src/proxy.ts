import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createDualmarkMiddleware } from '@dualmark/nextjs';
import { DEFAULT_LOCALE, isEnabledLocale, splitLocalePath } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

// Every blog post and project story has a markdown twin for agents:
//   /blogs/<slug>.md, `Accept: text/markdown`, or a known AI crawler user agent -> /md/blogs/<slug>
// Humans keep getting HTML, with a `Link: rel=alternate` header pointing at the twin.
const dualmark = createDualmarkMiddleware({ siteUrl: siteMetadata.siteUrl });

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Locale prefixes (e.g. /es/blogs/x) only resolve once a locale is enabled in lib/i18n/config.ts.
    // Until then they are not routed, so URLs stay exactly as they are today.
    const { locale, path, prefixed } = splitLocalePath(pathname);
    if (prefixed) {
        if (!isEnabledLocale(locale)) return NextResponse.next();
        const url = request.nextUrl.clone();
        url.pathname = path;
        const headers = new Headers(request.headers);
        headers.set('x-prosamik-locale', locale);
        return NextResponse.rewrite(url, { request: { headers } });
    }

    const headers = new Headers(request.headers);
    headers.set('x-prosamik-locale', DEFAULT_LOCALE);
    const response = await dualmark(request);
    // Dualmark returns NextResponse.next() for plain HTML requests; forward the locale header then.
    return response ?? NextResponse.next({ request: { headers } });
}

export const config = {
    // Only paths that have a markdown twin. Everything else (API, OAuth, admin) is untouched.
    matcher: ['/blogs', '/blogs.md', '/blogs/:path*', '/projects', '/projects.md', '/projects/:path*'],
};
