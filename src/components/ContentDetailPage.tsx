// pages/ContentDetailPage.tsx
import { useRouter } from 'next/router';
import { useContentList } from '@/hooks/useContentList';
import { useRepoHandler } from '@/hooks/useRepoHandler';
import RepoLoader from '@/components/article/RepoLoader';
import { ArticleLayoutType } from "@/types/article";
import ArticleLayout from "@/components/article/ArticleLayout";

interface ContentDetailPageProps {
    type: ArticleLayoutType;
}

export default function ContentDetailPage({ type }: ContentDetailPageProps) {
    const router = useRouter();
    const { slug } = router.query;
    const { data: repoList, error: repoError, loading: repoLoading } = useContentList({ type });
    const { repoInfo, data, error, loading } = useRepoHandler(slug, repoList?.repos);

    return (
        <RepoLoader loading={repoLoading || loading} error={repoError || error}>
            {data && repoInfo && (
                <ArticleLayout
                    data={data}
                    layoutType={type}
                />
            )}
        </RepoLoader>
    );
}