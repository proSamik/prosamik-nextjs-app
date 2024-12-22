import React from 'react';
import Image from 'next/image';
import { formatDate } from '@/utils/dateUtils';
import SocialShareButtons from './SocialShareButton';
import { BackendResponse } from '@/types/article';

interface ArticleHeaderProps {
    data: BackendResponse;
    shareUrl: string;
}

const ArticleHeader: React.FC<ArticleHeaderProps> = ({ data, shareUrl }) => {
    return (
        <header className="mb-8">
            <h1 className="text-3xl font-serif mb-4 text-center">
                {data.metadata.title}
            </h1>
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
                <SocialShareButtons 
                    shareUrl={shareUrl} 
                    shareTitle={data.metadata.title} 
                />
            </div>
        </header>
    );
};

export default ArticleHeader;
