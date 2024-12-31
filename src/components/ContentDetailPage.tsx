import { useRouter } from 'next/router';
import { useContentList } from '@/hooks/useContentList';
import { useRepoHandler } from '@/hooks/useRepoHandler';
import BlogLayout from '@/components/article/BlogLayout';
import ProjectLayout from '@/components/article/ProjectLayout';
import RepoLoader from '@/components/article/RepoLoader';

interface ContentDetailPageProps {
    type: 'blog' | 'project';
}

export default function ContentDetailPage({ type }: ContentDetailPageProps) {
    const router = useRouter();
    const { slug } = router.query;
    const { data: repoList, error: repoError, loading: repoLoading } = useContentList({ type });
    const { repoInfo, data, error, loading } = useRepoHandler(slug, repoList?.repos);

    const Layout = type === 'blog' ? BlogLayout : ProjectLayout;

    return (
        <RepoLoader loading={repoLoading || loading} error={repoError || error}>
            {data && repoInfo && <Layout data={data} />}
        </RepoLoader>
    );
}