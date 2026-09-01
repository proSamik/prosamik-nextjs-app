'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const RANDOM_THOUGHTS_LINK_TEXT = 'Read my random thoughts';
const FULL_TEXT = [
    "I started my indie hacking journey on 17 December 2024, and I'm still trying to make a living from it. Along the way, I've learned about building in public, social media marketing, making YouTube videos, and SEO.",
    "I still haven't figured out how to make money consistently, but I know a lot more about what not to do. Building in public, for example, isn't for me. I enjoy making educational content and sharing what I've learned, even though I haven't worked out how to monetize it yet. That's what I want to focus on now.",
    `I also keep a quiet corner for the unfiltered things on my mind. ${RANDOM_THOUGHTS_LINK_TEXT}.`,
].join('\n\n');
const RANDOM_THOUGHTS_LINK_START = FULL_TEXT.indexOf(RANDOM_THOUGHTS_LINK_TEXT);
const RANDOM_THOUGHTS_LINK_END = RANDOM_THOUGHTS_LINK_START + RANDOM_THOUGHTS_LINK_TEXT.length;
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

    const textBeforeLink = typedText.slice(0, Math.min(typedText.length, RANDOM_THOUGHTS_LINK_START));
    const visibleLinkText = typedText.length > RANDOM_THOUGHTS_LINK_START
        ? FULL_TEXT.slice(RANDOM_THOUGHTS_LINK_START, Math.min(typedText.length, RANDOM_THOUGHTS_LINK_END))
        : '';
    const textAfterLink = typedText.length > RANDOM_THOUGHTS_LINK_END
        ? typedText.slice(RANDOM_THOUGHTS_LINK_END)
        : '';

    return (
        <div className="space-y-4  w-full min-h-40">
            <p className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                <span className="typing">{textBeforeLink}</span>
                {visibleLinkText ? (
                    <Link
                        className="font-semibold text-blue-600 underline underline-offset-4"
                        href="/random-thoughts"
                    >
                        {visibleLinkText}
                    </Link>
                ) : null}
                <span className="typing">{textAfterLink}</span>
            </p>
        </div>
    );
}
