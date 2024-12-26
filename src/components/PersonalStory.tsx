import { useEffect, useState } from 'react';

export default function PersonalStory() {

    const [typedText, setTypedText] = useState('');
    const fullText = "Hey, I’m Samik! By degree, I’m an Electronics and Telecommunication engineer, but I’ve been into coding since class 11 — I was just so curious about how it all works. That curiosity led me to choose engineering, and now I’m here, coding my way through life!" + "\n\n" + "You could say I'm a Jack of all trades, but I’m mastering product development. I love exploring different domains and creating projects that make a real impact. Let’s just say, I’m all about turning curiosity into code!";
    const typingSpeed = 20; // Speed of typing in milliseconds

    useEffect(() => {
        let currentIndex1 = 0;

        const typeText = () => {
            if (currentIndex1 < fullText.length) {
                setTypedText(fullText.slice(0, currentIndex1 + 1));
                currentIndex1++;
            } else {
                clearInterval(typingInterval);
            }
        };

        const typingInterval = setInterval(typeText, typingSpeed);

        return () => clearInterval(typingInterval); // Cleanup interval on unmount
    }, [fullText]);

    // Replace \n with <br /> to render line breaks in HTML
    const displayText = typedText.split('\n').map((line, index) => (
        <span key={index}>
            {line}
            <br />
        </span>
    ));

    return (
        <div className="space-y-4 px-4 py-2 max-w-2xl">
            <p className="text-gray-700 dark:text-gray-300 break-words ">
                <span className="typing">{displayText}</span>
            </p>
        </div>
    );
}
