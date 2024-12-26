import { useEffect, useState } from 'react';
import Link from 'next/link';

const Navigation = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090); // Set isMobile based on screen width
        };

        handleResize(); // Run initially
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <nav
            className={`${
                isMobile
                    ? 'fixed left-0 top-0 w-full bg-white dark:bg-gray-800 shadow-md z-10 flex justify-center'
                    : 'sticky top-0 left-0 w-auto h-screen p-4 flex flex-col items-center justify-center'
            }`}
        >
            <Link
                href="/"
                className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
            >
                {/* Home Icon SVG */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width={isMobile ? '24' : '36'}
                    height={isMobile ? '24' : '36'}
                >
                    <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                    <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
                </svg>
                <span className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                    Home
                </span>
            </Link>
            <Link
                href="/about"
                className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
            >
                {/* About Icon SVG */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width={isMobile ? '24' : '36'}
                    height={isMobile ? '24' : '36'}
                >
                    <path
                        fillRule="evenodd"
                        d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                        clipRule="evenodd"
                    />
                </svg>
                <span className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                    About Me
                </span>
            </Link>
        </nav>
    );
};

export default Navigation;
