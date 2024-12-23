// hooks/useReadmeData.ts
import { useState, useEffect } from 'react';
import { BackendResponse } from '@/types/article';
import { config } from '@/config';

interface UseReadmeDataParams {
    owner: string | null;
    repo: string | null;
}

export const useReadmeData = ({ owner, repo }: UseReadmeDataParams) => {
    const [data, setData] = useState<BackendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If owner or repo is null, skip the fetch
        if (!owner || !repo) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            try {
                const url = new URL(`${config.baseUrl}${config.apiEndpoints.readme}`);
                url.searchParams.append('owner', owner);
                url.searchParams.append('repo', repo);

                const response = await fetch(url.toString());

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
    }, [owner, repo]);

    return { data, error, loading };
};