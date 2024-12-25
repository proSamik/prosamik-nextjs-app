import { useState, useEffect } from 'react';
import { BackendResponse } from '@/types/article';
import { config } from '@/config';

interface UseMarkdownDataParams {
    repoPath: string | null;
}

export const useMarkdownData = ({ repoPath }: UseMarkdownDataParams) => {
    const [data, setData] = useState<BackendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip fetch if repoPath is null
        if (!repoPath) {
            setLoading(false);
            return;
        }

        let isMounted = true; // flag to check component mount status

        const fetchData = async () => {
            setLoading(true);
            try {
                const url = new URL(`${config.baseUrl}${config.apiEndpoints.readme}`);
                url.searchParams.append('url', repoPath);  // Send the full repoPath to the backend

                const response = await fetch(url.toString());

                if (!response.ok) {
                    setError(`Failed to fetch data: HTTP ${response.status}`);
                    setData(null);
                    return;
                }

                const responseData: BackendResponse = await response.json();

                if (isMounted) {
                    setData(responseData);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    // Set error message for any issue during fetching or parsing
                    setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
                    setData(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchData().catch(() => {
            // Catching any rejected promise
            if (isMounted) {
                setError('Error while fetching data');
                setLoading(false);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [repoPath]);

    return { data, error, loading };
};
