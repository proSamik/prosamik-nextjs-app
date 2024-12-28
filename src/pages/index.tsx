import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProfileHeader from '@/components/ProfileHeader';
import BlogPreview from '@/components/BlogPreview';
import ProjectPreview from '@/components/ProjectPreview';
import CallToAction from '@/components/CallToAction';
import CustomBackButton from "@/components/CustomBackButton"
import CustomForwardButton from "@/components/CustomForwardButton";

export default function Home() {
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

                    <div className="space-y-12">
                        <ProfileHeader />
                        <BlogPreview isMobile={true} />
                        <ProjectPreview isMobile={true} />
                        {/* Centered CallToAction with max-width */}
                        <div className="w-full flex justify-center">
                            <div className="w-full max-w-[728px]">
                                <CallToAction />
                            </div>
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
                <div className="">
                    <Navigation />
                </div>

                <main className="flex-grow w-full mx-auto px-4 py-4">
                    <div className="space-y-12">
                        <ProfileHeader />

                        <div className="flex flex-row space-x-2">
                            <BlogPreview isMobile={false} />
                            <ProjectPreview isMobile={false} />
                        </div>

                        {/* Centered CallToAction with max-width */}
                        <div className="w-full flex justify-center">
                            <div className="w-full max-w-[728px]">
                                <CallToAction />
                            </div>
                        </div>
                    </div>
                </main>

                <div className="hidden md:block md:w-20 flex-shrink-0"/>
            </div>

            <Footer />
        </div>
    );
}