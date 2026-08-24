import type { Metadata } from 'next';
import { listRandomThoughts } from '@/lib/random-thoughts';
import RandomThoughtCard from '@/components/RandomThoughtCard';

export const revalidate = 120;

export const metadata: Metadata = {
    title: 'Random Thoughts by prosamik',
    description:
        'Read random, unfiltered thoughts and updates shared by Samik Choudhury across tech, life, and reflection.',
    openGraph: {
        title: 'Random Thoughts by prosamik',
        description:
            'Read random, unfiltered thoughts and updates shared by Samik Choudhury across tech, life, and reflection.',
        type: 'website',
        url: '/random-thoughts',
    },
    twitter: {
        card: 'summary',
        title: 'Random Thoughts by prosamik',
        description:
            'Read random, unfiltered thoughts and updates shared by Samik Choudhury across tech, life, and reflection.',
    },
    alternates: {
        canonical: '/random-thoughts',
    },
    robots: {
        index: false,
        follow: true,
        googleBot: {
            index: false,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
};

export default async function RandomThoughtsPage() {
    const thoughts = await listRandomThoughts(50);

    return (
        <main className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-4 py-10 sm:py-14">
            <header className="border-b border-stone-200 pb-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d94722]">A quiet corner of the internet</p>
                <h1 className="text-4xl font-black tracking-[-0.04em] text-stone-950 sm:text-5xl">Random Thoughts</h1>
            </header>

            <div className="space-y-5">
                {thoughts.map((thought) => (
                    <div key={thought.id} className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_14px_45px_rgba(28,25,23,0.06)]">
                        <RandomThoughtCard thought={thought} />
                    </div>
                ))}
                {thoughts.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-stone-300 px-6 py-16 text-center text-sm text-stone-400">
                        Nothing shared here yet.
                    </div>
                ) : null}
            </div>
        </main>
    );
}
