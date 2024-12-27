import { useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeToggle from "@/components/ThemeToggle";

const Navigation = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <nav
            className={`${
                isMobile
                    ? 'fixed left-0 top-0 w-full bg-white dark:bg-gray-800 shadow-md z-10 flex justify-center items-center px-4'
                    : 'sticky top-0 left-0 w-fit h-screen p-2 flex flex-col items-center justify-center'
            }`}
        >
            {/* Theme Toggle */}
            <div className={isMobile ? 'absolute left-0 px-5' : 'mb-12'}>
                <ThemeToggle />
            </div>

            {/* Navigation Links Container */}
            <div className={`${
                isMobile
                    ? 'flex items-center justify-center'
                    : 'flex flex-col items-center gap-4'
            }`}>
                <Link
                    href="/"
                    className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        width={isMobile ? '24' : '36'}
                        height={isMobile ? '24' : '36'}
                    >
                        <path
                            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                        />
                    </svg>
                    <span className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                        Home
                    </span>
                </Link>
                <Link
                    href="/about"
                    className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
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
                <Link
                    href="/feedback"
                    className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        width={isMobile ? '24' : '36'}
                        height={isMobile ? '24' : '36'}
                    >
                        <path
                            fillRule="evenodd"
                            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                        Roast here
                    </span>
                </Link>
            </div>
        </nav>
    );
};

export default Navigation;