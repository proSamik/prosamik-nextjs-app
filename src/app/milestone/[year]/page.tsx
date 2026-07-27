import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
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
    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${period.yearRange.start}–${period.yearRange.end} Milestones`,
        description: period.yearRange.description,
        url: pageUrl,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: period.events.map((event, index) => ({
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

            <Link href="/about" className="text-sm text-blue-600 hover:underline">
                ← Back to all years
            </Link>

            <header className="mt-8 border-b border-gray-200 pb-8 text-center">
                <p className="mb-3 font-medium text-blue-600">My Proud Moments</p>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {period.yearRange.start} – {period.yearRange.end}
                </h1>
                {period.yearRange.description && (
                    <p className="mt-4 text-lg text-gray-600">{period.yearRange.description}</p>
                )}
            </header>

            <section className="space-y-4 py-10" aria-label="Milestones">
                {period.events.map((event) => {
                    const milestoneSlug = getMilestoneSlug(event.title);

                    return (
                        <Link
                            key={milestoneSlug}
                            href={`/milestone/${period.year}/${milestoneSlug}`}
                            className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                        >
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
                    );
                })}
            </section>
        </main>
    );
}
