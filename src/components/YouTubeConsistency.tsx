'use client';

import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { ExternalLink, Flame } from 'lucide-react';
import { FaYoutube } from 'react-icons/fa';
import type {
    StreakRange,
} from '@/lib/githubContributions';
import type {
    YouTubeConsistencyData,
    YouTubePublishingStats,
    YouTubeVideo,
} from '@/lib/youtubeConsistency';

interface YouTubeConsistencyProps {
    data: YouTubeConsistencyData;
}

type GraphView = { mode: 'rolling' } | { mode: 'year'; year: number };

interface CalendarDay {
    date: string;
    shorts: YouTubeVideo[];
    longForm: YouTubeVideo[];
    isFuture: boolean;
}

interface TooltipState extends CalendarDay {
    left: number;
    top: number;
}

const DAY_IN_MILLISECONDS = 86_400_000;
const EMPTY_COLOR = '#ebedf0';
const UPLOAD_COLORS = ['#ebedf0', '#fecaca', '#f87171', '#ef4444', '#b91c1c'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

function toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number) {
    return new Date(date.getTime() + amount * DAY_IN_MILLISECONDS);
}

function startOfUtcDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatStreak(streak: StreakRange) {
    if (!streak.start || !streak.end) return 'No active streak';
    const start = DATE_FORMATTER.format(new Date(`${streak.start}T00:00:00.000Z`));
    const end = DATE_FORMATTER.format(new Date(`${streak.end}T00:00:00.000Z`));
    return start === end ? start : `${start} - ${end}`;
}

function formatUploadRange(firstDate: string | null, lastDate: string | null) {
    if (!firstDate || !lastDate) return 'Waiting for first sync';
    const first = DATE_FORMATTER.format(new Date(`${firstDate}T00:00:00.000Z`));
    const last = DATE_FORMATTER.format(new Date(`${lastDate}T00:00:00.000Z`));
    return first === last ? first : `${first} - ${last}`;
}

function OverallStatsCard({ stats }: { stats: YouTubePublishingStats }) {
    return (
        <article className="mx-auto my-8 grid max-w-4xl grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                <strong className="text-2xl font-bold sm:text-3xl">{stats.totalUploads}</strong>
                <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Total Uploads</span>
                <span className="mt-2 text-[10px] leading-4 text-gray-500 sm:mt-3 sm:text-sm">
                    {formatUploadRange(stats.firstUploadDate, stats.lastUploadDate)}
                </span>
            </div>

            <div className="flex min-h-36 flex-col items-center justify-center border-x border-gray-200 px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-500 sm:h-24 sm:w-24 sm:border-[5px]">
                    <Flame className="absolute -top-4 h-6 w-6 fill-red-500 text-red-500 sm:-top-5 sm:h-8 sm:w-8" />
                    <strong className="text-2xl font-bold sm:text-3xl">{stats.currentStreak.length}</strong>
                </div>
                <span className="mt-2 text-xs font-semibold text-red-600 sm:mt-3 sm:text-base">Current Streak</span>
                <span className="mt-1 text-[10px] leading-4 text-gray-500 sm:mt-2 sm:text-sm">
                    {formatStreak(stats.currentStreak)}
                </span>
            </div>

            <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                <strong className="text-2xl font-bold sm:text-3xl">{stats.longestStreak.length}</strong>
                <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Longest Streak</span>
                <span className="mt-2 text-[10px] leading-4 text-gray-500 sm:mt-3 sm:text-sm">
                    {formatStreak(stats.longestStreak)}
                </span>
            </div>
        </article>
    );
}

