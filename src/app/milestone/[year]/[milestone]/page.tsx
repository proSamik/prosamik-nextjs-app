import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getMilestone, milestones } from '@/utils/milestones';
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

    const description = item.event.description
        .replace(/^[-\s]+/, '')
        .split('\n')[0]
        .slice(0, 160);

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
        description: descriptionLines[0]?.text,
        url: `${siteMetadata.siteUrl}/milestone/${item.year}/${item.slug}`,
        author: {
            '@type': 'Person',
            name: siteMetadata.creator,
            url: siteMetadata.siteUrl,
        },
        keywords: [...item.event.skills, ...(item.event.soft_skills || [])].join(', '),
    };

    return (
        <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(milestoneJsonLd) }}
            />

            <Breadcrumbs items={[
                { label: 'About', href: '/about' },
                {
                    label: `${item.yearRange.start}-${item.yearRange.end}`,
                    href: `/milestone/${item.year}`,
                },
                { label: item.event.title },
            ]} />

            <header className="mt-8 space-y-4 border-b border-gray-200 pb-8">
                <p className="font-medium text-blue-600">
                    {item.yearRange.start} – {item.yearRange.end}
                </p>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{item.event.title}</h1>
                {item.yearRange.description && (
                    <p className="text-lg text-gray-600">{item.yearRange.description}</p>
                )}
            </header>

            <section className="py-10">
                <h2 className="mb-5 text-2xl font-bold">The Milestone</h2>
                <ul className="space-y-4 text-gray-700">
                    {descriptionLines.map(({ nested, text }, index) => (
                        <li key={`${index}-${text}`} className={`leading-7 ${nested ? 'ml-8 [list-style-type:circle]' : 'ml-5 list-disc'}`}>
                            {text}
                        </li>
                    ))}
                </ul>
            </section>

            <section className="space-y-6 border-t border-gray-200 pt-8">
                <div>
                    <h2 className="mb-3 text-xl font-bold">Skills</h2>
                    <div className="flex flex-wrap gap-2">
                        {item.event.skills.map((skill) => (
                            <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>

                {item.event.soft_skills && item.event.soft_skills.length > 0 && (
                    <div>
                        <h2 className="mb-3 text-xl font-bold">Soft Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {item.event.soft_skills.map((skill) => (
                                <span key={skill} className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </article>
    );
}
