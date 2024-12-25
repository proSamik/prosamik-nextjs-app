import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { RepoListItem } from '@/types/article';
import {getErrorMessage } from '@/utils/typeGuards';
import ArticleLayout from '@/components/ArticleLayout';
import { useMarkdownData } from '@/hooks/useMarkdownData';  // Use new hook
import { useRepoList } from '@/hooks/useRepoList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

export default function BlogPost() {
    const router = useRouter();
    const { slug } = router.query;
    const { data: repoList, error: repoError, loading: repoLoading } = useRepoList();
    const [repoInfo, setRepoInfo] = useState<RepoListItem | null>(null);
    const [notFound, setNotFound] = useState(false);

    // Find matching repo when data is available
    useEffect(() => {
        if (slug && repoList?.repos) {
            const decodedSlug = decodeURIComponent(slug as string);
            const repo = repoList.repos.find(r => r.title === decodedSlug);

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
    const { data, error, loading } = useMarkdownData({
        repoPath
    });

    // Redirect to 404 if repo not found
    useEffect(() => {
        if (notFound && !repoLoading) {
            // Await the router.push() to ensure it completes before moving on
            router.push('/404').then(() => {
                // Optionally, add any additional logic here after navigation completes
            }).catch(err => {
                // Handle any errors that may occur during the push
                console.error('Navigation error:', err);
            });
        }
    }, [notFound, repoLoading, router]);


    // Show loading state while fetching data
    if (repoLoading || loading) {
        return <Loading />;
    }

    // Handle errors
    if (repoError || error) {
        const errorMessage = getErrorMessage(repoError || error);
        return <ErrorMessage message={errorMessage} />;
    }

    // Return null if no data yet
    if (!data || !repoInfo) {
        return null;
    }

    // Render the article if we have all required data
    return <ArticleLayout data={data} />;
}
