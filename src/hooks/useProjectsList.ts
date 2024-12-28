import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';
import { config } from '@/config';

interface FetchResult<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

export const useProjectsList = (): FetchResult<RepoListResponse> => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const response = await fetch(`${config.baseUrl}${config.apiEndpoints.projectsList}`);
                if (!response.ok) {
                    setError('Projects not found');
                    return;
                }

                const projectData: RepoListResponse = await response.json();
                if (projectData.repos.length === 0) {
                    setError('Projects not found');
                    setData(null);
                    return;
                }

                setData(projectData);
                setError(null); // Reset error if data is successfully fetched
            } catch {
                setError('Projects not found'); // Handle the error case here
            } finally {
                setLoading(false);
            }
        };

        fetchProjects().catch(() => {
            setError('Projects not found');
            setLoading(false);
        });
    }, []);

    return { data, error, loading };
};
