import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import RandomThoughtCard from '@/components/RandomThoughtCard';
import { getRandomThoughtThreadBySlug } from '@/lib/random-thoughts';
import { siteMetadata } from '@/utils/siteMetadata';

export const revalidate = 120;

type ThoughtPageProps = {
    params: Promise<{ slug: string }>;
};

const getThread = cache((slug: string) => getRandomThoughtThreadBySlug(slug));

function compactText(content: string, maximumLength: number): string {
    const text = content.replace(/\s+/g, ' ').trim();
    if (text.length <= maximumLength) return text;
    return `${text.slice(0, maximumLength - 1).trimEnd()}…`;
}

function firstPostLine(content: string): string {
    const line = content
        .split(/\r?\n/)
        .map((candidate) => candidate.trim())
        .find(Boolean) || 'A visual thought by prosamik';

    return compactText(line, 78);
}

function postHeadline(content: string, quotedContent?: string): string {
    if (content.trim()) return firstPostLine(content);
    if (quotedContent?.trim()) return compactText(`Quoted: ${firstPostLine(quotedContent)}`, 78);
    return 'A visual thought by prosamik';
}

function validTimeZone(timeZone: string): string {
    try {
        new Intl.DateTimeFormat('en-GB', { timeZone }).format();
        return timeZone;
    } catch {
        return 'UTC';
    }
}

function formatPostedAt(dateIso: string, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: validTimeZone(timeZone),
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(dateIso));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}`;
}

export async function generateMetadata({ params }: ThoughtPageProps): Promise<Metadata> {
    const { slug } = await params;
    const thought = (await getThread(slug))[0];
    if (!thought) return { title: 'Thought not found' };

    const headline = postHeadline(thought.content, thought.quotedThought?.content);
    const title = `${headline} - ${formatPostedAt(thought.createdAt, thought.createdTimeZone)}`;
    const description = compactText(thought.content || thought.quotedThought?.content || '', 158)
        || 'A random thought shared by prosamik.';
    const canonical = `/t/${thought.slug}`;
    const previewImage = thought.media.find((media) => media.type === 'image')?.url
        || (thought.quotedThought?.media?.type === 'image' ? thought.quotedThought.media.url : undefined);

    return {
        title,
        description,
        alternates: { canonical },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1,
            },
        },
        openGraph: {
            type: 'article',
            title,
            description,
            url: canonical,
            publishedTime: thought.createdAt,
            modifiedTime: thought.updatedAt,
            authors: [siteMetadata.siteUrl],
            images: previewImage ? [{ url: previewImage, alt: headline }] : [],
        },
        twitter: {
            card: previewImage ? 'summary_large_image' : 'summary',
            title,
            description,
            images: previewImage ? [previewImage] : [],
        },
    };
}

export default async function ThoughtPage({ params }: ThoughtPageProps) {
    const { slug } = await params;
    const thread = await getThread(slug);
    const thought = thread[0];
    if (!thought) notFound();

    const description = compactText(thought.content || thought.quotedThought?.content || '', 158)
        || 'A random thought shared by prosamik.';
    const quotedImage = thought.quotedThought?.media?.type === 'image'
        ? thought.quotedThought.media.url
        : null;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: postHeadline(thought.content, thought.quotedThought?.content),
        description,
        datePublished: thought.createdAt,
        dateModified: thought.updatedAt,
        url: `${siteMetadata.siteUrl}/t/${thought.slug}`,
        author: {
            '@type': 'Person',
            name: 'Samik Choudhury',
            url: siteMetadata.siteUrl,
        },
        image: [
            ...thought.media.filter((media) => media.type === 'image').map((media) => media.url),
            ...(quotedImage ? [quotedImage] : []),
        ],
        ...(thought.quotedThought ? {
            isBasedOn: `${siteMetadata.siteUrl}/t/${thought.quotedThought.slug}`,
        } : {}),
    };

    return (
        <main className="mx-auto w-full max-w-[720px] px-4 py-10 sm:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <section aria-label="Quoted post history" className="relative">
                {thread.length > 1 ? (
                    <span
                        aria-hidden="true"
                        className="absolute bottom-8 left-[11px] top-8 w-0.5 bg-gradient-to-b from-stone-950 via-stone-400 to-stone-200 sm:left-[15px]"
                    />
                ) : null}

                <div className="space-y-6">
                    {thread.map((threadThought, index) => (
                        <article
                            key={threadThought.id}
                            className={thread.length > 1 ? 'relative pl-8 sm:pl-11' : undefined}
                        >
                            {thread.length > 1 ? (
                                <span
                                    aria-hidden="true"
                                    className={`absolute left-1 top-8 z-10 h-4 w-4 rounded-full border-2 ring-4 ring-white sm:left-2 ${
                                        index === 0
                                            ? 'border-stone-950 bg-stone-950'
                                            : 'border-stone-400 bg-white'
                                    }`}
                                />
                            ) : null}

                            <div className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_14px_45px_rgba(28,25,23,0.06)]">
                                <RandomThoughtCard thought={threadThought} showQuotedPreview={false} />
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
