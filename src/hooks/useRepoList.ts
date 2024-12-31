import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';
import { config } from '@/config';

interface FetchResult<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

const CACHE_EXPIRY = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

// Generate a unique key based on repos data to detect changes
function generateTransientKey(data: RepoListResponse): string {
    return data.repos
        .map(repo => `${repo.title}|${repo.repoPath}|${repo.views_count}`)
        .join('_');
}

export const useRepoList = (): FetchResult<RepoListResponse> => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Show cached data immediately if available
        const cached = localStorage.getItem('repo_list');
        if (cached) {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
                setData(JSON.parse(cacheData.content));
                if (isMounted) setLoading(false);
            }
        }

        const fetchRepos = async () => {
            try {
                const response = await fetch(`${config.baseUrl}${config.apiEndpoints.blogsList}`);
                if (!response.ok) {
                    setError('Repos not found');
                    return;
                }

                const repoData: RepoListResponse = await response.json();
                if (repoData.repos.length === 0) {
                    const emptyData = {
                        repos: [{
                            title: 'No Blogs Found',
                            repoPath: '/',
                            description: 'Start creating your first blog!',
                            tags: '',
                            views_count: 0,
                            id: 0,
                            type: 'empty'
                        }]
                    };

                    if (isMounted) {
                        setData(emptyData);
                        // Cache empty state as well
                        localStorage.setItem('repo_list', JSON.stringify({
                            content: JSON.stringify(emptyData),
                            transientKey: generateTransientKey(emptyData),
                            timestamp: Date.now()
                        }));
                    }
                    return;
                }

                const currentKey = generateTransientKey(repoData);

                if (isMounted) {
                    const cached = localStorage.getItem('repo_list');
                    if (!cached || JSON.parse(cached).transientKey !== currentKey) {
                        localStorage.setItem('repo_list', JSON.stringify({
                            content: JSON.stringify(repoData),
                            transientKey: currentKey,
                            timestamp: Date.now()
                        }));
                        setData(repoData);
                    }
                    setError(null);
                }
            } catch {
                if (isMounted) {
                    setError('Repos not found');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchRepos().catch(() => {
            if (isMounted) {
                setError('Repos not found');
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, []);

    return { data, error, loading };
};