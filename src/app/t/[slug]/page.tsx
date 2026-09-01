import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import RandomThoughtCard from '@/components/RandomThoughtCard';
import { getRandomThoughtBySlug } from '@/lib/random-thoughts';
import { siteMetadata } from '@/utils/siteMetadata';

export const revalidate = 120;

type ThoughtPageProps = {
    params: Promise<{ slug: string }>;
};

const getThought = cache((slug: string) => getRandomThoughtBySlug(slug));

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
    const thought = await getThought(slug);
    if (!thought) return { title: 'Thought not found' };

    const headline = firstPostLine(thought.content);
    const title = `${headline} - ${formatPostedAt(thought.createdAt, thought.createdTimeZone)}`;
    const description = compactText(thought.content, 158) || 'A random thought shared by prosamik.';
    const canonical = `/t/${thought.slug}`;
    const previewImage = thought.media.find((media) => media.type === 'image')?.url;

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
    const thought = await getThought(slug);
    if (!thought) notFound();

    const description = compactText(thought.content, 158) || 'A random thought shared by prosamik.';
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: firstPostLine(thought.content),
        description,
        datePublished: thought.createdAt,
        dateModified: thought.updatedAt,
        url: `${siteMetadata.siteUrl}/t/${thought.slug}`,
        author: {
            '@type': 'Person',
            name: 'Samik Choudhury',
            url: siteMetadata.siteUrl,
        },
        image: thought.media.filter((media) => media.type === 'image').map((media) => media.url),
    };

    return (
        <main className="mx-auto w-full max-w-[680px] px-4 py-10 sm:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_14px_45px_rgba(28,25,23,0.06)]">
                <RandomThoughtCard thought={thought} />
            </div>
        </main>
    );
}
