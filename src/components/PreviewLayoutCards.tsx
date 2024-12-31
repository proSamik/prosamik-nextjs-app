import { ItemCard } from "@/components/shared/ItemCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { useRouter } from "next/router";
import {RepoListItem} from "@/types/article";

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
        buttonStyle: 'bg-blue-500 text-white hover:bg-blue-600',
        emptyText: 'No Blogs Found'
    },
    project: {
        title: 'Featured Projects',
        basePath: '/project',
        showMorePath: '/projects',
        buttonStyle: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
        emptyText: 'No Projects Found'
    }
};

export default function PreviewLayoutCards({
                                               isMobile,
                                               type,
                                               data,
                                               loading,
                                               error
                                           }: PreviewLayoutCardsProps) {
    const router = useRouter();
    const config = CONFIGS[type];

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    // Check if we have the empty state placeholder
    const isEmptyState = data.repos.length === 1 && data.repos[0].title === config.emptyText;

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full px-2 pb-4' : 'w-2/3 px-2'}`}>
            <div
                className={`${isMobile ? 'px-3 py-6' : 'p-2 py-4 px-5'} w-full rounded-lg border-2 border-gray-200 dark:border-gray-700`}
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

                {isEmptyState ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {config.emptyText} :)
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {data.repos.slice(0, isMobile ? 3 : 4).map((repo, index) => (
                            <div key={index} className="px-3">
                                <ItemCard
                                    title={repo.title}
                                    link={`${config.basePath}/${encodeURIComponent(repo.title)}`}
                                    description={repo.description}
                                    tags={repo.tags}
                                    views_count={repo.views_count}
                                    repoPath={type === 'project' ? repo.repoPath : ''}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}