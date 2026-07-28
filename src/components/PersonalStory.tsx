'use client';

import { useEffect, useState } from 'react';

const FULL_TEXT = "I started my indie hacking journey on 17 December 2024, and I'm still trying to make a living from it. Along the way, I've learned about building in public, social media marketing, making YouTube videos, and SEO." + "\n\n" + "I still haven't figured out how to make money consistently, but I know a lot more about what not to do. Building in public, for example, isn't for me. I enjoy making educational content and sharing what I've learned, even though I haven't worked out how to monetize it yet. That's what I want to focus on now.";
const TYPING_SPEED = 20;

export default function PersonalStory() {
    const [typedText, setTypedText] = useState('');

    useEffect(() => {
        let typingInterval: ReturnType<typeof setInterval> | undefined;
        const animationFrame = requestAnimationFrame(() => {
            const currentPath = window.location.pathname;
            const storedPath = sessionStorage.getItem('lastPath');
            const initialText = currentPath === storedPath
                ? sessionStorage.getItem('typedText') || ''
                : '';

            sessionStorage.setItem('lastPath', currentPath);
            setTypedText(initialText);

            let currentIndex = initialText.length;
            typingInterval = setInterval(() => {
                if (currentIndex >= FULL_TEXT.length) {
                    clearInterval(typingInterval);
                    return;
                }

                currentIndex += 1;
                const newText = FULL_TEXT.slice(0, currentIndex);
                setTypedText(newText);
                sessionStorage.setItem('typedText', newText);
            }, TYPING_SPEED);
        });

        const handleOrientation = () => {
            const storedText = sessionStorage.getItem('typedText');
            if (storedText) {
                setTypedText(storedText);
            }
        };

        window.addEventListener('orientationchange', handleOrientation);
        return () => {
            cancelAnimationFrame(animationFrame);
            if (typingInterval) clearInterval(typingInterval);
            window.removeEventListener('orientationchange', handleOrientation);
        };
    }, []);

    const displayText = typedText.split('\n').map((line, index) => (
        <span key={index}>
            {line}
            <br />
        </span>
    ));

    return (
        <div className="space-y-4  w-full min-h-40">
            <p className="text-gray-700 dark:text-gray-300 break-words">
                <span className="typing">{displayText}</span>
            </p>
        </div>
    );
}
