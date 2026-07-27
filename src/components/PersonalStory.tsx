'use client';

import { useEffect, useState } from 'react';

export default function PersonalStory() {
    const [isMounted, setIsMounted] = useState(false);
    const [typedText, setTypedText] = useState('');

    const fullText = "By degree, I'm an Electronics and Telecommunication engineer. I started coding in class 11 because I wanted to understand how software worked, and I never really stopped pulling things apart and building my own versions." + "\n\n" + "These days, I build small products across the web, macOS, iOS, and browser extensions. Some work, some don't, but each one teaches me something I can carry into the next. I care less about staying in one technical lane and more about finding a real problem, shipping a useful solution, and being honest about what I learned along the way.";
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
