import React, { useState, useEffect } from 'react';
import HeroSection from "@/components/HeroSection";
import { siteMetadata } from "@/utils/siteMetadata";
import SEO from "@/components/layout/SEO";

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);

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
                <HeroSection isMobile={isMobile} />
            </div>
        </>
    );
}
