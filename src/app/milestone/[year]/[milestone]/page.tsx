import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Notebook } from '@/components/portfolio/Visuals';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getMilestone, milestones } from '@/utils/milestones';
import { getMilestoneSummary } from '@/utils/milestoneSummaries';
import { siteMetadata } from '@/utils/siteMetadata';

interface MilestonePageProps {
    params: Promise<{ year: string; milestone: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
    return milestones.map(({ year, slug }) => ({ year, milestone: slug }));
}

export async function generateMetadata({ params }: MilestonePageProps): Promise<Metadata> {
    const { year, milestone } = await params;
    const item = getMilestone(year, milestone);

    if (!item) return { title: 'Milestone Not Found' };

    const description = getMilestoneSummary(item.event);

    return {
        title: `${item.event.title} — Samik's Milestone`,
        description,
        keywords: [...item.event.skills, ...(item.event.soft_skills || [])].map((skill) => skill.replace('#', '')),
        alternates: { canonical: `/milestone/${item.year}/${item.slug}` },
        openGraph: {
            type: 'article',
            url: `/milestone/${item.year}/${item.slug}`,
            title: item.event.title,
            description,
        },
        twitter: {
            card: 'summary_large_image',
            title: item.event.title,
            description,
        },
    };
}

export default async function MilestonePage({ params }: MilestonePageProps) {
    const { year, milestone } = await params;
    const item = getMilestone(year, milestone);

    if (!item) notFound();

    const summary = getMilestoneSummary(item.event);

    const descriptionLines = item.event.description
        .split('\n')
        .map((line) => ({
            nested: line.startsWith('\t'),
            text: line.trim().replace(/^-\s*/, ''),
        }))
        .filter(({ text }) => text.length > 0);

    const milestoneJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: item.event.title,
        description: summary,
        url: `${siteMetadata.siteUrl}/milestone/${item.year}/${item.slug}`,
        author: {
            '@type': 'Person',
            name: siteMetadata.creator,
            url: siteMetadata.siteUrl,
        },
        keywords: [...item.event.skills, ...(item.event.soft_skills || [])].join(', '),
    };

    const related = milestones.filter(other => other.year === item.year);
    const next = related[related.findIndex(other => other.slug === item.slug) + 1];
    return <article className="portfolio-page page-width">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(milestoneJsonLd) }} />
        <Breadcrumbs items={[{ label: 'Journey', href: '/about' }, { label: `${item.yearRange.start} — ${item.yearRange.end}`, href: `/milestone/${item.year}` }, { label: item.event.title }]} />
        <header className="chapter-hero"><div><span className="period-date">{item.yearRange.start} — {item.yearRange.end}</span><h1>{item.event.title}</h1><p>{summary}</p><div className="chapter-author"><Image src="/me-here.jpg" alt="" width={36} height={36} />Samik Choudhury</div></div><Notebook eager /></header>
        <div className="chapter-prose">{descriptionLines.map(({ nested, text }, index) => <p key={index} className={nested ? 'nested' : undefined}>{text}</p>)}<div className="skills-list" aria-label="Skills and lessons">{[...item.event.skills, ...(item.event.soft_skills || [])].map(skill => <span key={skill}>{skill.replace('#', '').replace(/([a-z])([A-Z])/g, '$1 $2')}</span>)}</div></div>
        <nav className="chapter-nav" aria-label="More chapters"><Link href={`/milestone/${item.year}`}>← Back to this period</Link>{next && <Link href={`/milestone/${next.year}/${next.slug}`}>Next chapter →</Link>}</nav>
    </article>;
}
