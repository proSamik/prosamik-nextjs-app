import React, { useState } from "react";
import { FaInstagram, FaTwitter, FaLinkedinIn, FaShareAlt, FaCopy } from "react-icons/fa";

interface SocialShareButtonsProps {
    shareUrl: string;
    shareTitle: string;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
                                                                   shareUrl,
                                                                   shareTitle,
                                                               }) => {
    const [copied, setCopied] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    // Handle copying the share link
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset "Copied!" after 2 seconds
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    // Handle copying the content with the link
    const handleCopyContentWithLink = async () => {
        const contentWithLink = `${shareTitle}\n${shareUrl}`;
        try {
            await navigator.clipboard.writeText(contentWithLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset "Copied!" after 2 seconds
        } catch (err) {
            console.error("Failed to copy content with link:", err);
        }
    };

    // Social Media Share URLs
    const openInstagramShare = () => {
        const instagramUrl = `https://www.instagram.com/share?url=${encodeURIComponent(shareUrl)}`;
        window.open(instagramUrl, "_blank");
    };

    const openTwitterShare = () => {
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            shareUrl
        )}&text=${encodeURIComponent(shareTitle)}`;
        window.open(twitterUrl, "_blank");
    };

    const openLinkedInShare = () => {
        const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
            shareUrl
        )}&title=${encodeURIComponent(shareTitle)}`;
        window.open(linkedInUrl, "_blank");
    };

    // Open the modal
    const handleShareClick = () => {
        setIsModalOpen(true);
    };

    // Close the modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="relative">
            <div className="flex space-x-2">
                {/* Twitter Share Button */}
                <button
                    onClick={openTwitterShare}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share to Twitter"
                >
                    <FaTwitter size={32} />
                </button>

                {/* LinkedIn Share Button */}
                <button
                    onClick={openLinkedInShare}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share to LinkedIn"
                >
                    <FaLinkedinIn size={32} />
                </button>

                {/* Instagram Share Button */}
                <button
                    onClick={openInstagramShare}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share to Instagram"
                >
                    <FaInstagram size={32} />
                </button>

                {/* Share Link Button (opens the modal) */}
                <button
                    onClick={handleShareClick}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Share options"
                >
                    <FaShareAlt size={20} />
                </button>
            </div>

            {/* Modal for Copying Link or Content */}
            {isModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl text-gray-900 dark:text-white">Share Options</h3>
                            <button onClick={handleCloseModal} className="text-gray-500 dark:text-gray-400">
                                X
                            </button>
                        </div>

                        {/* Text Area for Copying Link */}
                        <div className="mb-4">
                            <label htmlFor="link" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Copy Link
                            </label>
                            <div className="flex items-center space-x-2 mt-2">
                <textarea
                    id="link"
                    value={shareUrl}
                    readOnly
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                                <button
                                    onClick={handleCopyLink}
                                    className="p-2 bg-blue-500 text-white rounded-full"
                                    aria-label="Copy link"
                                >
                                    <FaCopy size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Text Area for Copying Content with Link */}
                        <div>
                            <label htmlFor="contentWithLink" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Copy Content with Link
                            </label>
                            <div className="flex items-center space-x-2 mt-2">
                <textarea
                    id="contentWithLink"
                    value={`${shareTitle}\n${shareUrl}`}
                    readOnly
                    rows={5}
                    className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                                <button
                                    onClick={handleCopyContentWithLink}
                                    className="p-2 bg-blue-500 text-white rounded-full"
                                    aria-label="Copy content with link"
                                >
                                    <FaCopy size={18} />
                                </button>
                            </div>
                        </div>

                        {/* "Copied" Message */}
                        {copied && (
                            <div className="mt-2 text-sm text-green-500">
                                Copied to clipboard!
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocialShareButtons;
