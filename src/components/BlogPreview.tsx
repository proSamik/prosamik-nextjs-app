import React from 'react';
import { useRouter } from 'next/router';
import { useRepoList } from '@/hooks/useRepoList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Eye } from 'lucide-react';

interface BlogPreviewProps {
    isMobile: boolean;
}

const BlogPreview: React.FC<BlogPreviewProps> = ({ isMobile }) => {
    const router = useRouter();
    const { data, error, loading } = useRepoList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    const previewBlogs = data.repos.slice(0, isMobile ? 3 : 4);

    // Custom wrapper for blog items
    const BlogItem = ({ repo }) => {
        const tagList = repo.tags ? repo.tags.split(',').map(tag => tag.trim()) : [];

        return (
            <div className="px-4"> {/* Added padding container for scale effect */}
                <div
                    onClick={() => router.push(`/blog/${encodeURIComponent(repo.title)}`)}
                    className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md dark:hover:shadow-lg
                        transition-all duration-200 hover:scale-110 cursor-pointer"
                >
                    <h2 className="text-xl font-semibold mb-2 dark:text-white">{repo.title}</h2>
                    {repo.description && (
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                            {repo.description}
                        </p>
                    )}
                    <div className="flex justify-between items-center">
                        {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tagList.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-full"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        {repo.views_count > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Eye size={20} />
                                <span>{repo.views_count}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className={`space-y-4 ${isMobile ? 'w-full px-2 pb-4' : 'w-2/3 px-2'}`}> {/* Increased width from w-1/2 to w-2/3 */}
            <div
                className={`${isMobile ? 'px-3 py-6' : 'p-2 py-4 px-5'} w-full  rounded-lg border-2 border-gray-200 dark:border-gray-700 `}> {/* Increased padding from p-4 to p-6 */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">Latest Blogs</h2>
                    <button
                        onClick={() => router.push('/blogs')}
                        className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm
                            hover:bg-blue-600 transition-colors text-nowrap"
                    >
                        Show More →
                    </button>
                </div>

                <div className="grid gap-6">
                    {previewBlogs.map((repo, index) => (
                        <BlogItem key={index} repo={repo}/>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogPreview;