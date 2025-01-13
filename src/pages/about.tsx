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
    const timelineData = dataTimelineData;

    // Using PersonalProfile instead of an Event type to better represent professional history
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "dateModified": new Date().toISOString(),
        "mainEntity": {
            "@type": "Person",
            "name": "Samik",
            "givenName": "Samik",
            "familyName": "Choudhury",
            "jobTitle": "Product Developer",
            "url": "https://prosamik.com",
            "image": "https://prosamik.com/image/og-Image.png",
            "description": "Building products that ship faster and saves your time and efforts. Engineer by degree, innovator from heart",
            "alumniOf": [
                {
                    "@type": "CollegeOrUniversity",
                    "name": "Army Institute of Technology, Pune",
                    "url": "https://aitpune.edu.in",
                    "startDate": "2020",
                    "endDate": "2024"
                }
            ],
            "worksFor": [
                {
                    "@type": "Organization",
                    "name": "proSamik",
                    "url": "https://prosamik.com",
                    "startDate": "2025"
                }
            ],
            "memberOf": [
                {
                    "@type": "Organization",
                    "name": "Google Developer Student Clubs",
                    "url": "https://developers.google.com/community/gdsc"
                }
            ],
            "knowsAbout": timelineData.flatMap(period =>
                period.events.flatMap(event => [
                    ...event.skills.map(skill => ({
                        "@type": "DefinedTerm",
                        "name": skill.replace('#', ''),
                        "termCode": "TechnicalSkill"
                    })),
                    ...(event.soft_skills?.map(skill => ({
                        "@type": "DefinedTerm",
                        "name": skill.replace('#', ''),
                        "termCode": "SoftSkill"
                    })) || [])
                ])
            )
        }
    };

    return (
        <>
            <SEO
                title="Who is Samik?"
                description="Hey, I'm Samik Choudhury and by degree, I'm an Electronics and Telecommunication Engineer but I'm all about turning curiosity into code and understanding software products."
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
                    imageAlt: 'Samik | Journey and Experience',
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