import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';

export const useRepoList = () => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRepos = async () => {
            try {
                const response = await fetch('http://localhost:10000/repos-list');
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
