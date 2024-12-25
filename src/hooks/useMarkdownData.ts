// hooks/useMarkdownData.ts
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
        // If repoPath is null, skip the fetch
        if (!repoPath) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            try {
                const url = new URL(`${config.baseUrl}${config.apiEndpoints.readme}`);
                url.searchParams.append('url', repoPath);  // Send the full repoPath to the backend

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
    }, [repoPath]);

    return { data, error, loading };
};
