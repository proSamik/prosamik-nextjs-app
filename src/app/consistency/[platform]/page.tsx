import type { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import ConsistencyGraph from '@/components/ConsistencyGraph';
import ShareConsistencyCard from '@/components/ShareConsistencyCard';
import YouTubeConsistency from '@/components/YouTubeConsistency';
import {
    emptyGitHubConsistencyData,
    emptyYouTubeConsistencyData,
} from '@/lib/consistencyFallbacks';
import type { StreakRange } from '@/lib/githubContributions';
import { getConsistencyData } from '@/lib/githubContributions';
import { getYouTubeConsistencyData } from '@/lib/youtubeConsistency';
import { siteMetadata } from '@/utils/siteMetadata';

interface PlatformConsistencyPageProps {
    params: Promise<{ platform: string }>;
}

const platforms = ['github', 'youtube'] as const;
type Platform = (typeof platforms)[number];

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PlatformConsistencyPageProps): Promise<Metadata> {
    const { platform } = await params;
    if (!platforms.includes(platform as Platform)) return { title: 'Consistency Platform Not Found' };

    const isGitHub = platform === 'github';
    const name = isGitHub ? 'GitHub' : 'YouTube';
    const title = `My ${name} Consistency`;
    const description = isGitHub
        ? 'Samik’s GitHub contribution streak, contribution history, and yearly activity calendar.'
        : 'Samik’s YouTube publishing streaks for Shorts and long-form videos, with yearly upload calendars.';

    return {
        title,
        description,
        alternates: { canonical: `/consistency/${platform}` },
        openGraph: {
            type: 'website',
            url: `/consistency/${platform}`,
            title,
            description,
        },
    };
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

function formatDate(date: string | null) {
    if (!date) return null;
    return DATE_FORMATTER.format(new Date(`${date}T00:00:00.000Z`));
}

function formatStreakRange(streak: StreakRange) {
    const start = formatDate(streak.start);
    const end = formatDate(streak.end);
    if (!start || !end) return 'No active streak';
    return start === end ? start : `${start} - ${end}`;
}

async function GitHubConsistencyPage() {
    let data = emptyGitHubConsistencyData;
    try {
        data = await getConsistencyData();
    } catch (error) {
        console.error('Unable to render GitHub consistency data:', error);
    }

    const { stats } = data;
    const today = new Date().toISOString().slice(0, 10);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: 'Samik’s GitHub Contribution Streak',
        url: `${siteMetadata.siteUrl}/consistency/github`,
        mainEntity: {
            '@type': 'Person',
            name: siteMetadata.creator,
            url: siteMetadata.siteUrl,
            sameAs: `https://github.com/${data.username}`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <header className="mx-auto mt-8 max-w-3xl text-center">
                <a
                    href={`https://github.com/${data.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                    <FaGithub className="h-4 w-4" />
                    github.com/{data.username}
                </a>
                <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">My GitHub Consistency</h1>
                <p className="mt-4 text-sm font-medium text-gray-500">
                    Timezone - UTC
                </p>
            </header>

            <section className="relative mx-auto my-10 grid max-w-4xl grid-cols-3 rounded-xl border border-gray-200 bg-white shadow-sm">
                <ShareConsistencyCard platform="github" card="streak" />
                <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                    <strong className="text-2xl font-bold sm:text-3xl">{stats.totalContributions.toLocaleString('en-US')}</strong>
                    <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Total Contributions</span>
                    <span className="mt-2 text-[10px] text-gray-500 sm:mt-3 sm:text-sm">
                        {stats.firstContributionDate ? `${formatDate(stats.firstContributionDate)} - Present` : 'Waiting for first sync'}
                    </span>
                </div>

                <div className="flex min-h-36 flex-col items-center justify-center border-x border-gray-200 px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-orange-500 sm:h-24 sm:w-24 sm:border-[5px]">
                        <Flame className="absolute -top-4 h-6 w-6 fill-orange-500 text-orange-500 sm:-top-5 sm:h-8 sm:w-8" />
                        <strong className="text-2xl font-bold sm:text-3xl">{stats.currentStreak.length}</strong>
                    </div>
                    <span className="mt-2 text-xs font-semibold text-orange-600 sm:mt-3 sm:text-base">Current Streak</span>
                    <span className="mt-1 text-[10px] text-gray-500 sm:mt-2 sm:text-sm">
                        {stats.currentStreak.length > 0 ? formatStreakRange(stats.currentStreak) : formatDate(today)}
                    </span>
                </div>

                <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                    <strong className="text-2xl font-bold sm:text-3xl">{stats.longestStreak.length}</strong>
                    <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Longest Streak</span>
                    <span className="mt-2 text-[10px] text-gray-500 sm:mt-3 sm:text-sm">{formatStreakRange(stats.longestStreak)}</span>
                </div>
            </section>

            <ConsistencyGraph days={data.days} shareable />
            {data.syncedAt && (
                <p className="mt-4 text-right text-xs text-gray-500">
                    Last synced {new Date(data.syncedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                </p>
            )}
        </>
    );
}

async function YouTubePlatformPage() {
    let data = emptyYouTubeConsistencyData;
    try {
        data = await getYouTubeConsistencyData();
    } catch (error) {
        console.error('Unable to render YouTube consistency data:', error);
    }

    return (
        <>
            <YouTubeConsistency data={data} standalone />
            {data.syncedAt && (
                <p className="mt-4 text-right text-xs text-gray-500">
                    Last synced {new Date(data.syncedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                </p>
            )}
        </>
    );
}

export default async function PlatformConsistencyPage({ params }: PlatformConsistencyPageProps) {
    const { platform } = await params;
    if (!platforms.includes(platform as Platform)) notFound();

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <Breadcrumbs items={[
                { label: 'Efforts', href: '/consistency' },
                { label: platform === 'github' ? 'GitHub' : 'YouTube' },
            ]} />
            {platform === 'github' ? <GitHubConsistencyPage /> : <YouTubePlatformPage />}
        </main>
    );
}
