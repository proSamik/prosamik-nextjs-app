import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function ProfileHeader() {
    const [typedText, setTypedText] = useState('');
    const fullText = 'Welcome to prosamik.com';
    const typingSpeed = 100; // Speed of typing in milliseconds

    useEffect(() => {
        let currentIndex = 0;

        const typeText = () => {
            if (currentIndex < fullText.length) {
                setTypedText(fullText.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                clearInterval(typingInterval);
            }
        };

        const typingInterval = setInterval(typeText, typingSpeed);

        return () => clearInterval(typingInterval); // Cleanup interval on unmount
    }, []);

    return (
        <div className="flex flex-col items-center pt-2 w-full">
            {/* Typing Animation */}
            <p className="text-4xl font-bold text-blue-500 dark:text-blue-400 mb-8 font-mono text-center w-full">
                {typedText}
                <span className="animate-pulse">|</span>
            </p>

            <div className="flex flex-row items-center sm:justify-center w-full">
                {/* Profile Image */}
                <Image
                    src="https://avatars.githubusercontent.com/u/73891260?v=4"
                    alt="Profile Picture"
                    width={120} // Default size
                    height={120} // Default size
                    className="rounded-full shadow-md sm:w-50 sm:h-50"
                    priority
                />

                {/* Name */}
                <h1 className="text-2xl sm:text-3xl font-bold ml-10">Samik Choudhury</h1>
            </div>

            {/* Tagline */}
            <p className="text-sm sm:text-lg font-bold text-gray-600 dark:text-gray-300 mt-6 text-center w-full">
                On My Learning Path, One Step Closer to Becoming an Indie Dev.
            </p>
        </div>
    );
}
