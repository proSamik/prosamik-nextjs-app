import React from 'react';
import {
    FacebookShareButton,
    LinkedinShareButton,
    TwitterShareButton
} from 'react-share';
import {
    Facebook as FacebookIcon,
    Linkedin,
    Share2 as ShareIcon,
    Twitter as TwitterIcon
} from 'react-feather';

interface SocialShareButtonsProps {
    shareUrl: string;
    shareTitle: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
                                                                   shareUrl,
                                                                   shareTitle
                                                               }) => {
    return (
        <div className="flex gap-4 mt-8 items-center">
            <span className="text-gray-600 flex items-center">
                <ShareIcon className="mr-2" size={20} />
                Share
            </span>
            <TwitterShareButton
                url={shareUrl}
                title={shareTitle}
                hashtags={['article']}
            >
                <button className="p-2 rounded-full bg-blue-400 hover:bg-blue-500 text-white">
                    <TwitterIcon size={20} />
                </button>
            </TwitterShareButton>
            <LinkedinShareButton
                url={shareUrl}
                title={shareTitle}
            >
                <button className="p-2 rounded-full bg-blue-700 hover:bg-blue-800 text-white">
                    <Linkedin size={20} />
                </button>
            </LinkedinShareButton>
            <FacebookShareButton
                url={shareUrl}
                hashtag={`#${shareTitle.replace(/\s+/g, '')}`}
            >
                <button className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
                    <FacebookIcon size={20} />
                </button>
            </FacebookShareButton>
        </div>
    );
};

export default SocialShareButtons;