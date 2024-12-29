import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';

interface CustomButtonProps {
    onClick?: () => void;
}

const CustomForwardButton: React.FC<CustomButtonProps> = ({ onClick }) => {
    const [canGoForward, setCanGoForward] = useState(false);
    const router = useRouter();

    useEffect(() => {
        let currentPosition = sessionStorage.getItem('historyPosition')
            ? parseInt(sessionStorage.getItem('historyPosition')!, 10)
            : window.history.length;

        const checkNavigationState = () => {
            const currentPath = window.location.pathname;
            const isRootPath = currentPath === '/' || currentPath === '';

            // If we're at a position less than our max recorded position, we can go forward
            const hasForwardHistory = window.history.length > 1 &&
                window.history.length > currentPosition;

            console.log({
                currentPath,
                isRootPath,
                historyLength: window.history.length,
                currentPosition,
                hasForwardHistory
            });

            setCanGoForward(hasForwardHistory && !isRootPath);
        };

        // Update position when navigating back
        const handlePopState = () => {
            currentPosition = window.history.length;
            sessionStorage.setItem('historyPosition', currentPosition.toString());
            checkNavigationState();
        };

        // Initial check and setup
        sessionStorage.setItem('historyPosition', currentPosition.toString());
        checkNavigationState();

        // Event listeners
        window.addEventListener('popstate', handlePopState);
        router.events.on('routeChangeComplete', checkNavigationState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            router.events.off('routeChangeComplete', checkNavigationState);
        };
    }, [router]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onClick) {
            onClick();
        } else {
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