import type { Metadata } from 'next';
import { FaGithub, FaYoutube } from 'react-icons/fa';
import ConsistencySummaryCard, {
    formatConsistencyDate,
    formatConsistencyRange,
} from '@/components/ConsistencySummaryCard';
import {
    emptyGitHubConsistencyData,
    emptyYouTubeConsistencyData,
} from '@/lib/consistencyFallbacks';
import { getConsistencyData } from '@/lib/githubContributions';
import { getYouTubeConsistencyData } from '@/lib/youtubeConsistency';
import { siteMetadata } from '@/utils/siteMetadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'My Consistency Streaks',
    description: 'Samik’s GitHub contribution and YouTube publishing streaks, measured daily in UTC.',
    alternates: { canonical: '/consistency' },
    openGraph: {
        type: 'website',
        url: '/consistency',
        title: 'Samik’s Consistency Streaks',
        description: 'Explore Samik’s GitHub contribution and YouTube publishing consistency.',
    },
};

export default async function ConsistencyPage() {
    let githubData = emptyGitHubConsistencyData;
    let youtubeData = emptyYouTubeConsistencyData;
    const [githubResult, youtubeResult] = await Promise.allSettled([
        getConsistencyData(),
        getYouTubeConsistencyData(),
    ]);

    if (githubResult.status === 'fulfilled') githubData = githubResult.value;
    else console.error('Unable to render GitHub consistency data:', githubResult.reason);

    if (youtubeResult.status === 'fulfilled') youtubeData = youtubeResult.value;
    else console.error('Unable to render YouTube consistency data:', youtubeResult.reason);

    const githubStats = githubData.stats;
    const youtubeStats = youtubeData.overall;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Samik’s Consistency Streaks',
        url: `${siteMetadata.siteUrl}/consistency`,
        hasPart: [
            `${siteMetadata.siteUrl}/consistency/github`,
            `${siteMetadata.siteUrl}/consistency/youtube`,
        ],
    };

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <header className="mx-auto max-w-3xl text-center">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    My Contributions {':)'}
                </h1>
            </header>

            <section className="mt-10 space-y-8" aria-label="Consistency platforms">
                <ConsistencySummaryCard
                    href="/consistency/github"
                    name="GitHub"
                    description={`github.com/${githubData.username}`}
                    icon={<FaGithub className="h-6 w-6" />}
                    iconClassName="text-gray-900"
                    total={githubStats.totalContributions}
                    totalLabel="Total Contributions"
                    totalRange={githubStats.firstContributionDate
                        ? `${formatConsistencyDate(githubStats.firstContributionDate)} - Present`
                        : 'Waiting for first sync'}
                    currentStreak={githubStats.currentStreak}
                    longestStreak={githubStats.longestStreak}
                    accent="orange"
                />

                <ConsistencySummaryCard
                    href="/consistency/youtube"
                    name="YouTube"
                    description={`youtube.com/@${youtubeData.handle}`}
                    icon={<FaYoutube className="h-6 w-6" />}
                    iconClassName="text-red-600"
                    total={youtubeStats.totalUploads}
                    totalLabel="Total Uploads"
                    totalRange={formatConsistencyRange(
                        youtubeStats.firstUploadDate,
                        youtubeStats.lastUploadDate,
                        'Waiting for first sync'
                    )}
                    currentStreak={youtubeStats.currentStreak}
                    longestStreak={youtubeStats.longestStreak}
                    accent="red"
                />
            </section>
        </main>
    );
}
