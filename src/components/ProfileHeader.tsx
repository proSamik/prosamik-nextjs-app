import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProfileHeader() {
    const [isMounted, setIsMounted] = useState(false);
    const [typedText, setTypedText] = useState('');
    const router = useRouter();
    const fullText = 'Welcome to prosamik.com';
    const typingSpeed = 100;

    useEffect(() => {
        setIsMounted(true);

        // Check if we're navigating to a new path or reloading
        const currentPath = router.asPath;
        const storedPath = sessionStorage.getItem('headerCurrentPath');

        if (!storedPath || storedPath !== currentPath || performance?.navigation?.type === 1) {
            // Clear text and start fresh on new path or reload
            sessionStorage.removeItem('headerTypedText');
            setTypedText('');
        } else {
            // Same path (likely rotation), get stored text
            const storedText = sessionStorage.getItem('headerTypedText');
            if (storedText) {
                setTypedText(storedText);
            }
        }

        // Update stored path
        sessionStorage.setItem('headerCurrentPath', currentPath);

        const handleOrientation = () => {
            const storedText = sessionStorage.getItem('headerTypedText');
            if (storedText) {
                setTypedText(storedText);
            }
        };

        window.addEventListener('orientationchange', handleOrientation);

        return () => {
            window.removeEventListener('orientationchange', handleOrientation);
        };
    }, [router.asPath]);

    useEffect(() => {
        if (!isMounted) return;
        if (typedText === fullText) return;

        let currentIndex = typedText.length;
        const typeText = () => {
            if (currentIndex < fullText.length) {
                const newText = fullText.slice(0, currentIndex + 1);
                setTypedText(newText);
                sessionStorage.setItem('headerTypedText', newText);
                currentIndex++;
            } else {
                clearInterval(typingInterval);
            }
        };

        const typingInterval = setInterval(typeText, typingSpeed);

        return () => clearInterval(typingInterval);
    }, [fullText, typedText, isMounted]);

    if (!isMounted) {
        return (
            <div className="flex flex-col items-center mt-5 pt-2 w-full">
                <div className="flex items-center justify-between w-full mb-8">
                    <div className="flex-grow text-center">
                        <p className="text-4xl font-bold text-blue-500 dark:text-blue-400 font-mono">
                            <span className="animate-pulse">|</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center mt-5 pt-2 w-full">
            <div className="flex items-center justify-between w-full mb-8">
                <div className="flex-grow text-center">
                    <p className="text-4xl font-bold text-blue-500 dark:text-blue-400 font-mono">
                        {typedText}
                        <span className="animate-pulse">|</span>
                    </p>
                </div>
            </div>

            <div className="flex flex-row items-center justify-between sm:justify-center w-full">
                <Image
                    src="https://avatars.githubusercontent.com/u/73891260?v=4"
                    alt="Profile Picture"
                    width={120}
                    height={120}
                    className="rounded-full shadow-md ml-5 sm:ml-0"
                    priority
                />
                <h1 className="text-2xl sm:text-3xl font-bold ml-5 sm:ml-10 text-nowrap">Samik Choudhury</h1>
            </div>

            <p className="text-sm sm:text-lg font-bold text-gray-600 dark:text-gray-300 mt-6 text-center w-full">
                &lt; Build to Ship /&gt;
            </p>
        </div>
    );
}