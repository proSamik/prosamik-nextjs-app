'use client';

import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { authClient } from '@/lib/auth-client';

export default function SignOutButton() {
    const router = useRouter();

    return (
        <button
            type="button"
            className="rounded-xl border border-stone-300 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:border-stone-500 hover:bg-white"
            onClick={async () => {
                await authClient.signOut();

                if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
                    posthog.capture('user_logged_out');
                    posthog.reset();
                }

                router.push('/sign-in');
            }}
        >
            Sign out
        </button>
    );
}