function PublishingStatsCard({
    title,
    stats,
    colorClass,
    ringClass,
}: {
    title: string;
    stats: YouTubePublishingStats;
    colorClass: string;
    ringClass: string;
}) {
    return (
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h3 className={`text-xl font-bold ${colorClass}`}>{title}</h3>
            <div className="mt-5 grid grid-cols-2 divide-x divide-gray-200 text-center">
                <div className="px-2">
                    <strong className="text-2xl font-bold sm:text-3xl">{stats.totalUploads}</strong>
                    <p className="mt-2 text-xs text-gray-600 sm:text-sm">Uploads</p>
                    <p className="mt-2 text-[10px] leading-4 text-gray-500 sm:text-xs">
                        {formatUploadRange(stats.firstUploadDate, stats.lastUploadDate)}
                    </p>
                </div>
                <div className="flex flex-col items-center px-2">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 ${ringClass}`}>
                        <strong className="text-2xl font-bold sm:text-3xl">{stats.currentStreak.length}</strong>
                    </div>
                    <p className="mt-2 text-xs text-gray-600 sm:text-sm">Current streak</p>
                    <p className="mt-2 text-[10px] leading-4 text-gray-500 sm:text-xs">
                        {formatStreak(stats.currentStreak)}
                    </p>
                </div>
            </div>
        </article>
    );
}

export default function YouTubeConsistency({ data }: YouTubeConsistencyProps) {
    const availableYears = useMemo(() => {
        const years = [...new Set(data.videos.map((video) => Number(video.date.slice(0, 4))))];
        return years.sort((first, second) => second - first);
    }, [data.videos]);
    const [view, setView] = useState<GraphView>({ mode: 'rolling' });
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const graph = useMemo(() => {
        const today = startOfUtcDay();
        const selectedYear = view.mode === 'year' ? view.year : today.getUTCFullYear();
        const rangeStart = view.mode === 'rolling'
            ? addDays(today, -364)
            : new Date(Date.UTC(selectedYear, 0, 1));
        const rangeEnd = view.mode === 'rolling'
            ? today
            : new Date(Date.UTC(selectedYear, 11, 31));
        const graphStart = addDays(rangeStart, -rangeStart.getUTCDay());
        const graphEnd = addDays(rangeEnd, 6 - rangeEnd.getUTCDay());
        const numberOfDays = Math.round((graphEnd.getTime() - graphStart.getTime()) / DAY_IN_MILLISECONDS) + 1;
        const numberOfWeeks = Math.ceil(numberOfDays / 7);
        const videosByDate = new Map<string, { shorts: YouTubeVideo[]; longForm: YouTubeVideo[] }>();

        data.videos.forEach((video) => {
            const current = videosByDate.get(video.date) ?? { shorts: [], longForm: [] };
            if (video.type === 'short') current.shorts.push(video);
            else current.longForm.push(video);
            videosByDate.set(video.date, current);
        });

        const cells = Array.from({ length: numberOfWeeks * 7 }, (_, index) => {
            const date = addDays(graphStart, index);
            if (date < rangeStart || date > rangeEnd) return null;

            const dateString = toDateString(date);
            const videos = videosByDate.get(dateString) ?? { shorts: [], longForm: [] };
            return {
                date: dateString,
                shorts: videos.shorts,
                longForm: videos.longForm,
                isFuture: date > today,
            };
        });
        const monthLabels: Array<{ label: string; left: number; key: string }> = [];
        let monthCursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));

        while (monthCursor <= rangeEnd) {
            const week = Math.floor(
                (monthCursor.getTime() - graphStart.getTime()) / DAY_IN_MILLISECONDS / 7
            );
            const monthLabel = {
                label: MONTH_FORMATTER.format(monthCursor),
                left: Math.max(week, 0) * 15,
                key: `${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth()}`,
            };
            const previousLabel = monthLabels.at(-1);

            // Avoid overlapping labels when the rolling range starts in the final
            // few days of one month and the following month shares its grid week.
            if (previousLabel && monthLabel.left - previousLabel.left < 30) {
                monthLabels[monthLabels.length - 1] = monthLabel;
            } else {
                monthLabels.push(monthLabel);
            }
            monthCursor = new Date(Date.UTC(
                monthCursor.getUTCFullYear(),
                monthCursor.getUTCMonth() + 1,
                1
            ));
        }

        const startString = toDateString(rangeStart);
        const endString = toDateString(rangeEnd);
        const uploadsInRange = data.videos.filter(
            (video) => video.date >= startString && video.date <= endString
        );

        return {
            cells,
            monthLabels,
            numberOfWeeks,
            selectedYear,
            shorts: uploadsInRange.filter((video) => video.type === 'short').length,
            longForm: uploadsInRange.filter((video) => video.type === 'long-form').length,
        };
    }, [data.videos, view]);

    const cancelTooltipHide = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
    };

    const scheduleTooltipHide = () => {
        hideTimer.current = setTimeout(() => setTooltip(null), 180);
    };

    const showTooltip = (event: MouseEvent<HTMLElement>, day: CalendarDay) => {
        cancelTooltipHide();
        const bounds = event.currentTarget.getBoundingClientRect();
        const tooltipHeight = 288;
        setTooltip({
            ...day,
            left: Math.max(12, Math.min(bounds.left - 130, window.innerWidth - 332)),
            top: bounds.bottom + tooltipHeight > window.innerHeight
                ? Math.max(12, bounds.top - tooltipHeight - 8)
                : bounds.bottom + 8,
        });
    };

    return (
        <section className="mt-16 border-t border-gray-200 pt-12">
            <header className="text-center">
                <a
                    href={data.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                >
                    <FaYoutube className="h-5 w-5" aria-hidden="true" />
                    youtube.com/@{data.handle}
                </a>
                <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                    My YouTube Consistency
                </h2>
                <p className="mt-3 text-gray-600">
                    Shorts and long-form publishing streaks, grouped by their UTC publish date.
                </p>
            </header>

            <OverallStatsCard stats={data.overall} />

            <div className="my-8 grid gap-5 lg:grid-cols-2">
                <PublishingStatsCard
                    title="Shorts"
                    stats={data.shorts}
                    colorClass="text-red-600"
                    ringClass="border-red-500"
                />
                <PublishingStatsCard
                    title="Long-form videos"
                    stats={data.longForm}
                    colorClass="text-blue-600"
                    ringClass="border-blue-600"
                />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                {data.videos.length === 0 ? (
                    <p className="text-gray-600">YouTube data will appear after the first sync.</p>
                ) : (
                    <div className="flex flex-col gap-6 xl:flex-row">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-medium text-gray-700">
                                {graph.shorts} Shorts and {graph.longForm} long-form videos {view.mode === 'rolling' ? 'in the last 365 days' : `in ${graph.selectedYear}`}
                            </h3>

                            <div className="mt-5 overflow-x-auto pb-3">
                                <div className="flex min-w-max">
                                    <div className="mr-2 mt-7 grid h-[102px] grid-rows-7 gap-[3px] text-xs text-gray-500">
                                        <span />
                                        <span>Mon</span>
                                        <span />
                                        <span>Wed</span>
                                        <span />
                                        <span>Fri</span>
                                        <span />
                                    </div>
                                    <div>
                                        <div
                                            className="relative mb-2 h-5 text-xs text-gray-500"
                                            style={{ width: `${graph.numberOfWeeks * 15}px` }}
                                            aria-hidden="true"
                                        >
                                            {graph.monthLabels.map((month) => (
                                                <span
                                                    key={month.key}
                                                    className="absolute top-0"
                                                    style={{ left: `${month.left}px` }}
                                                >
                                                    {month.label}
                                                </span>
                                            ))}
                                        </div>
                                        <div
                                            className="grid grid-flow-col grid-rows-7 gap-[3px]"
                                            style={{ gridAutoColumns: '12px' }}
                                            aria-label="YouTube publishing calendar"
                                        >
                                            {graph.cells.map((day, index) => (
                                                day ? (
                                                    <span
                                                        key={day.date}
                                                        tabIndex={0}
                                                        onMouseEnter={(event) => showTooltip(event, day)}
                                                        onMouseLeave={scheduleTooltipHide}
                                                        onFocus={(event) => showTooltip(event, day)}
                                                        onBlur={scheduleTooltipHide}
                                                        className="h-3 w-3 cursor-pointer rounded-[2px] outline-none ring-red-500 hover:ring-2 focus:ring-2"
                                                        aria-label={`${day.shorts.length} Shorts and ${day.longForm.length} long-form videos on ${day.date}`}
                                                        style={{
                                                            backgroundColor: day.isFuture
                                                                ? EMPTY_COLOR
                                                                : UPLOAD_COLORS[Math.min(day.shorts.length + day.longForm.length, 4)],
                                                        }}
                                                    />
                                                ) : (
                                                    <span key={`empty-${index}`} className="h-3 w-3" />
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-end gap-1 text-xs text-gray-600">
                                <span className="mr-1">Less</span>
                                {UPLOAD_COLORS.map((color, index) => (
                                    <span
                                        key={color}
                                        className="h-3 w-3 rounded-[2px]"
                                        style={{ backgroundColor: color }}
                                        aria-label={index === 0 ? 'No uploads' : `${index}${index === 4 ? '+' : ''} uploads`}
                                    />
                                ))}
                                <span className="ml-1">More</span>
                            </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto xl:w-32 xl:flex-col" aria-label="YouTube range">
                            <button
                                type="button"
                                onClick={() => setView({ mode: 'rolling' })}
                                className={`shrink-0 rounded-md px-4 py-2 text-left text-sm transition-colors ${
                                    view.mode === 'rolling'
                                        ? 'bg-red-600 font-medium text-white'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                Last 365 days
                            </button>
                            {availableYears.map((year) => (
                                <button
                                    key={year}
                                    type="button"
                                    onClick={() => setView({ mode: 'year', year })}
                                    className={`shrink-0 rounded-md px-4 py-2 text-left text-sm transition-colors ${
                                        view.mode === 'year' && view.year === year
                                            ? 'bg-red-600 font-medium text-white'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {tooltip && (
                <aside
                    className="fixed z-[1100] max-h-72 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
                    style={{ left: tooltip.left, top: tooltip.top }}
                    onMouseEnter={cancelTooltipHide}
                    onMouseLeave={scheduleTooltipHide}
                >
                    <p className="font-semibold text-gray-900">
                        {DATE_FORMATTER.format(new Date(`${tooltip.date}T00:00:00.000Z`))}
                    </p>
                    {tooltip.isFuture ? (
                        <p className="mt-2 text-sm text-gray-500">No publishing data yet.</p>
                    ) : tooltip.shorts.length + tooltip.longForm.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">No videos published.</p>
                    ) : (
                        <div className="mt-3 space-y-4">
                            {tooltip.shorts.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Shorts</p>
                                    <ul className="mt-2 space-y-2">
                                        {tooltip.shorts.map((video) => (
                                            <li key={video.id}>
                                                <a
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-start gap-2 text-sm text-gray-700 hover:text-red-600"
                                                >
                                                    <span className="line-clamp-2 flex-1">{video.title}</span>
                                                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {tooltip.longForm.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Long-form videos</p>
                                    <ul className="mt-2 space-y-2">
                                        {tooltip.longForm.map((video) => (
                                            <li key={video.id}>
                                                <a
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-start gap-2 text-sm text-gray-700 hover:text-blue-600"
                                                >
                                                    <span className="line-clamp-2 flex-1">{video.title}</span>
                                                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </aside>
            )}
        </section>
    );
}
