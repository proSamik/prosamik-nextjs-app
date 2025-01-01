import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { FaGithub } from "react-icons/fa";

export interface ItemCardProps {
    title: string;
    link: string;
    description?: string;
    tags?: string;
    views_count?: number;
    repoPath?: string;
}

export const ItemCard: React.FC<ItemCardProps> = ({
                                                      title,
                                                      link,
                                                      description,
                                                      tags = '',
                                                      views_count = 0,
                                                      repoPath = '',
                                                  }) => {
    const tagList = tags ? tags.split(',').map(tag => tag.trim()) : [];

    const getGitHubUrl = (fullPath: string) => {
        const match = fullPath.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+/);
        return match ? match[0] : fullPath;
    };

    const handleGitHubClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(getGitHubUrl(repoPath), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="mt-3">
            <Link
                href={link}
                className="block p-6 rounded-xl shadow-lg hover:shadow-xl
                    transition-all duration-200 hover:-translate-y-1 cursor-pointer mx-1
                    backdrop-blur-md
                    bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300
                    dark:from-gray-800/75 dark:via-gray-800/85 dark:to-gray-900/90
                    border-2 border-slate-300 dark:border-white/10"
            >
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold mb-2 dark:text-white flex-1">{title}</h2>
                    {repoPath && (
                        <button
                            onClick={handleGitHubClick}
                            className="ml-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-2"
                            aria-label="View on GitHub"
                        >
                            <FaGithub size={32} />
                        </button>
                    )}
                </div>
                {description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-3">{description}</p>
                )}
                <div className="flex justify-between items-center">
                    {tagList.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {tagList.map((tag) => (
                                <span
                                    key={tag}
                                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                        repoPath
                                            ? "border border-gray-500 dark:text-white text-gray-500 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-400/70"
                                            : "bg-blue-500 text-white hover:bg-blue-600"
                                    }`}
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                    {views_count > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                            <Eye size={20}/>
                            <span>{views_count}</span>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
};