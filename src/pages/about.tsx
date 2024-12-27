import React, { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import ProfileHeader from "@/components/ProfileHeader";
import PersonalStory from '@/components/PersonalStory';
import Timeline from "@/components/Timeline";
import Skills from '@/components/Skills';
import CallToAction from "@/components/CallToAction";

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
                className={`max-w-[800px] mx-auto px-4 py-4`}
                style={{
                    width: isMobile ? '100%' : '100%',
                    marginTop: isMobile ? '60px' : '0',
                    marginBottom: isMobile ? '80px' : '0',}}
            >
                <div className="flex justify-center items-center mb-4">
                    <ThemeToggle />
                </div>
                {/* About page components */}
                <div className="space-y-8">
                    <ProfileHeader />
                    <PersonalStory />
                    <Timeline />
                    <Skills />
                    <CallToAction />
                </div>
            </main>
            {/* Footer component */}
            <Footer />
        </div>
    );
}
