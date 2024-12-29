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
                    // Instead of setting error, create a "No Projects Found" item
                    setData({
                        repos: [{
                            title: 'No Projects Found',
                            repoPath: '/',
                            description: 'Start creating your first project!',
                            tags: '',
                            views_count: 0
                        }]
                    });
                    return;
                }

                setData(projectData);
                setError(null);
            } catch {
                setError('Projects not found');
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