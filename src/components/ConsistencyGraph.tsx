'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    CalendarDayPopover,
    useCalendarPopover,
} from '@/components/CalendarDayPopover';
import ShareConsistencyCard from '@/components/ShareConsistencyCard';
import type { ContributionDay } from '@/lib/githubContributions';

interface ConsistencyGraphProps {
    days: ContributionDay[];
    shareable?: boolean;
    title?: string;
    activityLabels?: boolean;
    statuses?: Record<string, 'complete' | 'incomplete' | 'unknown'>;
    onSelect?: (date: string) => void;
    todayDate?: string;
    onRangeChange?: (from: string, to: string) => void;
    shareControl?: ReactNode;
    renderDayDetails?: (date: string) => ReactNode;
    profileUrl?: string;
}

type GraphView = { mode: 'rolling' } | { mode: 'year'; year: number };

const DAY_IN_MILLISECONDS = 86_400_000;
const LEVEL_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
});
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
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
}

export default function ConsistencyGraph({
    days,
    shareable = false,
    title,
    activityLabels = false,
    statuses,
    onSelect,
    todayDate,
    onRangeChange,
    shareControl,
    renderDayDetails,
    profileUrl = 'https://github.com/proSamik',
}: ConsistencyGraphProps) {
    const availableYears = useMemo(() => {
        const currentYear = Number(
            (todayDate ?? new Date().toISOString()).slice(0, 4),
        );
        const years = [
            ...new Set([
                currentYear,
                currentYear - 1,
                ...days.map((day) => Number(day.date.slice(0, 4))),
            ]),
        ];
        return years
            .filter((year) => year >= 2020)
            .sort((first, second) => second - first);
    }, [days, todayDate]);
    const calendar = useRef<HTMLDivElement>(null);
    const popover = useCalendarPopover<{
        date: string;
        count: number;
        isFuture: boolean;
    }>();
    const [view, setView] = useState<GraphView>({ mode: 'rolling' });

    const graph = useMemo(() => {
        const today = todayDate
            ? new Date(`${todayDate}T00:00:00Z`)
            : startOfUtcDay();
        const selectedYear =
            view.mode === 'year' ? view.year : today.getUTCFullYear();
        const rangeStart =
            view.mode === 'rolling'
                ? addDays(today, -364)
                : new Date(Date.UTC(selectedYear, 0, 1));
        const rangeEnd =
            view.mode === 'rolling'
                ? today
                : new Date(Date.UTC(selectedYear, 11, 31));
        const graphStart = addDays(rangeStart, -rangeStart.getUTCDay());
        const graphEnd = addDays(rangeEnd, 6 - rangeEnd.getUTCDay());
        const numberOfDays =
            Math.round(
                (graphEnd.getTime() - graphStart.getTime()) /
                    DAY_IN_MILLISECONDS,
            ) + 1;
        const numberOfWeeks = Math.ceil(numberOfDays / 7);
        const valuesByDate = new Map(days.map((day) => [day.date, day]));
        const cells = Array.from({ length: numberOfWeeks * 7 }, (_, index) => {
            const date = addDays(graphStart, index);
            const dateString = toDateString(date);
            const isOutsideRange = date < rangeStart || date > rangeEnd;
            if (isOutsideRange) return null;

            return {
                ...(valuesByDate.get(dateString) ?? {
                    date: dateString,
                    count: 0,
                    level: 0 as const,
                }),
                isFuture: date > today,
            };
        });
        const monthLabels: Array<{ label: string; left: number; key: string }> =
            [];
        let monthCursor = new Date(
            Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1),
        );

        while (monthCursor <= rangeEnd) {
            const week = Math.floor(
                (monthCursor.getTime() - graphStart.getTime()) /
                    DAY_IN_MILLISECONDS /
                    7,
            );
            const monthLabel = {
                label: MONTH_FORMATTER.format(monthCursor),
                left: Math.max(week, 0) * 15,
                key: `${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth()}`,
            };
            const previousLabel = monthLabels.at(-1);

            // A rolling range can begin at the very end of a month, placing that
            // label in the same grid week as the next month. Keep the newer label.
            if (previousLabel && monthLabel.left - previousLabel.left < 30) {
                monthLabels[monthLabels.length - 1] = monthLabel;
            } else {
                monthLabels.push(monthLabel);
            }
            monthCursor = new Date(
                Date.UTC(
                    monthCursor.getUTCFullYear(),
                    monthCursor.getUTCMonth() + 1,
                    1,
                ),
            );
        }

        const rangeStartString = toDateString(rangeStart);
        const rangeEndString = toDateString(rangeEnd);

        return {
            cells,
            monthLabels,
            numberOfWeeks,
            selectedYear,
            total: days
                .filter(
                    (day) =>
                        day.date >= rangeStartString &&
                        day.date <= rangeEndString,
                )
                .reduce((sum, day) => sum + day.count, 0),
        };
    }, [days, view, todayDate]);

    useEffect(() => {
        if (activityLabels && calendar.current)
            calendar.current.scrollLeft = calendar.current.scrollWidth;
    }, [activityLabels, view]);

    if (days.length === 0 && !activityLabels) {
        return (
            <section className="relative min-w-0 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {shareControl ??
                    (shareable && (
                        <ShareConsistencyCard platform="github" card="graph" />
                    ))}
                <h2 className="text-xl font-semibold">Contribution graph</h2>
                <p className="mt-2 text-gray-600">
                    Contribution data will appear after the first scheduled
                    sync.
                </p>
            </section>
        );
    }

    return (
        <section className="relative min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            {shareControl ??
                (shareable && (
                    <ShareConsistencyCard platform="github" card="graph" />
                ))}
            <div
                className={`flex flex-col gap-6 ${activityLabels ? '' : 'xl:flex-row'}`}
            >
                <div className="min-w-0 flex-1">
                    <h2 className="pr-10 text-lg font-medium text-gray-700">
                        {title && (
                            <span className="mb-1 block font-bold text-gray-950">
                                {title}
                            </span>
                        )}
                        {graph.total.toLocaleString('en-US')}{' '}
                        {activityLabels ? 'completed days' : 'contributions'}{' '}
                        {view.mode === 'rolling'
                            ? 'in the last 365 days'
                            : `in ${graph.selectedYear}`}
                    </h2>

                    <div ref={calendar} className="mt-5 overflow-x-auto pb-3">
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
                                    style={{
                                        width: `${graph.numberOfWeeks * 15}px`,
                                    }}
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
                                    role="group"
                                    aria-label={
                                        view.mode === 'rolling'
                                            ? `${title ?? 'GitHub contribution'} calendar for the last 365 days`
                                            : `${title ?? 'GitHub contribution'} calendar for ${graph.selectedYear}`
                                    }
                                    className="grid grid-flow-col grid-rows-7 gap-[3px]"
                                    style={{ gridAutoColumns: '12px' }}
                                >
                                    {graph.cells.map((day, index) => (
                                        <button
                                            type="button"
                                            disabled={!day}
                                            onMouseEnter={(event) =>
                                                day &&
                                                popover.show(
                                                    day,
                                                    event.currentTarget,
                                                )
                                            }
                                            onMouseLeave={popover.hideLater}
                                            onFocus={(event) =>
                                                day &&
                                                popover.show(
                                                    day,
                                                    event.currentTarget,
                                                )
                                            }
                                            onBlur={popover.hideLater}
                                            onClick={(event) =>
                                                day &&
                                                popover.show(
                                                    day,
                                                    event.currentTarget,
                                                    true,
                                                )
                                            }
                                            key={day?.date ?? `empty-${index}`}
                                            className="h-3 w-3 rounded-[2px] outline-none ring-blue-500 hover:ring-2"
                                            style={{
                                                backgroundColor: day
                                                    ? day.isFuture
                                                        ? '#ebedf0'
                                                        : statuses
                                                          ? statuses[
                                                                day.date
                                                            ] === 'complete'
                                                              ? '#00b983'
                                                              : statuses[
                                                                      day.date
                                                                  ] ===
                                                                  'incomplete'
                                                                ? '#ebedf0'
                                                                : '#ebedf0'
                                                          : LEVEL_COLORS[
                                                                day.level
                                                            ]
                                                    : 'transparent',
                                            }}
                                            aria-label={
                                                day
                                                    ? day.isFuture
                                                        ? `No contribution data yet for ${DATE_FORMATTER.format(new Date(`${day.date}T00:00:00.000Z`))}`
                                                        : activityLabels
                                                          ? `${statuses?.[day.date] === 'complete' ? 'Completed' : statuses?.[day.date] === 'incomplete' ? 'Incomplete' : 'Not updated'} on ${day.date} IST`
                                                          : `${day.count.toLocaleString('en-US')} ${day.count === 1 ? 'contribution' : 'contributions'} on ${DATE_FORMATTER.format(new Date(`${day.date}T00:00:00.000Z`))}`
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-xs text-gray-500">
                        {statuses ? (
                            [
                                { color: '#00b983', label: 'Completed' },
                                { color: '#ebedf0', label: 'Incomplete' },
                                { color: '#ebedf0', label: 'Not updated' },
                                { color: '#ebedf0', label: 'Future' },
                            ].map((item) => (
                                <span
                                    key={item.label}
                                    className="inline-flex items-center gap-1"
                                >
                                    <span
                                        className="h-3 w-3 rounded-[2px]"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    {item.label}
                                </span>
                            ))
                        ) : (
                            <>
                                <span>Less</span>
                                {LEVEL_COLORS.map((color) => (
                                    <span
                                        key={color}
                                        className="h-3 w-3 rounded-[2px]"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <span>More</span>
                            </>
                        )}
                    </div>
                </div>

                <div
                    className={`flex gap-2 overflow-x-auto ${activityLabels ? '' : 'xl:max-h-[220px] xl:w-32 xl:flex-col xl:overflow-y-auto xl:pr-1'}`}
                    aria-label="Contribution range"
                >
                    <button
                        type="button"
                        onClick={() => {
                            setView({ mode: 'rolling' });
                            const today =
                                todayDate ?? toDateString(startOfUtcDay());
                            onRangeChange?.(
                                toDateString(
                                    addDays(
                                        new Date(`${today}T00:00:00Z`),
                                        -364,
                                    ),
                                ),
                                today,
                            );
                        }}
                        aria-pressed={view.mode === 'rolling'}
                        className={`shrink-0 rounded-md px-4 py-2 text-left text-sm transition-colors ${
                            view.mode === 'rolling'
                                ? 'bg-blue-600 font-medium text-white'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                        Last 365 days
                    </button>
                    {availableYears.map((year) => (
                        <button
                            key={year}
                            type="button"
                            onClick={() => {
                                setView({ mode: 'year', year });
                                onRangeChange?.(
                                    `${year}-01-01`,
                                    `${year}-12-31`,
                                );
                            }}
                            aria-pressed={
                                view.mode === 'year' && view.year === year
                            }
                            className={`shrink-0 rounded-md px-4 py-2 text-left text-sm transition-colors ${
                                view.mode === 'year' && view.year === year
                                    ? 'bg-blue-600 font-medium text-white'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>
            {popover.selection && (
                <CalendarDayPopover
                    anchor={popover.selection.anchor}
                    pinned={popover.selection.pinned}
                    onClose={popover.close}
                    onEnter={popover.cancelHide}
                    onLeave={popover.hideLater}
                >
                    <strong className="block text-gray-950">
                        {DATE_FORMATTER.format(
                            new Date(
                                `${popover.selection.value.date}T00:00:00Z`,
                            ),
                        )}
                        {activityLabels ? ' · IST' : ''}
                    </strong>
                    <p className="mt-2 text-gray-600">
                        {popover.selection.value.isFuture
                            ? 'Future date'
                            : activityLabels
                              ? statuses?.[popover.selection.value.date] ===
                                'complete'
                                  ? 'Completed'
                                  : statuses?.[popover.selection.value.date] ===
                                      'incomplete'
                                    ? 'Incomplete'
                                    : 'Not updated'
                              : `${popover.selection.value.count} contributions`}
                    </p>
                    {renderDayDetails?.(popover.selection.value.date)}
                    {!activityLabels && !popover.selection.value.isFuture && (
                        <a
                            className="mt-3 inline-block font-medium text-blue-600"
                            href={`${profileUrl}?tab=overview&from=${popover.selection.value.date}&to=${popover.selection.value.date}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View activity on GitHub ↗
                        </a>
                    )}
                    {onSelect && !popover.selection.value.isFuture && (
                        <button
                            type="button"
                            className="mt-3 rounded-lg bg-stone-950 px-3 py-2 text-white"
                            onClick={() => {
                                onSelect(popover.selection!.value.date);
                                popover.close();
                            }}
                        >
                            Edit this day
                        </button>
                    )}
                </CalendarDayPopover>
            )}
        </section>
    );
}
