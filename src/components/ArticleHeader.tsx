import React from 'react';
import Image from 'next/image';
import { formatDate } from '@/utils/dateUtils';
import SocialShareButtons from './SocialShareButton';
import ThemeToggle from './ThemeToggle';
import { BackendResponse } from '@/types/article';

interface ArticleHeaderProps {
    data: BackendResponse;
    shareUrl: string;
}

const ArticleHeader: React.FC<ArticleHeaderProps> = ({ data, shareUrl }) => {
    const githubProfileUrl = `https://github.com/${data.metadata.author}`;

    const AuthorInfo = () => (
        <div className="flex items-center space-x-2 text-gray-700">
            <a href={githubProfileUrl} target="_blank" rel="noopener noreferrer">
                <Image
                    src={`https://github.com/${data.metadata.author}.png`}
                    alt={data.metadata.author}
                    width={48}
                    height={48}
                    className="rounded-full"
                    unoptimized
                />
            </a>
            <div>
                <div className="font-medium flex items-center space-x-2">
                    <a
                        href={githubProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="author-card"
                    >
                        {data.metadata.author}
                    </a>
                    <a
                        href={githubProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="follow-link"
                    >
                            Follow
                    </a>
                </div>
                {data.metadata.lastUpdated && (
                    <div className="text-gray-500 text-sm">
                        {formatDate(data.metadata.lastUpdated)}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <header className="mb-8 w-full">
            {/* Mobile layout */}
            <div className="md:hidden flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                    <AuthorInfo />
                    <div className="flex items-center space-x-6 ml-8">
                        <ThemeToggle />
                    </div>
                </div>
                <div className="flex justify-center">
                    <SocialShareButtons
                        shareUrl={shareUrl}
                        shareTitle={data.metadata.title}
                    />
                </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex justify-between items-center">
                <AuthorInfo />
                <div className="flex items-center space-x-6 ml-8">
                    <SocialShareButtons
                        shareUrl={shareUrl}
                        shareTitle={data.metadata.title}
                    />
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
};

export default ArticleHeader;
