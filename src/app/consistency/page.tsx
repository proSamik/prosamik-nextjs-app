import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Flame, Github } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa';
import {
    emptyGitHubConsistencyData,
    emptyYouTubeConsistencyData,
} from '@/lib/consistencyFallbacks';
import type { StreakRange } from '@/lib/githubContributions';
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

function formatRange(start: string | null, end: string | null, fallback: string) {
    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);
    if (!formattedStart || !formattedEnd) return fallback;
    return formattedStart === formattedEnd ? formattedStart : `${formattedStart} - ${formattedEnd}`;
}

function formatStreak(streak: StreakRange) {
    return formatRange(streak.start, streak.end, 'No active streak');
}

interface PlatformCardProps {
    href: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    iconClassName: string;
    total: number;
    totalLabel: string;
    totalRange: string;
    currentStreak: StreakRange;
    longestStreak: StreakRange;
    accent: 'orange' | 'red';
}

function PlatformCard({
    href,
    name,
    description,
    icon,
    iconClassName,
    total,
    totalLabel,
    totalRange,
    currentStreak,
    longestStreak,
    accent,
}: PlatformCardProps) {
    const accentClasses = accent === 'red'
        ? {
            border: 'border-red-500',
            flame: 'fill-red-500 text-red-500',
            text: 'text-red-600',
            hover: 'group-hover:border-red-300',
        }
        : {
            border: 'border-orange-500',
            flame: 'fill-orange-500 text-orange-500',
            text: 'text-orange-600',
            hover: 'group-hover:border-orange-300',
        };

    return (
        <Link href={href} className="group block" aria-label={`View ${name} streak details`}>
            <article className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md ${accentClasses.hover}`}>
                <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <span className={iconClassName}>{icon}</span>
                        <div>
                            <h2 className="text-xl font-bold">{name}</h2>
                            <p className="text-sm text-gray-500">{description}</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" />
                </header>

                <div className="grid grid-cols-3">
                    <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                        <strong className="text-2xl font-bold sm:text-3xl">{total.toLocaleString('en-US')}</strong>
                        <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">{totalLabel}</span>
                        <span className="mt-2 text-[10px] leading-4 text-gray-500 sm:mt-3 sm:text-sm">{totalRange}</span>
                    </div>

                    <div className="flex min-h-36 flex-col items-center justify-center border-x border-gray-200 px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                        <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 sm:h-24 sm:w-24 sm:border-[5px] ${accentClasses.border}`}>
                            <Flame className={`absolute -top-4 h-6 w-6 sm:-top-5 sm:h-8 sm:w-8 ${accentClasses.flame}`} />
                            <strong className="text-2xl font-bold sm:text-3xl">{currentStreak.length}</strong>
                        </div>
                        <span className={`mt-2 text-xs font-semibold sm:mt-3 sm:text-base ${accentClasses.text}`}>Current Streak</span>
                        <span className="mt-1 text-[10px] leading-4 text-gray-500 sm:mt-2 sm:text-sm">{formatStreak(currentStreak)}</span>
                    </div>

                    <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                        <strong className="text-2xl font-bold sm:text-3xl">{longestStreak.length}</strong>
                        <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Longest Streak</span>
                        <span className="mt-2 text-[10px] leading-4 text-gray-500 sm:mt-3 sm:text-sm">{formatStreak(longestStreak)}</span>
                    </div>
                </div>
            </article>
        </Link>
    );
}

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
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">My Consistency :)</h1>
            </header>

            <section className="mt-10 space-y-8" aria-label="Consistency platforms">
                <PlatformCard
                    href="/consistency/github"
                    name="GitHub"
                    description={`github.com/${githubData.username}`}
                    icon={<Github className="h-6 w-6" />}
                    iconClassName="text-gray-900"
                    total={githubStats.totalContributions}
                    totalLabel="Total Contributions"
                    totalRange={githubStats.firstContributionDate
                        ? `${formatDate(githubStats.firstContributionDate)} - Present`
                        : 'Waiting for first sync'}
                    currentStreak={githubStats.currentStreak}
                    longestStreak={githubStats.longestStreak}
                    accent="orange"
                />

                <PlatformCard
                    href="/consistency/youtube"
                    name="YouTube"
                    description={`youtube.com/@${youtubeData.handle}`}
                    icon={<FaYoutube className="h-6 w-6" />}
                    iconClassName="text-red-600"
                    total={youtubeStats.totalUploads}
                    totalLabel="Total Uploads"
                    totalRange={formatRange(
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
