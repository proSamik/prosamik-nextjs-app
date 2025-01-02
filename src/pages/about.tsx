import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from "@/components/layout/Footer";
import ProfileHeader from "@/components/ProfileHeader";
import PersonalStory from '@/components/PersonalStory';
import Timeline from "@/components/Timeline";
import Skills from '@/components/Skills';
import CallToAction from "@/components/layout/CallToAction";
import CustomBackButton from "@/components/layout/CustomBackButton"
import CustomNextButton from "@/components/layout/CustomNextButton";
import {usePageAnalytics} from "@/hooks/usePageAnalytics";
import SEO from "@/components/layout/SEO";
import {useTimelineData} from "@/hooks/useTimelineData";

export default function About() {
    const [isMobile, setIsMobile] = useState(false);

    const { trackPageView } = usePageAnalytics();

    const { timelineData } = useTimelineData();

    // Generate JSON-LD data from timelineData
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Samik",
        "jobTitle": "DevOps Engineer",
        "alumniOf": [
            {
                "@type": "Organization",
                "name": "Army Institute of Technology, Pune",
                "startDate": "2020",
                "endDate": "2024"
            },
            {
                "@type": "Organization",
                "name": "rtCamp",
                "url": "https://rtcamp.com",
                "startDate": "2023"
            }
        ],
        "memberOf": [
            {
                "@type": "Organization",
                "name": "Google Developer Student Clubs",
                "url": "https://developers.google.com/community/gdsc"
            },
            {
                "@type": "Organization",
                "name": "WordPress Community",
                "url": "https://wordpress.org"
            }
        ],
        "knowsAbout": timelineData.flatMap(period =>
            period.events.flatMap(event =>
                event.skills.map(skill => skill.replace('#', ''))
            )
        ),
        "hasOccupation": timelineData.map(period => ({
            "@type": "Occupation",
            "name": period.events[0].title.split('@')[0].trim(),
            "startDate": period.yearRange.start,
            "endDate": period.yearRange.end,
            "description": period.events[0].description
        }))
    };

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

    return (
        <>
            <SEO
                title="About Samik | Journey and Experience"
                description="DevOps Engineer with expertise in AWS, Terraform, and Cloud Infrastructure.
                 Led tech communities, contributed to WordPress Core, and specialized in automation.
                 Experience ranges from Web Development to Cloud Architecture spanning 2017-present."
                ogImage="https://prosamik.com/image/og-Image.png"
                structuredData={jsonLd}  // Now we can pass JSON-LD directly to SEO component
            />
        <div
            className={`flex flex-col ${
                isMobile ? '' : 'min-h-screen'
            } md:flex-row`}
        >
            <div
                className={`${
                    isMobile ? '' : 'md:w-48 flex-shrink-0'
                }`}
            >
                <Navigation />
            </div>

            <main
                className={`w-full mx-auto px-4 py-4 ${
                    isMobile ? '' : 'flex-grow'
                }`}
                style={{
                    marginTop: isMobile ? '60px' : '',
                    marginBottom: isMobile ? '80px' : '',
                }}
            >
                {isMobile && (
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomNextButton />
                    </div>
                )}

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

            {!isMobile && (
                <div className="hidden md:block md:w-48 flex-shrink-0" />
            )}

            <Footer />
        </div>
        </>
    );

}