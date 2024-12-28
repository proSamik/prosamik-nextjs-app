import { useRouter } from 'next/router';
import { useRepoList } from '@/hooks/useRepoList';
import { useRepoHandler } from '@/hooks/useRepoHandler';
import BlogLayout from '@/components/BlogLayout';
import RepoLoader from '@/components/RepoLoader';

export default function BlogPost() {
    const router = useRouter();
    const { slug } = router.query;
    const { data: repoList, error: repoError, loading: repoLoading } = useRepoList();
    const { repoInfo, data, error, loading } = useRepoHandler(slug, repoList?.repos);

    return (
        <RepoLoader loading={repoLoading || loading} error={repoError || error}>
            {data && repoInfo && <BlogLayout data={data} />}
        </RepoLoader>
    );
}
