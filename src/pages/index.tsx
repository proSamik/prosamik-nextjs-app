import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProfileHeader from '@/components/ProfileHeader';
import CallToAction from '@/components/CallToAction';
import CustomBackButton from "@/components/CustomBackButton";
import CustomForwardButton from "@/components/CustomForwardButton";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useRepoList } from "@/hooks/useRepoList";
import { useProjectsList } from "@/hooks/useProjectsList";
import PreviewLayoutCards from "@/components/PreviewLayoutCards";

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);
    const { trackPageView } = usePageAnalytics();
    const { data: blogData, error: blogError, loading: blogLoading } = useRepoList();
    const { data: projectData, error: projectError, loading: projectLoading } = useProjectsList();

    useEffect(() => {
        void trackPageView('home');
    }, [trackPageView]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Common layout classes based on isMobile state
    const layoutClasses = {
        container: `min-h-screen flex flex-col`,
        mainWrapper: `flex-grow flex flex-col md:flex-row`,
        main: `flex-grow w-full mx-auto px-4 py-4 ${isMobile ? 'mt-[60px] mb-[80px]' : ''}`,
        contentWrapper: `space-y-12`,
        previewCardsContainer: `${isMobile ? '' : 'flex flex-row space-x-2'}`,
        callToActionWrapper: `w-full flex justify-center`,
        callToActionInner: `w-full max-w-[728px]`,
        rightSpacer: `hidden md:block md:w-20 flex-shrink-0`
    };

    return (
        <div className={layoutClasses.container}>
            <div className={layoutClasses.mainWrapper}>
                <div className="">
                    <Navigation />
                </div>

                <main className={layoutClasses.main}>
                    {isMobile && (
                        <div className="flex justify-between mb-6">
                            <CustomBackButton />
                            <CustomForwardButton />
                        </div>
                    )}

                    <div className={layoutClasses.contentWrapper}>
                        <ProfileHeader />

                        <div className={layoutClasses.previewCardsContainer}>
                            <PreviewLayoutCards
                                isMobile={isMobile}
                                type="blog"
                                data={blogData}
                                loading={blogLoading}
                                error={blogError}
                            />
                            <PreviewLayoutCards
                                isMobile={isMobile}
                                type="project"
                                data={projectData}
                                loading={projectLoading}
                                error={projectError}
                            />
                        </div>

                        <div className={layoutClasses.callToActionWrapper}>
                            <div className={layoutClasses.callToActionInner}>
                                <CallToAction />
                            </div>
                        </div>
                    </div>
                </main>

                {!isMobile && <div className={layoutClasses.rightSpacer} />}
            </div>

            <Footer />
        </div>
    );
}