import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';
import { config } from '@/config';

export const useRepoList = () => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const response = await fetch(`${config.baseUrl}${config.apiEndpoints.reposList}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch repos');
                }

                const repoData: RepoListResponse = await response.json();
                setData(repoData);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRepos();
    }, []);

    return { data, error, loading };
};
