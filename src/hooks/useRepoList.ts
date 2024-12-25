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
                const response = await fetch(`${config.baseUrl}${config.apiEndpoints.reposList}`);
                if (!response.ok) {
                    setError('Repos not found');
                    return;
                }

                const repoData: RepoListResponse = await response.json();
                if (repoData.repos.length === 0) {
                    setError('Repos not found');
                    setData(null);
                    return;
                }

                setData(repoData);
                setError(null); // Reset error if data is successfully fetched
            } catch {
                setError('Repos not found'); // Handle the error case here
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
