import React from 'react';
import { useRouter } from 'next/router';
import { useProjectsList } from '@/hooks/useProjectsList';
import BlogList from '@/components/BlogList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

interface ProjectPreviewProps {
    isMobile: boolean;
}

const ProjectPreview: React.FC<ProjectPreviewProps> = ({ isMobile }) => {
    const router = useRouter();
    const { data, error, loading } = useProjectsList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    const previewProjects = data.repos.slice(0, isMobile ? 3 : 4);

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full' : 'w-1/2 px-2'}`}>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Featured Projects</h2>
                <button
                    onClick={() => router.push('/projects')}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                    Show More →
                </button>
            </div>
            <BlogList repos={previewProjects} />
        </div>
    );
};

export default ProjectPreview;