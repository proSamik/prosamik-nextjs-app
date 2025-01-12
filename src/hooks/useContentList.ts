import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';
import { config } from '@/config';

interface FetchResult<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

interface UseContentListProps {
    type: 'blog' | 'project';
}

const CACHE_EXPIRY = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

// Generate a unique key based on content data to detect changes
function generateTransientKey(data: RepoListResponse): string {
    return data.repos
        .map(item => `${item.title}|${item.repoPath}|${item.views_count}`)
        .join('_');
}

export const useContentList = ({ type }: UseContentListProps): FetchResult<RepoListResponse> => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Determine storage key and API endpoint based on type
    const storageKey = `${type}s_list`;
    const apiEndpoint = type === 'blog' ? config.apiEndpoints.blogsList : config.apiEndpoints.projectsList;
    const notFoundMessage = `${type.charAt(0).toUpperCase() + type.slice(1)}s not found`;
    const emptyMessage = `No ${type.charAt(0).toUpperCase() + type.slice(1)}s Found`;
    const startMessage = `Create the first ${type}!`;

    useEffect(() => {
        let isMounted = true;

        // Show cached data immediately if available
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
                setData(JSON.parse(cacheData.content));
                if (isMounted) setLoading(false);
            } else {
                // Delete expired cache
                localStorage.removeItem(storageKey);
                setData(null);
            }
        }

        const fetchContent = async () => {
            try {
                const response = await fetch(`${config.baseUrl}${apiEndpoint}`);
                if (!response.ok) {
                    setError(notFoundMessage);
                    return;
                }

                const contentData: RepoListResponse = await response.json();
                if (contentData.repos.length === 0) {
                    const emptyData = {
                        repos: [{
                            title: emptyMessage,
                            repoPath: '/',
                            description: startMessage,
                            tags: '',
                            views_count: 0,
                            id: 0,
                            type: 'empty'
                        }]
                    };

                    if (isMounted) {
                        setData(emptyData);
                        localStorage.setItem(storageKey, JSON.stringify({
                            content: JSON.stringify(emptyData),
                            transientKey: generateTransientKey(emptyData),
                            timestamp: Date.now()
                        }));
                    }
                    return;
                }

                const currentKey = generateTransientKey(contentData);

                if (isMounted) {
                    const cached = localStorage.getItem(storageKey);
                    if (cached) {
                        const cacheData = JSON.parse(cached);
                        // Check and delete if expired
                        if (Date.now() - cacheData.timestamp >= CACHE_EXPIRY) {
                            localStorage.removeItem(storageKey);
                        }
                    }

                    if (!cached || JSON.parse(cached).transientKey !== currentKey) {
                        localStorage.setItem(storageKey, JSON.stringify({
                            content: JSON.stringify(contentData),
                            transientKey: currentKey,
                            timestamp: Date.now()
                        }));
                        setData(contentData);
                    }
                    setError(null);
                }
            } catch {
                if (isMounted) {
                    setError(notFoundMessage);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchContent().catch(() => {
            if (isMounted) {
                setError(notFoundMessage);
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, [apiEndpoint, notFoundMessage, emptyMessage, startMessage, storageKey]);

    return { data, error, loading };
};