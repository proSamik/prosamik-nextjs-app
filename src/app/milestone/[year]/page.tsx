import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
                url: `${pageUrl}/${getMilestoneSlug(event.title)}`,
            })),
        },
    };

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
            />

            <Breadcrumbs items={[
                { label: 'About', href: '/about' },
                { label: `${period.yearRange.start}-${period.yearRange.end}` },
            ]} />

            <header className="mt-8 border-b border-gray-200 pb-8 text-center">
                <p className="mb-3 font-medium text-blue-600">My Proud Moments</p>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {period.yearRange.start} – {period.yearRange.end}
                </h1>
                {period.yearRange.description && (
                    <p className="mt-4 text-lg text-gray-600">{period.yearRange.description}</p>
                )}
            </header>

            <section className="relative mx-auto max-w-2xl py-10" aria-label="Milestones">
                <div
                    aria-hidden="true"
                    className="milestone-timeline-line absolute bottom-16 left-[15px] top-16 w-0.5 bg-gradient-to-t from-blue-600 to-blue-200"
                />

                <div className="space-y-8">
                {orderedEvents.map((event, index) => {
                    const milestoneSlug = getMilestoneSlug(event.title);
                    const revealDelay = (orderedEvents.length - index - 1) * 140 + 250;

                    return (
                        <article
                            key={milestoneSlug}
                            className="milestone-timeline-item relative pl-12"
                            style={{ animationDelay: `${revealDelay}ms` }}
                        >
                            <span
                                aria-hidden="true"
                                className="absolute left-2 top-7 z-10 h-4 w-4 rounded-full border-2 border-blue-600 bg-blue-600 ring-4 ring-white"
                            />
                            <span
                                aria-hidden="true"
                                className="absolute left-6 top-[35px] h-0.5 w-6 bg-blue-500"
                            />
                            <Link
                                href={`/milestone/${period.year}/${milestoneSlug}`}
                                className={`group block rounded-xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md ${
                                    index === 0 ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'
                                }`}
                            >
                                {index === 0 && (
                                    <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                                        Latest
                                    </span>
                                )}
                                <div className="flex items-start justify-between gap-4">
                                    <h2 className="text-xl font-semibold">{event.title}</h2>
                                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {event.skills.map((skill) => (
                                        <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </Link>
                        </article>
                    );
                })}
                </div>
            </section>
        </main>
    );
}
