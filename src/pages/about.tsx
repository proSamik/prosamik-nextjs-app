import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import ProfileHeader from "@/components/ProfileHeader";
import PersonalStory from '@/components/PersonalStory';
import Timeline from "@/components/Timeline";
import Skills from '@/components/Skills';
import CallToAction from "@/components/CallToAction";
import CustomBackButton from "@/components/CustomBackButton"
import CustomForwardButton from "@/components/CustomForwardButton";
import {usePageAnalytics} from "@/hooks/usePageAnalytics";

export default function About() {
    const [isMobile, setIsMobile] = useState(false);

    const { trackPageView } = usePageAnalytics();

    useEffect(() => {
        // Using void operator to handle the promise
        void trackPageView('about');
    }, [trackPageView]);

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
                <Navigation />

                <main
                    className="w-full mx-auto px-4 py-4"
                    style={{
                        marginTop: '60px',
                        marginBottom: '80px',
                    }}
                >
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomForwardButton />
                    </div>

                    <div className="w-full flex flex-col items-center">
                        <div className="w-full max-w-[800px] space-y-8">
                            <ProfileHeader />
                            <PersonalStory />
                            <Timeline />
                            <Skills />
                            <CallToAction />
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-grow flex flex-col md:flex-row">
                <div className="md:w-48 flex-shrink-0">
                    <Navigation />
                </div>

                <main className="flex-grow w-full mx-auto px-4 py-4">
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full max-w-[800px] space-y-8">
                            <ProfileHeader />
                            <PersonalStory />
                            <Timeline />
                            <Skills />
                            <CallToAction />
                        </div>
                    </div>
                </main>

                <div className="hidden md:block md:w-48 flex-shrink-0" />
            </div>

            <Footer />
        </div>
    );
}