// pages/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import CallToAction from '@/components/layout/CallToAction';
import ContentPreviewCards from "@/components/ContentPreviewCards";
import { useContentList } from "@/hooks/useContentList";
import HeroSection from "@/components/HeroSection";
import { siteMetadata } from "@/utils/siteMetadata";
import SEO from "@/components/layout/SEO";

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);
    const { data: blogData, error: blogError, loading: blogLoading } = useContentList({ type: 'blog' });
    const { data: projectData, error: projectError, loading: projectLoading } = useContentList({ type: 'project' });

    // Refs for sections
    const buildsRef = useRef<HTMLDivElement>(null);
    const logsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        // Initial check
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            <SEO
                title="Samik's Builder Toolkit"
                description={siteMetadata.defaultDescription}
                ogImage={siteMetadata.defaultImage}
                openGraph={{
                    type: 'website',
                    siteName: siteMetadata.title,
                    locale: 'en_US',
                }}
                twitter={{
                    cardType: 'summary_large_image',
                    site: siteMetadata.twitterUsername,
                    creator: siteMetadata.twitterUsername,
                    imageAlt: siteMetadata.ogImageAlt,
                }}
            />

            <div className="space-y-12">
                <HeroSection
                    isMobile={isMobile}
                    onBuildsClick={() => scrollToSection(buildsRef)}
                    onLogsClick={() => scrollToSection(logsRef)}
                />

                <div className={isMobile ? 'flex flex-col space-y-4' : 'grid grid-cols-2 gap-8'}>
                    <div ref={buildsRef} className="scroll-mt-20 flex-1">
                        <ContentPreviewCards
                            isMobile={isMobile}
                            type="blog"
                            data={blogData}
                            loading={blogLoading}
                            error={blogError}
                        />
                    </div>

                    <div ref={logsRef} className="scroll-mt-20 flex-1">
                        <ContentPreviewCards
                            isMobile={isMobile}
                            type="project"
                            data={projectData}
                            loading={projectLoading}
                            error={projectError}
                        />
                    </div>
                </div>

                <div className="w-full flex justify-center">
                    <div className="w-full max-w-[728px]">
                        <CallToAction/>
                    </div>
                </div>
            </div>
        </>
    );
}