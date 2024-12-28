import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import FeedbackForm from '@/components/FeedbackForm';
import CustomBackButton from "@/components/CustomBackButton"
import CustomForwardButton from "@/components/CustomForwardButton";

export default function Feedback() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isMobile) {
        return (
            <div className="flex flex-col md:flex-row">
                {/* Navigation component */}
                <Navigation />

                {/* Main content area */}
                <main
                    className={`max-w-[728px] mx-auto px-4 py-8`}
                    style={{
                        width: '100%',
                        marginTop: '60px',
                        marginBottom: '60px',
                    }}
                >
                    {/* Navigation Buttons Row - Added this section */}
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomForwardButton />
                    </div>

                    <div className="flex justify-center items-center mb-4">
                        <h1 className="text-3xl font-serif text-center mr-10">Feedback Form</h1>
                    </div>

                    {/* Feedback Form Component */}
                    <FeedbackForm />
                </main>

                {/* Footer component */}
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-grow flex flex-col md:flex-row">
                {/* Navigation */}
                <div className="md:w-36 flex-shrink-0">
                    <Navigation />
                </div>

                {/* Main content */}
                <main className="flex-grow w-full mx-auto px-4 py-8">
                    <div className="flex justify-center items-center mb-4">
                        <h1 className="text-3xl font-serif text-center mr-10">Feedback Form</h1>
                    </div>

                    {/* Feedback Form Component */}
                    <FeedbackForm />
                </main>

                {/* Right spacing div for desktop */}
                <div className="hidden md:block md:w-36 flex-shrink-0" />
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}