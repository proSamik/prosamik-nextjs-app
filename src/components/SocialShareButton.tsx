import React from 'react';
import { 
    TwitterShareButton,
    LinkedinShareButton,
    FacebookShareButton 
} from 'react-share';
import { 
    Share2 as ShareIcon,
    Linkedin,
    Twitter as TwitterIcon,
    Facebook as FacebookIcon 
} from 'react-feather';

interface SocialShareButtonsProps {
    url: string;
    title: string;
}

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ url, title }) => {
    return (
        <div className="flex gap-4 mt-8 items-center">
            <span className="text-gray-600 flex items-center">
                <ShareIcon className="mr-2" size={20} />
                Share
            </span>
            <TwitterShareButton
                url={url}
                title={title}
                hashtags={['article']}
            >
                <button className="p-2 rounded-full bg-blue-400 hover:bg-blue-500 text-white">
                    <TwitterIcon size={20} />
                </button>
            </TwitterShareButton>
            <LinkedinShareButton
                url={url}
                title={title}
            >
                <button className="p-2 rounded-full bg-blue-700 hover:bg-blue-800 text-white">
                    <Linkedin size={20} />
                </button>
            </LinkedinShareButton>
            <FacebookShareButton
                url={url}
                hashtag={`#${title.replace(/\s+/g, '')}`}
            >
                <button className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
                    <FacebookIcon size={20} />
                </button>
            </FacebookShareButton>
        </div>
    );
};
