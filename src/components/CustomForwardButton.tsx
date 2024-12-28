import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CustomButtonProps {
    onClick?: () => void;
}

const CustomForwardButton: React.FC<CustomButtonProps> = ({ onClick }) => {
    const [canGoForward, setCanGoForward] = useState(false);

    useEffect(() => {
        let forwardStack: string[] = [];
        let currentPosition = -1;

        const checkNavigationState = () => {
            const browserForward = window.navigation?.canGoForward || false;
            console.log('Browser forward available:', browserForward);
            setCanGoForward(browserForward);
        };

        const beforeNavigate = () => {
            const currentPath = window.location.pathname;

            if (currentPosition < forwardStack.length - 1) {
                forwardStack = forwardStack.slice(0, currentPosition + 1);
            }

            forwardStack.push(currentPath);
            currentPosition = forwardStack.length - 1;

            console.log('Navigation state updated:', {
                stack: forwardStack,
                position: currentPosition,
                canGoForward: currentPosition < forwardStack.length - 1
            });
        };

        const afterNavigate = () => {
            checkNavigationState();
        };

        checkNavigationState();

        window.addEventListener('popstate', checkNavigationState);
        window.addEventListener('navigate', beforeNavigate);
        window.addEventListener('navigatesuccess', afterNavigate);

        return () => {
            window.removeEventListener('popstate', checkNavigationState);
            window.removeEventListener('navigate', beforeNavigate);
            window.removeEventListener('navigatesuccess', afterNavigate);
        };
    }, []);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (onClick) {
            onClick();
        } else {
            try {
                window.navigation?.forward();
            } catch {
                window.history.forward();
            }
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
            <ChevronRight className="w-7 h-7"/>
        </button>
    );
};

export default CustomForwardButton;