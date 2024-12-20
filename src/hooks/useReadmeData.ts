import { useState, useEffect } from 'react';
import { BackendResponse } from '@/types/article';

export const useReadmeData = (owner: string, repo: string, skip = false) => {
    const [data, setData] = useState<BackendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(!skip);

    useEffect(() => {
        if (skip) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            try {
                const response = await fetch(
                    `http://localhost:10000/readme?owner=${owner}&repo=${repo}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const responseData: BackendResponse = await response.json();

                if (isMounted) {
                    setData(responseData);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'An error occurred');
                    setData(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [owner, repo, skip]);

    return { data, error, loading };
};