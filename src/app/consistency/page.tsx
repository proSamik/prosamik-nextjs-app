import type { Metadata } from 'next';
import { Flame, Github } from 'lucide-react';
import ConsistencyGraph from '@/components/ConsistencyGraph';
import YouTubeConsistency from '@/components/YouTubeConsistency';
import type { ConsistencyData, StreakRange } from '@/lib/githubContributions';
import { getConsistencyData } from '@/lib/githubContributions';
import type { YouTubeConsistencyData } from '@/lib/youtubeConsistency';
import { getYouTubeConsistencyData } from '@/lib/youtubeConsistency';
import { siteMetadata } from '@/utils/siteMetadata';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'GitHub Contribution Streak',
    description: 'Samik’s GitHub contribution streak, contribution history, and yearly activity calendar.',
    alternates: { canonical: '/consistency' },
    openGraph: {
        type: 'website',
        url: '/consistency',
        title: 'Samik’s GitHub Contribution Streak',
        description: 'A daily record of Samik’s public GitHub contributions and coding consistency.',
    },
};

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
    if (start === end) return start;
    return `${start} - ${end}`;
}

const emptyData: ConsistencyData = {
    username: 'proSamik',
    days: [],
    stats: {
        totalContributions: 0,
        firstContributionDate: null,
        currentStreak: { length: 0, start: null, end: null },
        longestStreak: { length: 0, start: null, end: null },
    },
    syncedAt: null,
};

const emptyYouTubeData: YouTubeConsistencyData = {
    handle: 'proSamik',
    channelTitle: 'proSamik',
    channelUrl: 'https://www.youtube.com/@proSamik',
    videos: [],
    overall: {
        totalUploads: 0,
        firstUploadDate: null,
        lastUploadDate: null,
        currentStreak: { length: 0, start: null, end: null },
        longestStreak: { length: 0, start: null, end: null },
    },
    shorts: {
        totalUploads: 0,
        firstUploadDate: null,
        lastUploadDate: null,
        currentStreak: { length: 0, start: null, end: null },
        longestStreak: { length: 0, start: null, end: null },
    },
    longForm: {
        totalUploads: 0,
        firstUploadDate: null,
        lastUploadDate: null,
        currentStreak: { length: 0, start: null, end: null },
        longestStreak: { length: 0, start: null, end: null },
    },
    syncedAt: null,
};

export default async function ConsistencyPage() {
    let data = emptyData;
    let youtubeData = emptyYouTubeData;
    const today = new Date().toISOString().slice(0, 10);

    const [githubResult, youtubeResult] = await Promise.allSettled([
        getConsistencyData(),
        getYouTubeConsistencyData(),
    ]);

    if (githubResult.status === 'fulfilled') data = githubResult.value;
    else console.error('Unable to render GitHub consistency data:', githubResult.reason);

    if (youtubeResult.status === 'fulfilled') youtubeData = youtubeResult.value;
    else console.error('Unable to render YouTube consistency data:', youtubeResult.reason);

    const { stats } = data;
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: 'Samik’s GitHub Contribution Streak',
        url: `${siteMetadata.siteUrl}/consistency`,
        mainEntity: {
            '@type': 'Person',
            name: siteMetadata.creator,
            url: siteMetadata.siteUrl,
            sameAs: `https://github.com/${data.username}`,
        },
    };

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <header className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                    <Github className="h-4 w-4" />
                    github.com/{data.username}
                </span>
                <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                    My GitHub Consistency
                </h1>
                <p className="mt-4 text-lg leading-8 text-gray-600">
                    A daily record of the work GitHub counts on my public contribution graph.
                </p>
                <p className="mt-2 text-sm font-medium text-gray-500">
                    Every streak day uses UTC and resets at 00:00 UTC.
                </p>
            </header>

            <section className="mx-auto my-10 grid max-w-4xl grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                    <strong className="text-2xl font-bold sm:text-3xl">
                        {stats.totalContributions.toLocaleString('en-US')}
                    </strong>
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
                        {stats.currentStreak.length > 0
                            ? formatStreakRange(stats.currentStreak)
                            : formatDate(today)}
                    </span>
                </div>

                <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                    <strong className="text-2xl font-bold sm:text-3xl">{stats.longestStreak.length}</strong>
                    <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Longest Streak</span>
                    <span className="mt-2 text-[10px] text-gray-500 sm:mt-3 sm:text-sm">
                        {formatStreakRange(stats.longestStreak)}
                    </span>
                </div>
            </section>

            <ConsistencyGraph days={data.days} />
            <YouTubeConsistency data={youtubeData} />

            {(data.syncedAt || youtubeData.syncedAt) && (
                <p className="mt-4 text-right text-xs text-gray-500">
                    Last synced {new Date(
                        [data.syncedAt, youtubeData.syncedAt]
                            .filter((value): value is string => Boolean(value))
                            .sort()
                            .at(-1) as string
                    ).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                </p>
            )}
        </main>
    );
}
