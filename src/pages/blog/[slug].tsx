import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { repoMap } from '@/data/repos';
import { isValidSlug } from '@/utils/typeGuards';
import ArticleLayout from '@/components/ArticleLayout';
import { useReadmeData } from '@/hooks/useReadmeData';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

export default function BlogPost() {
    const router = useRouter();
    const { slug } = router.query;

    const decodedSlug = typeof slug === 'string' ? decodeURIComponent(slug) : null;
    const repoPath = decodedSlug && isValidSlug(decodedSlug) ? repoMap[decodedSlug] : null;
    const [owner, repo] = repoPath?.split('/') ?? [null, null];

    const { data, error, loading } = useReadmeData(
        owner || '',
        repo || '',
        !owner || !repo
    );

    useEffect(() => {
        async function handleInvalidSlug() {
            if (decodedSlug && !repoPath) {
                try {
                    await router.push('/404');
                } catch (error) {
                    console.error('Navigation error:', error);
                }
            }
        }

        handleInvalidSlug();
    }, [decodedSlug, repoPath, router]);

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data) return null;

    return <ArticleLayout data={data} />;
}