import type { Metadata } from 'next';
import ConsistencyStreakCard from '@/components/ConsistencyStreakCard';
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

            <div className="mx-auto my-10 max-w-4xl"><ConsistencyStreakCard total={stats.totalContributions} current={stats.currentStreak.length} longest={stats.longestStreak.length} totalRange={stats.firstContributionDate ? `${formatDate(stats.firstContributionDate)} - Present` : 'Waiting for first sync'} currentRange={stats.currentStreak.length > 0 ? formatStreakRange(stats.currentStreak) : formatDate(today) ?? undefined} longestRange={formatStreakRange(stats.longestStreak)} share={<ShareConsistencyCard platform="github" card="streak" />} /></div>

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
