import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { RepoListItem } from '@/types/article';
import { useMarkdownData } from '@/hooks/useMarkdownData';
import {useTrackViews} from "@/hooks/useTrackViews";
import {useSlug} from "@/hooks/useSlug";

export function useRepoHandler(slug: string | string[] | undefined, repoList: RepoListItem[] | undefined) {
    const [repoInfo, setRepoInfo] = useState<RepoListItem | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [redirecting, setRedirecting] = useState(false); // Prevent multiple redirections
    const router = useRouter();
    const { matchSlug } = useSlug();

    useEffect(() => {
        if (slug && repoList) {
            const currentSlug = Array.isArray(slug) ? slug[0] : slug;

            const repo = repoList.find((r) => matchSlug(currentSlug, r.title));

            if (repo) {
                setRepoInfo(repo);
                setNotFound(false);
            } else {
                setRepoInfo(null);
                setNotFound(true);
            }
        }
    }, [slug, repoList, matchSlug]);

    const repoPath = repoInfo?.repoPath || null;

    const tags = repoInfo?.tags ?? '';

    const { trackView } = useTrackViews();  // New hook

    // Track view when repoInfo becomes available
    useEffect(() => {
        if (repoInfo?.type && repoInfo?.id) {
            // No need to await or .catch() here since we're handling it in the hook
            void trackView(repoInfo.type, repoInfo.id);
        }
    }, [repoInfo, trackView]);

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

    return { repoInfo, data, error, tags, loading, notFound };
}
