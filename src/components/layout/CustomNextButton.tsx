import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';

interface CustomButtonProps {
    onClick?: (() => void) | (() => Promise<void>);
    className?: string;
}

const CustomNextButton: React.FC<CustomButtonProps> = ({
                                                              onClick,
                                                              className = ''
                                                          }) => {
    const [isNavigating, setIsNavigating] = useState(false);
    const router = useRouter();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (isNavigating) return;

        setIsNavigating(true);

        if (onClick) {
            Promise.resolve(onClick()).finally(() => {
                setIsNavigating(false);
            });
        } else {
            window.history.forward();
            setIsNavigating(false);
        }
    };

    // Only hide on root path
    if (router.pathname === '/') return null;

    return (
        <button
            onClick={handleClick}
            disabled={isNavigating}
            className={`
                flex items-center mr-2 py-2 pl-4 rounded-md
                text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `.trim()}
            aria-label="Navigate forward"
        >
            <span className={''}>Next</span>
            <ChevronRight className={`w-7 h-7 ${isNavigating ? 'animate-pulse' : ''}`} />
        </button>
    );
};

export default CustomNextButton;