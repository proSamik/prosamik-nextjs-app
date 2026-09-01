'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

type PostHogUserIdentityProps = {
    user: {
        id: string;
        email: string;
        name?: string | null;
    };
};

export default function PostHogUserIdentity({ user }: PostHogUserIdentityProps) {
    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
            return;
        }

        posthog.identify(user.id, {
            email: user.email,
            name: user.name,
        });
    }, [user.email, user.id, user.name]);

    return null;
}
