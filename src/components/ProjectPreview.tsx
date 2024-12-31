import {ItemCard} from "@/components/shared/ItemCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import {useProjectsList} from "@/hooks/useProjectsList";
import {useRouter} from "next/router";

// Define the interface
interface ProjectPreviewProps {
    isMobile: boolean;
}

// Add export statement
export default function ProjectPreview({ isMobile }: ProjectPreviewProps) {
    const router = useRouter();
    const { data, error, loading } = useProjectsList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    // Check if we have the "No Projects Found" placeholder
    const isEmptyState = data.repos.length === 1 && data.repos[0].title === 'No Projects Found';

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full px-2 pb-4' : 'w-2/3 px-2'}`}>
            <div
                className={`${isMobile ? 'px-3 py-6' : 'p-2 py-4 px-5'} w-full rounded-lg border-2 border-gray-200 dark:border-gray-700`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">Featured Projects</h2>
                    {!isEmptyState && (
                        <button
                            onClick={() => router.push('/projects')}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                            rounded-full text-nowrap text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Show More →
                        </button>
                    )}
                </div>

                {isEmptyState ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No projects found :)
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {data.repos.slice(0, isMobile ? 3 : 4).map((repo, index) => (
                            <div key={index} className="px-3">
                                <ItemCard
                                    title={repo.title}
                                    link={`/project/${encodeURIComponent(repo.title)}`}
                                    description={repo.description}
                                    tags={repo.tags}
                                    views_count={repo.views_count}
                                    repoPath={repo.repoPath}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}