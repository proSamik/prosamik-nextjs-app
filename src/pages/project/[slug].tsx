import { useRouter } from 'next/router';
import { useProjectsList } from '@/hooks/useProjectsList';
import { useRepoHandler } from '@/hooks/useRepoHandler';
import ProjectLayout from '@/components/ProjectLayout';
import RepoLoader from '@/components/RepoLoader';

export default function ProjectPost() {
    const router = useRouter();
    const { slug } = router.query;
    const { data: repoList, error: repoError, loading: repoLoading } = useProjectsList();
    const { repoInfo, data, error, loading } = useRepoHandler(slug, repoList?.repos);

    return (
        <RepoLoader loading={repoLoading || loading} error={repoError || error}>
            {data && repoInfo && <ProjectLayout data={data} />}
        </RepoLoader>
    );
}
