import { useState, useEffect } from 'react';
import { RepoListResponse } from '@/types/article';
import { config } from '@/config';

interface FetchResult<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

const CACHE_EXPIRY = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

// Generate a unique key based on projects data to detect changes
function generateTransientKey(data: RepoListResponse): string {
    return data.repos
        .map(project => `${project.title}|${project.repoPath}|${project.views_count}`)
        .join('_');
}

export const useProjectsList = (): FetchResult<RepoListResponse> => {
    const [data, setData] = useState<RepoListResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Show cached data immediately if available
        const cached = localStorage.getItem('projects_list');
        if (cached) {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < CACHE_EXPIRY) {
                setData(JSON.parse(cacheData.content));
                if (isMounted) setLoading(false);
            }
        }

        const fetchProjects = async () => {
            try {
                const response = await fetch(`${config.baseUrl}${config.apiEndpoints.projectsList}`);
                if (!response.ok) {
                    setError('Projects not found');
                    return;
                }

                const projectData: RepoListResponse = await response.json();
                if (projectData.repos.length === 0) {
                    const emptyData = {
                        repos: [{
                            title: 'No Projects Found',
                            repoPath: '/',
                            description: 'Start creating your first project!',
                            tags: '',
                            views_count: 0,
                            id: 0,
                            type: 'empty'
                        }]
                    };

                    if (isMounted) {
                        setData(emptyData);
                        // Cache empty state as well
                        localStorage.setItem('projects_list', JSON.stringify({
                            content: JSON.stringify(emptyData),
                            transientKey: generateTransientKey(emptyData),
                            timestamp: Date.now()
                        }));
                    }
                    return;
                }

                const currentKey = generateTransientKey(projectData);

                if (isMounted) {
                    const cached = localStorage.getItem('projects_list');
                    if (!cached || JSON.parse(cached).transientKey !== currentKey) {
                        localStorage.setItem('projects_list', JSON.stringify({
                            content: JSON.stringify(projectData),
                            transientKey: currentKey,
                            timestamp: Date.now()
                        }));
                        setData(projectData);
                    }
                    setError(null);
                }
            } catch{
                if (isMounted) {
                    setError('Projects not found');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProjects().catch(() => {
            if (isMounted) {
                setError('Projects not found');
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, []);

    return { data, error, loading };
};