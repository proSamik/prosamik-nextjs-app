import { useState } from 'react';

const useShareContent = () => {
    const [shareContent, setShareContent] = useState({
        text: '', // Store the shareable text content
        url: '',  // Store the URL to share
    });

    // Function to update share content
    const updateShareContent = (text: string, url: string) => {
        setShareContent({ text, url });
    };

    return {
        shareContent,
        setShareContent: updateShareContent, // This is the function you'll call to update content
    };
};

export default useShareContent;
