// hooks/useSubscribeNewsletter.ts
import { useState } from 'react';
import { config } from '@/config';

interface SubscriptionResponse {
    success: boolean;
    message: string;
}

interface SubscribeParams {
    email: string;
}

export const useSubscribeNewsletter = () => {
    const [response, setResponse] = useState<SubscriptionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const subscribe = async ({ email }: SubscribeParams) => {
        setLoading(true);
        setError(null);

        try {
            const url = new URL(`${config.baseUrl}${config.apiEndpoints.newsletter}`);

            const res = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                throw new Error(`Failed to subscribe: HTTP ${res.status}`);
            }

            const resData: SubscriptionResponse = await res.json();
            setResponse(resData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setResponse(null);
        } finally {
            setLoading(false);
        }
    };

    return { response, error, loading, subscribe };
};
