import { useState, useEffect } from 'react';
import { BackendResponse } from '@/types/article';

export const useReadmeData = (owner: string, repo: string) => {
    const [data, setData] = useState<BackendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const response = await fetch(
                    `http://localhost:10000/readme?owner=${owner}&repo=${repo}`,
                    {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                    }
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
                    if (err instanceof TypeError && err.message === 'Failed to fetch') {
                        setError('Cannot connect to server. Please check if the backend server is running on port 8080.');
                    } else {
                        setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
                    }
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
    }, [owner, repo]);

    return { data, error, loading };
};