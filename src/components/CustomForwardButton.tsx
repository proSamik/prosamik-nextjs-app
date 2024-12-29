import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CustomButtonProps {
    onClick?: () => void;
}

const CustomForwardButton: React.FC<CustomButtonProps> = ({ onClick }) => {
    const [canGoForward, setCanGoForward] = useState(false);

    useEffect(() => {
        const checkNavigationState = () => {
            // `window.history` does not have a direct `canGoForward` API,
            // but we can check the length of the history stack.
            const hasForwardHistory = window.history.length > 2; // Adjust if needed
            setCanGoForward(hasForwardHistory);
        };

        // Initial check
        checkNavigationState();

        // Update the state on popstate events (browser navigation)
        window.addEventListener('popstate', checkNavigationState);

        return () => {
            window.removeEventListener('popstate', checkNavigationState);
        };
    }, []);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onClick) {
            onClick();
        } else {
            // Use `window.history.forward()` to navigate forward
            window.history.forward();
        }
    };

    if (!canGoForward) return null;

    return (
        <button
            onClick={handleClick}
            className="flex items-center mr-2 pr-2 py-2 rounded-md
        text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
        >
            <span>Forward</span>
            <ChevronRight className="w-7 h-7" />
        </button>
    );
};

export default CustomForwardButton;
