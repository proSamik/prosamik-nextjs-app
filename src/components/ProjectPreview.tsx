import React from 'react';
import { useRouter } from 'next/router';
import { useProjectsList } from '@/hooks/useProjectsList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import { Eye } from 'lucide-react';
import { FaGithub } from "react-icons/fa";

interface ProjectPreviewProps {
    isMobile: boolean;
}

interface Repo {
    title: string;
    description?: string;
    tags?: string;
    views_count?: number;
    repoPath?: string;
}

const ProjectPreview: React.FC<ProjectPreviewProps> = ({ isMobile }) => {
    const router = useRouter();
    const { data, error, loading } = useProjectsList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return null;

    const previewProjects = data.repos.slice(0, isMobile ? 3 : 4);

    const ProjectItem: React.FC<{ repo: Repo }> = ({ repo }) => {
        const tagList = repo.tags ? repo.tags.split(',').map((tag) => tag.trim()) : [];

        const getGitHubUrl = (fullPath: string) => {
            const match = fullPath.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+/);
            return match ? match[0] : fullPath;
        };

        return (
            <div className="px-4">
                <div className="relative">
                    <div
                        onClick={() => router.push(`/project/${encodeURIComponent(repo.title)}`)}
                        className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md dark:hover:shadow-lg
                        transition-all duration-200 hover:scale-110 cursor-pointer"
                    >
                        {repo.repoPath && (
                            <a
                                href={getGitHubUrl(repo.repoPath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 z-10"
                            >
                                <FaGithub size={28} />
                            </a>
                        )}
                        <h2 className="text-xl font-semibold mb-2 dark:text-white">{repo.title}</h2>
                        {repo.description && (
                            <p className="text-gray-600 dark:text-gray-300 mb-3">{repo.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                            {tagList.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tagList.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {repo.views_count !== undefined && (
                                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                    <Eye size={20} />
                                    <span>{repo.views_count}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`space-y-4 ${isMobile ? 'w-full px-2 pb-4' : 'w-2/3 px-2'}`}>
            <div
                className={`${isMobile ? 'px-3 py-6' : 'p-2 py-4 px-5'} w-full rounded-lg border-2 border-gray-200 dark:border-gray-700`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold dark:text-white">Featured Projects</h2>
                    <button
                        onClick={() => router.push('/projects')}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                        rounded-full text-nowrap text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Show More →
                    </button>
                </div>

                <div className="grid gap-6">
                    {previewProjects.map((repo, index) => (
                        <ProjectItem key={index} repo={repo} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProjectPreview;