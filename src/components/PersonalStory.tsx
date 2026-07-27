'use client';

import { useEffect, useState } from 'react';

export default function PersonalStory() {
    const [isMounted, setIsMounted] = useState(false);
    const [typedText, setTypedText] = useState('');

    const fullText = "I started my indie hacking journey on 17 December 2024, and I'm still trying to make a living from it. Along the way, I've learned about building in public, social media marketing, making YouTube videos, and SEO." + "\n\n" + "I still haven't figured out how to make money consistently, but I know a lot more about what not to do. Building in public, for example, isn't for me. I enjoy making educational content and sharing what I've learned, even though I haven't worked out how to monetize it yet. That's what I want to focus on now.";
    const typingSpeed = 20;

    useEffect(() => {
        setIsMounted(true);

        // Get the current URL path
        const currentPath = window.location.pathname;
        const storedPath = sessionStorage.getItem('lastPath');

        // If we're coming from a different path or the stored path doesn't exist,
        // start fresh
        if (currentPath !== storedPath) {
            sessionStorage.setItem('lastPath', currentPath);
            setTypedText('');
        } else {
            // Within same path, check if we're rotating
            const storedText = sessionStorage.getItem('typedText');
            if (storedText) {
                setTypedText(storedText);
            }
        }

        // Handle rotation
        const handleOrientation = () => {
            const storedText = sessionStorage.getItem('typedText');
            if (storedText) {
                setTypedText(storedText);
            }
        };

        window.addEventListener('orientationchange', handleOrientation);
        return () => window.removeEventListener('orientationchange', handleOrientation);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        if (typedText === fullText) return;

        let currentIndex1 = typedText.length;

        const typeText = () => {
            if (currentIndex1 < fullText.length) {
                const newText = fullText.slice(0, currentIndex1 + 1);
                setTypedText(newText);
                sessionStorage.setItem('typedText', newText);
                currentIndex1++;
            } else {
                clearInterval(typingInterval);
            }
        };

        const typingInterval = setInterval(typeText, typingSpeed);
        return () => clearInterval(typingInterval);
    }, [fullText, typedText, isMounted]);

    const displayText = typedText.split('\n').map((line, index) => (
        <span key={index}>
            {line}
            <br />
        </span>
    ));

    if (!isMounted) {
        return (
            <div className="space-y-4 w-full">
                <p className="text-gray-700 dark:text-gray-300 break-words">
                    <span className="typing"></span>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4  w-full min-h-40">
            <p className="text-gray-700 dark:text-gray-300 break-words">
                <span className="typing">{displayText}</span>
            </p>
        </div>
    );
}
