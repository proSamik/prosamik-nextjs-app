import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";

export default function About() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if the screen is mobile or desktop
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090); // Adjust the breakpoint as needed
        };

        handleResize(); // Run initially
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex flex-col md:flex-row">
            {/* Navigation component */}
            <Navigation />

            {/* Main content area */}
            <main
                className={`max-w-[728px] mx-auto px-4 py-8`}
                style={{
                    width: isMobile ? '100%' : 'auto',
                    marginTop: isMobile ? '60px' : '0', // Apply a fixed margin for mobile
                }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-serif mr-28">About Me</h1>
                    <ThemeToggle />
                </div>
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Acha sochke likhunga
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                        Kuch toh likhna padega
                    </p>
                </div>
            </main>
            {/* Footer component */}
            <Footer />
        </div>
    );
}
