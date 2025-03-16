import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { FaGithub } from "react-icons/fa";
import Link from 'next/link';

export interface ItemCardProps {
    title: string;
    link: string;
    description?: string;
    tags?: string;
    views_count?: number;
    repoPath?: string;
    type?: string;
    isMobile?: boolean;
    readTime?: number;
}

export const StyledItemCard: React.FC<ItemCardProps> = ({
    title,
    link,
    description = '',
    tags = '',
    views_count = 0,
    repoPath = '',
    readTime,
}) => {
    // Parse tags - convert comma-separated string to array
    const tagList = tags ? tags.split(',').map(tag => tag.trim()) : [];

    // GitHub URL formatting
    const getGitHubUrl = (fullPath: string): string => {
        const match = fullPath.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+/);
        return match ? match[0] : fullPath;
    };

    // Handle GitHub button click
    const handleGitHubClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(getGitHubUrl(repoPath), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="mt-3" style={{ width: '100%', maxWidth: '360px' }}>
            <Link 
                href={link}
                                className="group relative flex flex-col p-6 bg-white dark:bg-gray-900 dark:shadow-amber-200 dark:shadow-sm shadow-lg rounded-lg hover:shadow-xl transition-all duration-200"
                style={{ height: '380px', display: 'flex', flexDirection: 'column' }}
            >
                
                {/* Title and Arrow Section */}
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors pr-8">
                        {title}
                    </h3>
                    <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform flex-shrink-0" />
                </div>
                
                {/* Description Section */}
                {description && (
                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm flex-grow pr-2">
                        {description.length > 200 ? `${description.slice(0, 200)}...` : description}
                    </p>
                )}
                
                {/* Tags Section - Moved to bottom for better spacing */}
                {tagList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {tagList.map((tag) => (
                            <span 
                                key={tag}
                                className="px-3 py-1 text-sm rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
                
                {/* Footer Section - Read time and views */}
                <div className="flex items-center justify-between mt-auto text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-3">
                        {readTime && (
                            <span className="flex items-center">
                                <span className="mr-1">📚</span>
                                {readTime} min read
                            </span>
                        )}
                        {views_count > 0 && (
                            <span className="flex items-center gap-1 ml-auto">
                                 <span className="flex items-center gap-1">
                                     {views_count} {views_count === 1 ? 'view' : 'views'}
                                 </span>
                            </span>
                        )}
                    </div>
                    
                    {/* GitHub Link */}
                    {repoPath && (
                        <button
                            onClick={handleGitHubClick}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-300"
                            aria-label="View on GitHub"
                        >
                            <FaGithub size={18}/>
                        </button>
                    )}
                </div>
                
                {/* Animated bottom bar - appears on hover */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </Link>
        </div>
    );
};

export default StyledItemCard;