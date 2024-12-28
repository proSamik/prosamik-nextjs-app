import { useEffect, useState } from 'react';

export default function PersonalStory() {
    const [isMounted, setIsMounted] = useState(false);
    const [typedText, setTypedText] = useState('');

    const fullText = "Hey, I'm Samik! By degree, I'm an Electronics and Telecommunication engineer, but I've been into coding since class 11 — I was just so curious about how it all works. That curiosity led me to choose engineering, and now I'm here, coding my way through life!" + "\n\n" + "You could say I'm a Jack of all trades, but I'm mastering product development. I love exploring different domains and creating projects that make a real impact. Let's just say, I'm all about turning curiosity into code!";
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
            <div className="space-y-4 py-2 w-full">
                <p className="text-gray-700 dark:text-gray-300 break-words">
                    <span className="typing"></span>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 py-2 w-full">
            <p className="text-gray-700 dark:text-gray-300 break-words">
                <span className="typing">{displayText}</span>
            </p>
        </div>
    );
}