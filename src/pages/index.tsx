import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import CallToAction from '@/components/layout/CallToAction';
import CustomBackButton from "@/components/layout/CustomBackButton";
import CustomNextButton from "@/components/layout/CustomNextButton";
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import ContentPreviewCards from "@/components/ContentPreviewCards";
import { useContentList } from "@/hooks/useContentList";
import HeroSection from "@/components/HeroSection";

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);
    const { trackPageView } = usePageAnalytics();
    const { data: blogData, error: blogError, loading: blogLoading } = useContentList({ type: 'blog' });
    const { data: projectData, error: projectError, loading: projectLoading } = useContentList({ type: 'project' });

    // Refs for sections
    const buildsRef = useRef<HTMLDivElement>(null);
    const logsRef = useRef<HTMLDivElement>(null);

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

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Layout classes
    const layoutClasses = {
        container: `min-h-screen flex flex-col`,
        mainWrapper: `flex-grow flex flex-col md:flex-row`,
        main: `flex-grow w-full mx-auto px-4 py-4 ${isMobile ? 'mt-[60px] mb-[80px]' : ''}`,
        contentWrapper: `space-y-12`,
        previewCardsContainer: `${!isMobile ? 'grid grid-cols-2 gap-8' : 'flex flex-col space-y-4'}`,
        callToActionWrapper: `w-full flex justify-center`,
        callToActionInner: `w-full max-w-[728px]`,
        rightSpacer: `hidden md:block md:w-20 flex-shrink-0`,
        section: `scroll-mt-20 ${!isMobile ? 'flex-1' : ''}`,
    };

    return (
        <>
            <Head>
                <title>proSamik</title>
                <meta name="description" content="Monitor your latest builds and access build logs in real-time. Streamline your DevOps workflow with our comprehensive dashboard." />
                <meta name="keywords" content="devops, builds, logs, monitoring, dashboard" />
            </Head>

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
                            <HeroSection
                                isMobile={isMobile}
                                onBuildsClick={() => scrollToSection(buildsRef)}
                                onLogsClick={() => scrollToSection(logsRef)}
                            />

                            <div className={layoutClasses.previewCardsContainer}>
                                <div ref={buildsRef} className={layoutClasses.section}>
                                    <ContentPreviewCards
                                        isMobile={isMobile}
                                        type="blog"
                                        data={blogData}
                                        loading={blogLoading}
                                        error={blogError}
                                    />
                                </div>

                                <div ref={logsRef} className={layoutClasses.section}>
                                    <ContentPreviewCards
                                        isMobile={isMobile}
                                        type="project"
                                        data={projectData}
                                        loading={projectLoading}
                                        error={projectError}
                                    />
                                </div>
                            </div>

                            <div className={layoutClasses.callToActionWrapper}>
                                <div className={layoutClasses.callToActionInner}>
                                    <CallToAction/>
                                </div>
                            </div>
                        </div>
                    </main>

                    {!isMobile && <div className={layoutClasses.rightSpacer}/>}
                </div>

                <Footer/>
            </div>
        </>
    );
}