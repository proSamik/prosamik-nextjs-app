import React from 'react';
import { useRouter } from 'next/router';
import { useRepoList } from '@/hooks/useRepoList';
import BlogList from '@/components/BlogList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

interface BlogPreviewProps {
    isMobile: boolean;
}

const BlogPreview: React.FC<BlogPreviewProps> = ({ isMobile }) => {
    const router = useRouter();
    const { data, error, loading } = useRepoList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    // Take first 3 blogs for mobile, 7 for desktop
    const previewBlogs = data.repos.slice(0, isMobile ? 3 : 4);

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full' : 'w-1/2 px-2'}`}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Latest Blogs</h2>
                <button
                    onClick={() => router.push('/blogs')}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                    Show More →
                </button>
            </div>
            <BlogList repos={previewBlogs} />
        </div>
    );
};

export default BlogPreview;