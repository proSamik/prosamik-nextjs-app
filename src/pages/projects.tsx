import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import {useProjectsList} from "@/hooks/useProjectsList";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import ProjectList from "@/components/ProjectList";
import CustomBackButton from "@/components/CustomBackButton"
import CustomForwardButton from "@/components/CustomForwardButton";
import {usePageAnalytics} from "@/hooks/usePageAnalytics";

export default function Projects() {
    const [isMobile, setIsMobile] = useState(false);
    const { data, error, loading } = useProjectsList();

    const { trackPageView } = usePageAnalytics();

    useEffect(() => {
        // Using void operator to handle the promise
        void trackPageView('projects');
    }, [trackPageView]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return <div>No projects found</div>;

    if (isMobile) {
        return (
            <div className="flex flex-col md:flex-row">
                {/* Navigation component */}
                <Navigation />

                {/* Main content area */}
                <main
                    className={`max-w-[800px] mx-auto px-4 py-4`}
                    style={{
                        width: '100%',
                        marginTop: '60px',
                        marginBottom: '80px',
                    }}
                >
                    {/* Navigation Buttons Row - Added this section */}
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomForwardButton />
                    </div>

                    <div className="space-y-8">
                        <ProjectList repos={data.repos} />
                    </div>
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
                <div className="md:w-64 flex-shrink-0">
                    <Navigation />
                </div>

                {/* Main content */}
                <main className="flex-grow max-w-[800px] w-full mx-auto px-4 py-4">
                    <div className="space-y-8">
                        <ProjectList repos={data.repos} />
                    </div>
                </main>

                {/* Right spacing div for desktop */}
                <div className="hidden md:block md:w-64 flex-shrink-0" />
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}