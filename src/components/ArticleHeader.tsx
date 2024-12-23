// ArticleHeader.tsx
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
    return (
        <header className="mb-8 w-full">
            {/* Mobile layout */}
            <div className="md:hidden flex flex-col space-y-4">
                {/* Author details and theme toggle in same row */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-gray-700">
                        <Image
                            src={`https://github.com/${data.metadata.author}.png`}
                            alt={data.metadata.author}
                            width={48}
                            height={48}
                            className="rounded-full"
                            unoptimized
                        />
                        <div>
                            <div className="font-medium">{data.metadata.author}</div>
                            {data.metadata.lastUpdated && (
                                <div className="text-gray-500 text-sm">
                                    {formatDate(data.metadata.lastUpdated)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-6 ml-8"> {/* Added ml-8 for spacing */}
                        <ThemeToggle/>
                    </div>
                </div>

                {/* Share buttons in their own row */}
                <div className="flex justify-center">
                    <SocialShareButtons
                        shareUrl={shareUrl}
                        shareTitle={data.metadata.title}
                    />
                </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden md:flex justify-between items-center">
                {/* Author details (like the main item on your desk) */}
                <div className="flex items-center space-x-2 text-gray-700">
                    <Image
                        src={`https://github.com/${data.metadata.author}.png`}
                        alt={data.metadata.author}
                        width={48}
                        height={48}
                        className="rounded-full"
                        unoptimized
                    />
                    <div>
                        <div className="font-medium">{data.metadata.author}</div>
                        {data.metadata.lastUpdated && (
                            <div className="text-gray-500 text-sm">
                                {formatDate(data.metadata.lastUpdated)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add margin to create space between author and controls */}
                <div className="flex items-center space-x-6 ml-8"> {/* Added ml-8 for spacing */}
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