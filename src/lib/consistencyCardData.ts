import type { ConsistencyData, ContributionDay, StreakRange } from '@/lib/githubContributions';
import type { YouTubeConsistencyData } from '@/lib/youtubeConsistency';

export type ConsistencyPlatform = 'github' | 'youtube';
export type ConsistencyCardKind = 'graph' | 'streak';

export interface ShareableConsistencyData {
    platform: ConsistencyPlatform;
    platformName: string;
    username: string;
    profileLabel: string;
    profileUrl: string;
    accent: string;
    colors: string[];
    activityName: string;
    total: number;
    totalLabel: string;
    totalRange: string;
    currentStreak: StreakRange;
    longestStreak: StreakRange;
    days: ContributionDay[];
    syncedAt: string | null;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const DAY_IN_MILLISECONDS = 86_400_000;

export function formatCardDate(date: string | null) {
    return date ? DATE_FORMATTER.format(new Date(`${date}T00:00:00.000Z`)) : null;
}

export function formatCardRange(start: string | null, end: string | null, fallback: string) {
    const first = formatCardDate(start);
    const last = formatCardDate(end);
    if (!first || !last) return fallback;
    return first === last ? first : `${first} - ${last}`;
}

export function formatCardStreak(streak: StreakRange) {
    return formatCardRange(streak.start, streak.end, 'No active streak');
}

export function githubShareableData(data: ConsistencyData): ShareableConsistencyData {
    return {
        platform: 'github',
        platformName: 'GitHub',
        username: data.username,
        profileLabel: `github.com/${data.username}`,
        profileUrl: `https://github.com/${data.username}`,
        accent: '#f97316',
        colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
        activityName: 'contributions',
        total: data.stats.totalContributions,
        totalLabel: 'Total Contributions',
        totalRange: data.stats.firstContributionDate
            ? `${formatCardDate(data.stats.firstContributionDate)} - Present`
            : 'Waiting for first sync',
        currentStreak: data.stats.currentStreak,
        longestStreak: data.stats.longestStreak,
        days: data.days,
        syncedAt: data.syncedAt,
    };
}

export function youtubeShareableData(data: YouTubeConsistencyData): ShareableConsistencyData {
    const countsByDate = new Map<string, number>();
    data.videos.forEach((video) => {
        countsByDate.set(video.date, (countsByDate.get(video.date) ?? 0) + 1);
    });
    const days = [...countsByDate.entries()].map(([date, count]) => ({
        date,
        count,
        level: Math.min(count, 4) as ContributionDay['level'],
    })).sort((first, second) => first.date.localeCompare(second.date));

    return {
        platform: 'youtube',
        platformName: 'YouTube',
        username: data.handle,
        profileLabel: `youtube.com/@${data.handle}`,
        profileUrl: data.channelUrl,
        accent: '#ef233c',
        colors: ['#ebedf0', '#fecaca', '#f87171', '#ef4444', '#b91c1c'],
        activityName: 'uploads',
        total: data.overall.totalUploads,
        totalLabel: 'Total Uploads',
        totalRange: formatCardRange(
            data.overall.firstUploadDate,
            data.overall.lastUploadDate,
            'Waiting for first sync'
        ),
        currentStreak: data.overall.currentStreak,
        longestStreak: data.overall.longestStreak,
        days,
        syncedAt: data.syncedAt,
    };
}

function addDays(date: Date, amount: number) {
    return new Date(date.getTime() + amount * DAY_IN_MILLISECONDS);
}

function toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function buildRollingGraph(days: ContributionDay[]) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const rangeStart = addDays(today, -364);
    const graphStart = addDays(rangeStart, -rangeStart.getUTCDay());
    const graphEnd = addDays(today, 6 - today.getUTCDay());
    const numberOfWeeks = Math.round(
        (graphEnd.getTime() - graphStart.getTime()) / DAY_IN_MILLISECONDS / 7
    ) + 1;
    const valuesByDate = new Map(days.map((day) => [day.date, day]));
    const weeks = Array.from({ length: numberOfWeeks }, (_, weekIndex) => (
        Array.from({ length: 7 }, (_, dayIndex) => {
            const date = addDays(graphStart, weekIndex * 7 + dayIndex);
            if (date < rangeStart || date > today) return null;
            return valuesByDate.get(toDateString(date)) ?? {
                date: toDateString(date), count: 0, level: 0 as const,
            };
        })
    ));
    const monthLabels = weeks.map((_, weekIndex) => {
        const weekStart = addDays(graphStart, weekIndex * 7);
        const weekEnd = addDays(weekStart, 6);
        const first = new Date(Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), 1));
        return first >= weekStart && first <= weekEnd ? MONTH_FORMATTER.format(first) : '';
    });
    const start = toDateString(rangeStart);
    const end = toDateString(today);
    const total = days
        .filter((day) => day.date >= start && day.date <= end)
        .reduce((sum, day) => sum + day.count, 0);

    return { weeks, monthLabels, total };
}
