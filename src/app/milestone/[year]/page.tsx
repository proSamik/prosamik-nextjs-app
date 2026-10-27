import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Notebook } from '@/components/portfolio/Visuals';
import { getMilestoneSummary } from '@/utils/milestoneSummaries';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getMilestoneSlug } from '@/utils/slugs';
import { getMilestoneYear, milestoneYears } from '@/utils/milestones';
import { siteMetadata } from '@/utils/siteMetadata';

interface MilestoneYearPageProps {
    params: Promise<{ year: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
    return milestoneYears.map(({ year }) => ({ year }));
}

export async function generateMetadata({ params }: MilestoneYearPageProps): Promise<Metadata> {
    const { year } = await params;
    const period = getMilestoneYear(year);

    if (!period) return { title: 'Milestones Not Found' };

    const title = `${period.yearRange.start}–${period.yearRange.end} Milestones`;
    const description = period.yearRange.description || `Samik's milestones from ${period.yearRange.start} to ${period.yearRange.end}.`;

    return {
        title,
        description,
        alternates: { canonical: `/milestone/${period.year}` },
        openGraph: {
            type: 'website',
            url: `/milestone/${period.year}`,
            title,
            description,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

export default async function MilestoneYearPage({ params }: MilestoneYearPageProps) {
    const { year } = await params;
    const period = getMilestoneYear(year);

    if (!period) notFound();

    const pageUrl = `${siteMetadata.siteUrl}/milestone/${period.year}`;
    const orderedEvents = [...period.events].reverse();
    const getEventUrl = (event: (typeof orderedEvents)[number]) =>
        event.projectSlug
            ? `${siteMetadata.siteUrl}/projects/${event.projectSlug}`
            : `${pageUrl}/${getMilestoneSlug(event.title)}`;
    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${period.yearRange.start}–${period.yearRange.end} Milestones`,
        description: period.yearRange.description,
        url: pageUrl,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: orderedEvents.map((event, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: event.title,
                url: getEventUrl(event),
            })),
        },
    };

    const periodIndex = milestoneYears.findIndex(item => item.year === period.year);
    const next = milestoneYears[periodIndex - 1];
    return <article className="portfolio-page page-width">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
        <Breadcrumbs items={[{ label: 'Journey', href: '/about' }, { label: `${period.yearRange.start} — ${period.yearRange.end}` }]} />
        <header className="period-intro"><div><h1>{period.year === 'july-24-dec-24' ? 'A change of direction.' : `${period.yearRange.start} — ${period.yearRange.end}`}</h1><span className="period-date">{period.yearRange.start} — {period.yearRange.end}</span><p>{period.yearRange.description}</p></div><Notebook eager /></header>
        <div className="period-list">{orderedEvents.map(event => <Link key={event.title} className="period-entry" href={event.projectSlug ? `/projects/${event.projectSlug}` : `/milestone/${period.year}/${getMilestoneSlug(event.title)}`}><div><h2>{event.title}</h2><p>{getMilestoneSummary(event)}</p></div><ArrowUpRight size={25} /></Link>)}</div>
        <nav className="chapter-nav" aria-label="Journey periods"><Link href="/about">← All periods</Link>{next && <Link href={`/milestone/${next.year}`}>Next period →</Link>}</nav>
    </article>;
}
