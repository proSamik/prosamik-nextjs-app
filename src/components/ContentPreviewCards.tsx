import { ItemList } from "@/components/shared/ItemList";
import Loading from "@/components/layout/Loading";
import ErrorMessage from "@/components/layout/ErrorMessage";
import { useRouter } from "next/router";
import { RepoListItem } from "@/types/article";
import {useSlug} from "@/hooks/useSlug";

interface PreviewLayoutCardsProps {
    isMobile: boolean;
    type: 'blog' | 'project';
    data: { repos: RepoListItem[] } | null;
    loading: boolean;
    error: string | null;
}

const CONFIGS = {
    blog: {
        title: 'Latest Blogs',
        basePath: '/blog',
        showMorePath: '/blogs',
        buttonStyle: 'bg-blue-500 text-white hover:bg-blue-600'
    },
    project: {
        title: 'Featured Projects',
        basePath: '/project',
        showMorePath: '/projects',
        buttonStyle: 'border border-gray-500 dark:text-white text-gray-500 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-400/70'
    }
};

export default function ContentPreviewCards({
                                                isMobile,
                                                type,
                                                data,
                                                loading,
                                                error
                                            }: PreviewLayoutCardsProps) {
    const router = useRouter();
    const config = CONFIGS[type];
    const { createSlug } = useSlug();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    // Transform the repos data to match ItemList's expected format
    const items = data.repos.slice(0, isMobile ? 3 : 4).map(repo => ({
        title: repo.title,
        link: `${config.basePath}/${createSlug(repo.title)}`,
        description: repo.description,
        tags: repo.tags,
        views_count: repo.views_count,
        type: repo.type,
        ...(type === 'project' && { repoPath: repo.repoPath })
    }));

    // Check if we have the empty state based on type property
    const isEmptyState = data.repos.length === 1 && data.repos[0].type === 'empty';

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full px-2 pb-4' : ''}`}>
            <div
                className={`${isMobile ? 'px-3 py-6' : 'p-2 py-4'} w-full rounded-lg`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">{config.title}</h2>
                    {!isEmptyState && (
                        <button
                            onClick={() => router.push(config.showMorePath)}
                            className={`px-4 py-2 ${config.buttonStyle} rounded-full text-nowrap text-sm transition-colors`}
                        >
                            Show More →
                        </button>
                    )}
                </div>

                <div className="grid gap-6">
                    <ItemList
                        items={items}
                        title="preview"  // Empty title since we already show it above
                    />
                </div>
            </div>
        </div>
    );
}