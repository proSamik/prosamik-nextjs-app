import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CompactGraphCard, CompactStreakCard } from '@/components/CompactConsistencyCard';
import {
    emptyGitHubConsistencyData,
    emptyYouTubeConsistencyData,
} from '@/lib/consistencyFallbacks';
import {
    getCachedGitHubConsistencyData,
    getCachedYouTubeConsistencyData,
} from '@/lib/consistencyEmbed';
import {
    githubShareableData,
    youtubeShareableData,
    type ConsistencyCardKind,
    type ConsistencyPlatform,
} from '@/lib/consistencyCardData';

interface EmbedCardPageProps {
    params: Promise<{ platform: string; card: string }>;
}

export const metadata: Metadata = {
    title: 'Consistency card embed',
    robots: { index: false, follow: false },
};

function isPlatform(value: string): value is ConsistencyPlatform {
    return value === 'github' || value === 'youtube';
}

function isCard(value: string): value is ConsistencyCardKind {
    return value === 'graph' || value === 'streak';
}

export default async function EmbedCardPage({ params }: EmbedCardPageProps) {
    const { platform, card } = await params;
    if (!isPlatform(platform) || !isCard(card)) notFound();

    let data;
    if (platform === 'github') {
        try {
            data = githubShareableData(await getCachedGitHubConsistencyData());
        } catch (error) {
            console.error('Unable to render cached GitHub embed:', error);
            data = githubShareableData(emptyGitHubConsistencyData);
        }
    } else {
        try {
            data = youtubeShareableData(await getCachedYouTubeConsistencyData());
        } catch (error) {
            console.error('Unable to render cached YouTube embed:', error);
            data = youtubeShareableData(emptyYouTubeConsistencyData);
        }
    }

    return (
        <main
            data-embed
            className={`mx-auto w-full p-2 ${card === 'graph' ? 'max-w-[800px]' : 'max-w-[760px]'}`}
        >
            {card === 'graph' ? <CompactGraphCard data={data} /> : <CompactStreakCard data={data} />}
        </main>
    );
}
