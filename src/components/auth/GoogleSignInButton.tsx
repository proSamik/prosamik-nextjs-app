'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type GoogleSignInButtonProps = {
    fallbackCallbackURL: string;
};

export default function GoogleSignInButton({ fallbackCallbackURL }: GoogleSignInButtonProps) {
    const [error, setError] = useState('');
    const params = useSearchParams();
    const callbackURL = params.get('next') || fallbackCallbackURL;

    const onSignIn = async () => {
        const { error: signInError } = await authClient.signIn.social({
            provider: 'google',
            callbackURL,
        });

        if (signInError) {
            setError(signInError.message || 'Unable to sign in right now.');
            return;
        }
    };

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={onSignIn}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
            >
                Sign in with Google
            </button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
    );
}

