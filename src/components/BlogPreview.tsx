import { ItemCard } from "@/components/shared/ItemCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { useRepoList } from "@/hooks/useRepoList";
import { useRouter } from "next/router";

interface BlogPreviewProps {
    isMobile: boolean;
}

export default function BlogPreview({ isMobile }: BlogPreviewProps) {
    const router = useRouter();
    const { data, error, loading } = useRepoList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    // Check if we have the "No Blogs Found" placeholder
    const isEmptyState = data.repos.length === 1 && data.repos[0].title === 'No Blogs Found';

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full px-2 pb-4' : 'w-2/3 px-2'}`}>
            <div
                className={`${isMobile ? 'px-3 py-6' : 'p-2 py-4 px-5'} w-full rounded-lg border-2 border-gray-200 dark:border-gray-700`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">Latest Blogs</h2>
                    {!isEmptyState && (
                        <button
                            onClick={() => router.push('/blogs')}
                            className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm
                            hover:bg-blue-600 transition-colors text-nowrap"
                        >
                            Show More →
                        </button>
                    )}
                </div>

                {isEmptyState ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No blogs found :)
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {data.repos.slice(0, isMobile ? 3 : 4).map((repo, index) => (
                            <div key={index} className="px-3">
                                <ItemCard
                                    title={repo.title}
                                    link={`/blog/${encodeURIComponent(repo.title)}`}
                                    description={repo.description}
                                    tags={repo.tags}
                                    views_count={repo.views_count}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}