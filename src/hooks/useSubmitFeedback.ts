import { useState } from 'react';
import { config } from '@/config';

interface FeedbackResponse {
    success: boolean;
    message: string;
}

interface SubmitFeedbackParams {
    name: string;
    email: string;
    message: string;
}

export const useSubmitFeedback = () => {
    const [response, setResponse] = useState<FeedbackResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submitFeedback = async ({ name, email, message }: SubmitFeedbackParams) => {
        setLoading(true);
        setError(null);

        try {
            const url = new URL(`${config.baseUrl}${config.apiEndpoints.feedback}`);

            const res = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, message }),
            });

            if (!res.ok) {
                throw new Error(`Failed to send feedback: HTTP ${res.status}`);
            }

            const resData: FeedbackResponse = await res.json();
            setResponse(resData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setResponse(null);
        } finally {
            setLoading(false);
        }
    };

    return { response, error, loading, submitFeedback };
};
