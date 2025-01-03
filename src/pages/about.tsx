// pages/about.tsx
import React from 'react';
import ProfileHeader from "@/components/ProfileHeader";
import PersonalStory from '@/components/PersonalStory';
import Timeline from "@/components/Timeline";
import Skills from '@/components/Skills';
import CallToAction from "@/components/layout/CallToAction";
import SEO from "@/components/layout/SEO";
import { siteMetadata } from "@/utils/siteMetadata";
import {dataTimelineData} from "@/utils/dataTimelineData";

export default function About() {
    const timelineData  = dataTimelineData;

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

    return (
        <>
            <SEO
                title="Who is Samik?"
                description="Building products that ship faster and saves your time and efforts. Engineer by degree, innovator from heart"
                ogImage="https://prosamik.com/image/og-Image.png"
                keywords={'prosamik, army institute of technology pune, google developer student club, gdsc, ait, aitpune, ecell, Innovation and Entrepreneurship Cell'}
                structuredData={jsonLd}
                openGraph={{
                    type: 'profile',
                    profile: {
                        firstName: 'Samik',
                        lastName: 'Choudhury',
                        username: 'prosamik',
                    },
                }}
                twitter={{
                    cardType: 'summary_large_image',
                    site: siteMetadata.twitterUsername,
                    creator: siteMetadata.twitterUsername,
                    imageAlt: 'About Samik | Journey and Experience',
                }}
            />

            <div className="w-full flex flex-col items-center">
                <div className="w-full max-w-[800px] space-y-8">
                    <ProfileHeader />
                    <PersonalStory />
                    <Timeline timelineData={timelineData} />
                    <Skills />
                    <CallToAction />
                </div>
            </div>
        </>
    );
}