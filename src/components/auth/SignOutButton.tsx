'use client';

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { clearAccountabilityCache } from '@/lib/accountability-client-cache';
import { authClient } from '@/lib/auth-client';

export default function SignOutButton() {
    const router = useRouter();
    const pathname = usePathname() || '';

    return (
        <button
            type="button"
            className="rounded-xl border border-stone-300 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:border-stone-500 hover:bg-white"
            onClick={async () => {
                await authClient.signOut();
                clearAccountabilityCache(true);

                const isPrivateOrAuthPath = pathname === '/samik-admin'
                    || pathname.startsWith('/samik-admin/')
                    || pathname === '/oauth-consent'
                    || pathname.startsWith('/oauth-consent/')
                    || pathname === '/sign-in'
                    || pathname.startsWith('/sign-in/');
                if (!isPrivateOrAuthPath && process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
                    posthog.capture('user_logged_out');
                }
                posthog.reset();

                router.push('/sign-in');
            }}
        >
            Sign out
        </button>
    );
}
