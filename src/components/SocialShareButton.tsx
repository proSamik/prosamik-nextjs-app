import React, { useState } from 'react';
import { FaInstagram, FaTwitter, FaLinkedinIn, FaShareAlt } from 'react-icons/fa';

interface SocialShareButtonsProps {
    shareUrl: string;
    shareTitle: string;
    screenshotUrl: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
                                                                   shareUrl,
                                                                   shareTitle,
                                                                   screenshotUrl
                                                               }) => {
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

    const openInstagramStories = () => {
        const instagramUrl = `https://www.instagram.com/create/story/?media=${encodeURIComponent(
            screenshotUrl
        )}`;
        window.open(instagramUrl, '_blank');
    };

    return (
        <>
            <div className="flex space-x-2">
                {/* Custom Twitter Share Button */}
                <button
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share to Twitter"
                >
                    <FaTwitter size={32} />
                </button>

                {/* Custom LinkedIn Share Button */}
                <button
                    onClick={() => window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&summary=${encodeURIComponent(shareTitle)}`, '_blank')}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share to LinkedIn"
                >
                    <FaLinkedinIn size={32} />
                </button>

                {/* Custom Instagram Share Button */}
                <button
                    onClick={openInstagramStories}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share to Instagram Stories"
                >
                    <FaInstagram size={32}  />
                </button>

                {/* Share Link Button */}
                <button
                    onClick={() => setShowModal(true)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share link"
                >
                    <FaShareAlt size={20}/>
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
