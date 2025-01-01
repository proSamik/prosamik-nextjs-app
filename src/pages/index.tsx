import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import ProfileHeader from '@/components/ProfileHeader';
import CallToAction from '@/components/layout/CallToAction';
import CustomBackButton from "@/components/layout/CustomBackButton";
import CustomNextButton from "@/components/layout/CustomNextButton";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import ContentPreviewCards from "@/components/ContentPreviewCards";
import {useContentList} from "@/hooks/useContentList";

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);
    const { trackPageView } = usePageAnalytics();
    const { data: blogData, error: blogError, loading: blogLoading } = useContentList({ type: 'blog' });
    const { data: projectData, error: projectError, loading: projectLoading } = useContentList({ type: 'project' });

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
                            <CustomNextButton />
                        </div>
                    )}

                    <div className={layoutClasses.contentWrapper}>
                        <ProfileHeader />

                        <div className={layoutClasses.previewCardsContainer}>
                            <ContentPreviewCards
                                isMobile={isMobile}
                                type="blog"
                                data={blogData}
                                loading={blogLoading}
                                error={blogError}
                            />
                            <ContentPreviewCards
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