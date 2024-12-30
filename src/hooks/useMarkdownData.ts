import { useState, useEffect } from 'react';
import { BackendResponse } from '@/types/article';
import { config } from '@/config';

interface UseMarkdownDataParams {
    repoPath: string | null;
}

const CACHE_EXPIRY = 48 * 60 * 60 * 1000;

function generateTransientKey(data: BackendResponse): string {
    return `${data.metadata.author}|${data.metadata.repository}|${data.metadata.lastUpdated}`;
}

export const useMarkdownData = ({ repoPath }: UseMarkdownDataParams) => {
    const [data, setData] = useState<BackendResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!repoPath) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        setLoading(true);
        // Show cached data immediately
        const cached = localStorage.getItem(`md_${repoPath}`);
        if (cached) {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
                setData(JSON.parse(cacheData.content));
                if (isMounted) setLoading(false);
            }
        }


        // Fetch in background
        const fetchData = async () => {
            try {
                const url = new URL(`${config.baseUrl}${config.apiEndpoints.md}`);
                url.searchParams.append('url', repoPath);
                const response = await fetch(url.toString());

                if (!response.ok) {
                    setError(`Failed to fetch data: HTTP ${response.status}`);
                    setData(null);
                    return;
                }

                const responseData: BackendResponse = await response.json();
                const currentKey = generateTransientKey(responseData);

                if (isMounted) {
                    const cached = localStorage.getItem(`md_${repoPath}`);
                    if (!cached || JSON.parse(cached).transientKey !== currentKey) {
                        localStorage.setItem(`md_${repoPath}`, JSON.stringify({
                            content: JSON.stringify(responseData),
                            transientKey: currentKey,
                            timestamp: Date.now()
                        }));
                        setData(responseData);
                    }
                    setError(null);
                }
            } catch (err) {
                if (isMounted) setError(err instanceof Error ? err.message : 'Fetch error');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void fetchData();
        return () => { isMounted = false; };
    }, [repoPath]);

    return { data, error, loading };
}
