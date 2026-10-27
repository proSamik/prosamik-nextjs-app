import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Notebook } from '@/components/portfolio/Visuals';
import { milestoneYears } from '@/utils/milestones';
import { dataTimelineData } from '@/utils/dataTimelineData';
import { siteMetadata } from '@/utils/siteMetadata';

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
    return <article className="portfolio-page page-width">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileJsonLd) }} />
        <header className="about-intro"><div><h1>A work<br />in progress.</h1><p>The choices, detours,<br />and things I learned.</p></div><Notebook eager /></header>
        <div className="about-bio"><p>I’m Samik Choudhury. I studied Electronics and Telecommunication Engineering, but curiosity led me to software. I started my independent journey on 17 December 2024.</p><p>I’m still figuring out how to make a living from the things I build. I enjoy making educational content and sharing what I’ve learned. These are the chapters along the way.</p></div>
        <div className="journey-periods">{milestoneYears.map(period => <Link className="journey-period" key={period.year} href={`/milestone/${period.year}`}><span className="journey-period-time">{period.yearRange.start} — {period.yearRange.end}</span><div><h2>{period.yearRange.description || 'A chapter in the journey'}</h2><p>{period.events.length} moments, lessons, and projects</p></div><ArrowUpRight size={22} /></Link>)}</div>
        <div className="journal-links"><Link href="/consistency">The everyday effort <ArrowUpRight size={18} /></Link></div>
    </article>;
}
