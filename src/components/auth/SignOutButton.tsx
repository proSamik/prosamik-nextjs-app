'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignOutButton() {
    const router = useRouter();

    return (
        <button
            type="button"
            className="rounded-xl border border-stone-300 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:border-stone-500 hover:bg-white"
            onClick={async () => {
                await authClient.signOut();
                router.push('/sign-in');
            }}
        >
            Sign out
        </button>
    );
}
