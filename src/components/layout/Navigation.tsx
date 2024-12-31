import { useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeToggle from "@/components/layout/ThemeToggle";
import CustomBackButton from "./CustomBackButton";
import CustomForwardButton from "./CustomForwardButton";

const Navigation = () => {
    const [isMobile, setIsMobile] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1090);
            setIsSmallScreen(window.innerWidth < 500);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <nav
            className={`${
                isMobile
                    ? `fixed left-0 top-0 w-full bg-white dark:bg-gray-800 shadow-md z-10 ${isSmallScreen ? 'py-8' : 'py-1'} flex justify-center items-center px-4`
                    : 'sticky top-0 left-0 w-fit h-screen p-2 flex flex-col items-center justify-center'
            }`}
        >

            {/* Navigation Controls for Desktop */}
            {!isMobile && (
                <>
                    {/* Back Button */}
                    <div className="absolute top-4 left-0 px-5">
                        <CustomBackButton />
                    </div>

                    {/* Forward Button */}
                    <div className="absolute bottom-4 left-0 px-5">
                        <CustomForwardButton />
                    </div>
                </>
            )}

            {/* Theme Toggle */}
            <div className={isMobile ? 'absolute left-0 px-5' : 'mb-12'}>
                <ThemeToggle/>
            </div>

            {/* Hamburger Menu for small screens */}
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
                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                        />
                    </svg>
                </button>
            )}

            {/* Navigation Links Container */}
            <div className={`${
                isMobile
                    ? isSmallScreen
                        ? `fixed right-0 top-16 bg-white dark:bg-gray-800 shadow-md flex flex-col items-center gap-4 p-4 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`
                        : 'flex items-center justify-center ml-5'
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

                {/* Blog Link */}
                <Link
                    href="/blogs"
                    className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        width={isMobile ? '24' : '36'}
                        height={isMobile ? '24' : '36'}
                        className="fill-current"
                    >
                        <g>
                            <rect x="293.186" y="307.184" width="131.572" height="112.986"/>
                            <rect x="87.243" y="308.893" width="154.448" height="17.162"/>
                            <rect x="87.243" y="401.298" width="154.448" height="17.162"/>
                            <rect x="87.243" y="355.1" width="154.448" height="17.162"/>
                            <path
                                d="M416.428,0.004H95.58C42.787,0.013,0.016,42.792,0,95.577v303.685 c0.025,62.262,50.463,112.717,112.742,112.734h286.524c62.27-0.017,112.717-50.464,112.734-112.734V95.577 C511.992,42.792,469.212,0.013,416.428,0.004z M464.805,399.262c-0.008,18.15-7.308,34.424-19.198,46.34 c-11.916,11.891-28.19,19.19-46.34,19.198H112.742c-18.15-0.009-34.433-7.308-46.348-19.198 c-11.892-11.916-19.182-28.19-19.198-46.34V118.696h417.61V399.262z"/>
                            <path
                                d="M88.96,267.908h34.583c19.71,0,31.642-8.581,31.642-26.548c0-10.852-6.167-18.368-12.2-20.648v-0.268 c6.034-3.352,10.592-9.519,10.592-19.432c0-14.489-9.251-24.268-29.086-24.268H88.96c-0.796,0-1.332,0.536-1.332,1.34v88.475 C87.628,267.371,88.164,267.908,88.96,267.908z M107.338,193.495c0-0.528,0.251-0.804,0.804-0.804h13.944 c7.5,0,11.925,3.888,11.925,10.584c0,6.712-4.425,10.734-11.925,10.734h-13.944c-0.553,0-0.804-0.268-0.804-0.804V193.495z M107.338,229.955c0-0.528,0.251-0.795,0.804-0.795h15c8.061,0,12.343,4.424,12.343,11.405c0,7.097-4.282,11.396-12.343,11.396h-15 c-0.553,0-0.804-0.276-0.804-0.812V229.955z"/>
                            <path
                                d="M181.516,267.908h59.404c0.796,0,1.332-0.536,1.332-1.349v-14.874c0-0.813-0.536-1.341-1.332-1.341h-40.224 c-0.544,0-0.804-0.268-0.804-0.812v-71.447c0-0.804-0.528-1.34-1.341-1.34h-17.036c-0.805,0-1.332,0.536-1.332,1.34v88.475 C180.183,267.371,180.711,267.908,181.516,267.908z"/>
                            <path
                                d="M292.708,269.374c15.963,0,28.558-7.366,33.251-22.115c2.011-6.301,2.539-11.396,2.539-24.938 c0-13.542-0.528-18.637-2.539-24.939c-4.693-14.739-17.288-22.114-33.251-22.114c-15.956,0-28.558,7.375-33.243,22.114 c-2.02,6.302-2.556,11.397-2.556,24.939c0,13.542,0.536,18.637,2.556,24.938C264.149,262.009,276.752,269.374,292.708,269.374z M278.361,202.746c2.011-6.301,6.847-10.055,14.346-10.055c7.508,0,12.335,3.754,14.346,10.055 c1.073,3.226,1.474,7.634,1.474,19.576c0,11.924-0.402,16.357-1.474,19.567c-2.011,6.31-6.838,10.072-14.346,10.072 c-7.5,0-12.335-3.763-14.346-10.072c-1.064-3.21-1.475-7.643-1.475-19.567C276.886,210.38,277.297,205.972,278.361,202.746z"/>
                            <path
                                d="M387.961,269.374c16.081,0,28.685-8.171,33.251-22.794c1.6-4.952,2.263-12.46,2.263-20.505v-7.517 c0-0.788-0.536-1.333-1.332-1.333h-31.366c-0.813,0-1.349,0.545-1.349,1.333v12.888c0,0.796,0.536,1.332,1.349,1.332h12.326 c0.536,0,0.805,0.277,0.805,0.805c0,3.879-0.403,6.703-1.073,8.991c-1.878,6.026-7.777,9.386-14.614,9.386 c-7.91,0-12.88-3.763-14.891-10.072c-1.064-3.21-1.466-7.643-1.466-19.567c0-11.941,0.402-16.223,1.466-19.441 c2.011-6.302,6.847-10.19,14.631-10.19c7.5,0,12.05,3.218,15.678,9.385c0.269,0.67,0.939,0.939,1.886,0.67l14.338-6.033 c0.796-0.402,0.947-1.206,0.536-2.019c-4.299-10.995-15.419-19.425-32.439-19.425c-16.232,0-28.835,7.375-33.527,22.114 c-2.012,6.302-2.556,11.397-2.556,24.939c0,13.542,0.545,18.637,2.556,24.938C359.126,262.009,371.73,269.374,387.961,269.374z"/>
                        </g>
                    </svg>
                    <span className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                        Blogs
                    </span>
                </Link>

                {/* Projects Link */}
                <Link
                    href="/projects"
                    className="pr-4 pl-4 pt-2 pb-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col items-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width={isMobile ? '24' : '36'}
                        height={isMobile ? '24' : '36'}
                        stroke="currentColor"
                        fill="currentColor"
                    >
                        <path
                            d="M6,6H2V2h4V6z M14,2h-4v4h4V2z M22,2h-4v4h4V2z M6,10H2v4h4V10z M14,10h-4v4h4V10z M22,10h-4v4h4V10z M6,18H2v4h4V18z M14,18h-4v4h4V18z M22,18h-4v4h4V18z"/>
                    </svg>
                    <span className="mt-2 text-sm text-gray-800 dark:text-gray-300">
                        Projects
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
                    <span className="mt-2 text-sm text-gray-800 dark:text-gray-300 text-nowrap
                    ">
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
                    <span className="mt-2 text-sm text-gray-800 dark:text-gray-300 text-nowrap">
                        Roast Here
                    </span>
                </Link>
            </div>
        </nav>
    );
};

export default Navigation;