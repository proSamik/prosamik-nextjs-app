import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';
import { config } from '@/config';

interface FetchResult<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

export const useRepoList = (): FetchResult<RepoListResponse> => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const response = await fetch(`${config.baseUrl}${config.apiEndpoints.blogsList}`);
                if (!response.ok) {
                    setError('Repos not found');
                    return;
                }

                const repoData: RepoListResponse = await response.json();
                if (repoData.repos.length === 0) {
                    // Instead of setting error, create a "No Blogs Found" item
                    setData({
                        repos: [{
                            title: 'No Blogs Found',
                            repoPath: '/',
                            description: 'Start creating your first blog!',
                            tags: '',
                            views_count: 0,
                            id: 0,
                            type: 'empty'
                        }]
                    });
                    return;
                }

                setData(repoData);
                setError(null);
            } catch {
                setError('Repos not found');
            } finally {
                setLoading(false);
            }
        };

        fetchRepos().catch(() => {
            setError('Repos not found');
            setLoading(false);
        });
    }, []);

    return { data, error, loading };
};