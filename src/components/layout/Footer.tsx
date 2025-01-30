import { useEffect, useState } from 'react';
import { FaTwitter, FaGithub } from 'react-icons/fa';

const Footer = () => {
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
        <footer
            className={`${
                isMobile
                    ? 'fixed bottom-0 left-0 w-full pb-1 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:bg-gradient-to-b dark:from-gray-800/90 dark:to-gray-900/95 shadow-lg shadow-slate-200/20 dark:shadow-black/20 flex justify-center pt-3 items-center'
                    : 'fixed right-0 top-1/2 transform -translate-y-1/2 pr-5 flex flex-col items-center max-w-[70px] w-full'
            }`}
        >
            {/* Social Icons */}
            <div
                className={`${
                    isMobile
                        ? 'flex space-x-4 pr-10 pl-2'
                        : 'flex flex-col justify-center items-center space-y-4 pb-10' // Stack vertically on desktop
                }`}
            >
                {/* <a
                    href="https://www.linkedin.com/in/prosamik"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 flex flex-col items-center"
                >
                    <FaLinkedin size={30}/>
                    <span className="mt-2 text-sm">
                    proSamik
                    </span>
                </a> */}
                <a
                    href="https://www.twitter.com/prosamik"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 flex flex-col items-center"
                >
                    <FaTwitter size={30}/>
                    <span className="mt-2 text-sm">
                    proSamik
                    </span>
                </a>
                <a
                    href="https://www.github.com/prosamik"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-300 flex flex-col items-center"
                >
                    <FaGithub size={30}/>
                    <span className="mt-2 text-sm">
                    proSamik
                    </span>
                </a>
            </div>

            {/* Copyright Note */}
            <p className="mt-2 text-sm break-words text-center pr-2">
                &copy; {new Date().getFullYear()} proSamik. All Rights Reserved.
            </p>
        </footer>
    );
};

export default Footer;
