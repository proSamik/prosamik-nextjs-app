// SocialShareButton.tsx
import React, { useState } from 'react';
import {
    TwitterShareButton,
    FacebookShareButton,
    LinkedinShareButton,
    TwitterIcon,
    FacebookIcon,
    LinkedinIcon
} from 'react-share';
import { Share2 } from 'lucide-react';

interface SocialShareButtonsProps {
    shareUrl: string;
    shareTitle: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ shareUrl, shareTitle }) => {
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <>
            <div className="flex space-x-2">
                <TwitterShareButton
                    url={shareUrl}
                    title={shareTitle}
                    className="hover:opacity-80 transition-opacity"
                >
                    <TwitterIcon size={32} round />
                </TwitterShareButton>

                <FacebookShareButton
                    url={shareUrl}
                    title={shareTitle}
                    className="hover:opacity-80 transition-opacity"
                >
                    <FacebookIcon size={32} round />
                </FacebookShareButton>

                <LinkedinShareButton
                    url={shareUrl}
                    title={shareTitle}
                    summary={shareTitle}
                    className="hover:opacity-80 transition-opacity"
                >
                    <LinkedinIcon size={32} round />
                </LinkedinShareButton>

                <button
                    onClick={() => setShowModal(true)}
                    className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800"
                    aria-label="Share link"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Custom Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Share this article</h2>
                            <p className="text-gray-600 dark:text-gray-300">{shareTitle}</p>

                            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SocialShareButtons;