import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { RepoListItem } from '@/types/article';
import { useMarkdownData } from '@/hooks/useMarkdownData';

export function useRepoHandler(slug: string | string[] | undefined, repoList: RepoListItem[] | undefined) {
    const [repoInfo, setRepoInfo] = useState<RepoListItem | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [redirecting, setRedirecting] = useState(false); // Prevent multiple redirections
    const router = useRouter();

    // Find matching repo when data is available
    useEffect(() => {
        if (slug && repoList) {
            const decodedSlug = Array.isArray(slug) ? slug[0] : decodeURIComponent(slug);
            const repo = repoList.find((r) => r.title === decodedSlug);

            if (repo) {
                setRepoInfo(repo);
                setNotFound(false);
            } else {
                setRepoInfo(null);
                setNotFound(true);
            }
        }
    }, [slug, repoList]);

    const repoPath = repoInfo?.repoPath || null;

    // Fetch markdown data
    const { data, error, loading } = useMarkdownData({ repoPath });

    // Redirect to 404 if repo not found
    useEffect(() => {
        if (notFound && !redirecting) {
            setRedirecting(true);
            router
                .push('/404')
                .catch((err) => {
                    console.error('Navigation error:', err);
                })
                .finally(() => setRedirecting(false));
        }
    }, [notFound, redirecting, router]);

    return { repoInfo, data, error, loading, notFound };
}
