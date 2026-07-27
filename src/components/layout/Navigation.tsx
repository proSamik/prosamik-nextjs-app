import React, { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ThemeToggle from "@/components/layout/ThemeToggle";
import CustomBackButton from "./CustomBackButton";
import CustomNextButton from "./CustomNextButton";

// Define TypeScript interface for NavLink props
interface NavLinkProps {
    href: string;
    icon: ReactNode;
    label: string;
    isMenuOpen?: boolean;
    onNavigate?: () => void;
}

const Navigation = () => {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {

        // Set mounted state
        setIsMounted(true);

        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090);
            setIsSmallScreen(window.innerWidth < 630);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        // Close menu on route change
        const handleRouteChange = () => {
            setIsMenuOpen(false);
        };

        router.events.on('routeChangeComplete', handleRouteChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router.events]);

    const isActivePath = (path: string): boolean => router.pathname === path;

    const NavLink: React.FC<NavLinkProps> = ({ href, icon, label, isMenuOpen }) => {
        const isActive = isActivePath(href);

        return (
            <Link
                href={href}
                className="relative group ml-5 w-full"
            >
                <div className={`pr-4 pl-6 pt-2 pb-1 rounded-lg backdrop-blur-md
                          transition-all duration-200
                          flex flex-col items-center
                          group-hover:scale-110
                          ${isMobile ? (isSmallScreen && isMenuOpen ? 'scale-125' : '') : 'w-full'}`}>
                    <div className={`${
                        isActive
                            ? 'text-blue-600 dark:text-blue-500 fill-blue-600 dark:fill-blue-500'
                            : 'text-gray-700 dark:text-gray-300 fill-gray-700 dark:fill-gray-300 hover:text-blue-600 hover:dark:text-blue-500 hover:fill-blue-600 hover:dark:fill-blue-500'
                    } transition-colors duration-200`}>
                        {icon}
                    </div>
                    <span className={`mt-2 text-sm text-nowrap ${
                        isActive
                            ? 'text-blue-600 dark:text-blue-500'
                            : 'text-gray-700 dark:text-gray-300'
                    } ${isSmallScreen && isMenuOpen ? 'text-base' : ''}`}>
                {label}
            </span>
                </div>
            </Link>
        );
    };

    if (!isMounted) {
        return null;
    }

    return (
        <nav
            className={`${
                isMobile
                    ? `fixed left-0 top-0 w-full bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:bg-gradient-to-b dark:from-gray-800/90 dark:to-gray-900/95 shadow-lg shadow-slate-200/20 dark:shadow-black/20 z-10 ${isSmallScreen ? 'py-8' : 'py-1'} flex justify-center items-center px-4`
                    : 'sticky top-0 left-0 w-24 h-screen p-2 flex flex-col items-center justify-center'
            }`}
        >
            {/* Desktop Navigation Controls */}
            {!isMobile && (
                <>
                    <div className="absolute top-16 left-0 px-2">
                        <CustomBackButton/>
                    </div>
                    <div className="absolute bottom-16 left-0 px-2">
                        <CustomNextButton/>
                    </div>
                </>
            )}


            {/* Theme Toggle */}
            <div className={isMobile ? 'absolute left-0 px-5' : 'absolute top-0 left-1 px-10 mt-5'}>
                <ThemeToggle/>
            </div>

            {/* Hamburger Menu */}
            {isSmallScreen && (
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="absolute right-0 px-5 py-4"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        width="24"
                        height="24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={isMenuOpen
                                ? "M6 18L18 6M6 6l12 12"
                                : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                            }
                        />
                    </svg>
                </button>
            )}

            {/* Navigation Links Container */}
            <div className={`${
                isMobile
                    ? isSmallScreen
                        ? `fixed right-0 top-16 left-0 bottom-0 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:bg-gradient-to-b dark:from-gray-800/90 dark:to-gray-900/95 shadow-md shadow-slate-200/20 dark:shadow-black/20 flex flex-col items-center gap-8 p-8 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} border-t-2 border-slate-300 dark:border-gray-800`
                        : 'flex items-center justify-center'
                    : 'flex flex-col items-center gap-4 p-4 pr-16 pl-8 ml-5 rounded-2xl backdrop-blur-md bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:bg-gradient-to-b dark:from-gray-800/75 dark:via-gray-800/85 dark:to-gray-900/90 w-full border-2 border-slate-300 dark:border-white/10 shadow-lg dark:shadow-black/20'
            }`}>
                <NavLink
                    href="/"
                    icon={
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            width={isMobile ? '36' : '36'}
                            height={isMobile ? '36' : '36'}
                        >
                            <path
                                d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                        </svg>
                    }
                    label="Home"
                    isMenuOpen={isMenuOpen}
                />

                <NavLink
                    href="/about"
                    icon={
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            width={isMobile ? '36' : '36'}
                            height={isMobile ? '36' : '36'}
                        >
                            <path
                                fillRule="evenodd"
                                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    }
                    label="Who is Samik"
                    isMenuOpen={isMenuOpen}
                />

            </div>
        </nav>
    );
};

export default Navigation;
