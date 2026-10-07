'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

function isPrivateOrAuthenticationPath(pathname: string): boolean {
    return pathname === '/sign-in'
        || pathname.startsWith('/sign-in/')
        || pathname === '/oauth-consent'
        || pathname.startsWith('/oauth-consent/')
        || pathname === '/samik-admin'
        || pathname.startsWith('/samik-admin/');
}

/** Capture only a path-only page view for public routes; never send query strings. */
export default function PostHogPublicPageView() {
    const pathname = usePathname();
    const resetOnPrivateEntry = useRef(false);

    useEffect(() => {
        if (!pathname) return;
        if (isPrivateOrAuthenticationPath(pathname)) {
            if (!resetOnPrivateEntry.current
                && process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
                && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
                // A previous deployment may have persisted an identified user
                // in PostHog storage. Clear it locally before a later public
                // pageview can inherit that identity; reset sends no content.
                posthog.reset();
            }
            resetOnPrivateEntry.current = true;
            return;
        }
        resetOnPrivateEntry.current = false;
        if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) return;

        posthog.capture('$pageview', { $current_url: pathname });
    }, [pathname]);

    return null;
}
