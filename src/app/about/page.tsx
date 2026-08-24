import type { Metadata } from 'next';
import ProfileHeader from '@/components/ProfileHeader';
import PersonalStory from '@/components/PersonalStory';
import Timeline from '@/components/Timeline';
import { dataTimelineData } from '@/utils/dataTimelineData';
import { siteMetadata } from '@/utils/siteMetadata';
import Link from 'next/link';

const description = "Hey, I'm Samik Choudhury and by degree, I'm an Electronics and Telecommunication Engineer but I'm all about turning curiosity into code and understanding software products.";

export const metadata: Metadata = {
    title: 'Who is Samik?',
    description,
    keywords: ['prosamik', 'Army Institute of Technology Pune', 'Google Developer Student Club', 'GDSC', 'AIT Pune'],
    alternates: { canonical: '/about' },
    openGraph: {
        type: 'profile',
        url: '/about',
        title: 'Who is Samik?',
        description,
        images: [{
            url: siteMetadata.defaultImage,
            width: siteMetadata.ogImageWidth,
            height: siteMetadata.ogImageHeight,
            alt: 'Samik | Journey and Experience',
        }],
    },
    twitter: {
        card: 'summary_large_image',
        site: `@${siteMetadata.twitterUsername}`,
        creator: `@${siteMetadata.twitterUsername}`,
        title: 'Who is Samik?',
        description,
        images: [{ url: siteMetadata.defaultImage, alt: 'Samik | Journey and Experience' }],
    },
};

const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
        '@type': 'Person',
        name: 'Samik Choudhury',
        givenName: 'Samik',
        familyName: 'Choudhury',
        jobTitle: 'Product Developer',
        url: siteMetadata.siteUrl,
        image: siteMetadata.defaultImage,
        description,
        alumniOf: [{
            '@type': 'CollegeOrUniversity',
            name: 'Army Institute of Technology, Pune',
            url: 'https://aitpune.edu.in',
            startDate: '2020',
            endDate: '2024',
        }],
        worksFor: [{
            '@type': 'Organization',
            name: 'proSamik',
            url: siteMetadata.siteUrl,
            startDate: '2025',
        }],
        memberOf: [{
            '@type': 'Organization',
            name: 'Google Developer Student Clubs',
            url: 'https://developers.google.com/community/gdsc',
        }],
        knowsAbout: dataTimelineData.flatMap((period) =>
            period.events.flatMap((event) => [
                ...event.skills.map((skill) => ({
                    '@type': 'DefinedTerm',
                    name: skill.replace('#', ''),
                    termCode: 'TechnicalSkill',
                })),
                ...(event.soft_skills?.map((skill) => ({
                    '@type': 'DefinedTerm',
                    name: skill.replace('#', ''),
                    termCode: 'SoftSkill',
                })) || []),
            ])
        ),
    },
};

export default function About() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }}
            />
            <div className="flex w-full flex-col items-center">
                <div className="w-full max-w-[800px] space-y-8">
                    <ProfileHeader />
                    <PersonalStory />
                    <p className="text-sm leading-6 text-gray-700">
                        I also keep a quiet corner for the unfiltered things on my mind.
                        {' '}
                        <Link className="font-semibold text-blue-600 underline underline-offset-4" href="/random-thoughts">
                            Read my random thoughts
                        </Link>
                        .
                    </p>
                    <Timeline timelineData={dataTimelineData} />
                </div>
            </div>
        </>
    );
}
