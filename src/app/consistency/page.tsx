import type { Metadata } from 'next';
import { Flame, Github } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import ConsistencyGraph from '@/components/ConsistencyGraph';
import type { ConsistencyData, StreakRange } from '@/lib/githubContributions';
import { getConsistencyData } from '@/lib/githubContributions';
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

export default async function ConsistencyPage() {
    let data = emptyData;
    const today = new Date().toISOString().slice(0, 10);

    try {
        data = await getConsistencyData();
    } catch (error) {
        console.error('Unable to render consistency page:', error);
    }

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

            <Breadcrumbs items={[{ label: 'Consistency' }]} />

            <header className="mx-auto mt-8 max-w-3xl text-center">
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
            </header>

            <section className="mx-auto my-10 grid max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-3">
                <div className="flex min-h-44 flex-col items-center justify-center px-6 py-7 text-center">
                    <strong className="text-3xl font-bold">
                        {stats.totalContributions.toLocaleString('en-US')}
                    </strong>
                    <span className="mt-3 text-gray-700">Total Contributions</span>
                    <span className="mt-3 text-sm text-gray-500">
                        {stats.firstContributionDate ? `${formatDate(stats.firstContributionDate)} - Present` : 'Waiting for first sync'}
                    </span>
                </div>

                <div className="flex min-h-44 flex-col items-center justify-center border-y border-gray-200 px-6 py-7 text-center sm:border-x sm:border-y-0">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[5px] border-orange-500">
                        <Flame className="absolute -top-5 h-8 w-8 fill-orange-500 text-orange-500" />
                        <strong className="text-3xl font-bold">{stats.currentStreak.length}</strong>
                    </div>
                    <span className="mt-3 font-semibold text-orange-600">Current Streak</span>
                    <span className="mt-2 text-sm text-gray-500">
                        {stats.currentStreak.length > 0
                            ? formatStreakRange(stats.currentStreak)
                            : formatDate(today)}
                    </span>
                </div>

                <div className="flex min-h-44 flex-col items-center justify-center px-6 py-7 text-center">
                    <strong className="text-3xl font-bold">{stats.longestStreak.length}</strong>
                    <span className="mt-3 text-gray-700">Longest Streak</span>
                    <span className="mt-3 text-sm text-gray-500">
                        {formatStreakRange(stats.longestStreak)}
                    </span>
                </div>
            </section>

            <ConsistencyGraph days={data.days} />

            {data.syncedAt && (
                <p className="mt-4 text-right text-xs text-gray-500">
                    Last synced {new Date(data.syncedAt).toLocaleString('en-US', { timeZone: 'UTC' })} UTC
                </p>
            )}
        </main>
    );
}
