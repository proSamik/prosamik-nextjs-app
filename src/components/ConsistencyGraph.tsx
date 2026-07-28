'use client';

import { useMemo, useState } from 'react';
import type { ContributionDay } from '@/lib/githubContributions';

interface ConsistencyGraphProps {
    days: ContributionDay[];
}

type GraphView = { mode: 'rolling' } | { mode: 'year'; year: number };

const DAY_IN_MILLISECONDS = 86_400_000;
const LEVEL_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
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

export default function ConsistencyGraph({ days }: ConsistencyGraphProps) {
    const availableYears = useMemo(() => {
        const years = [...new Set(days.map((day) => Number(day.date.slice(0, 4))))];
        return years.filter((year) => year >= 2020).sort((first, second) => second - first);
    }, [days]);
    const [view, setView] = useState<GraphView>({ mode: 'rolling' });

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

            // A rolling range can begin at the very end of a month, placing that
            // label in the same grid week as the next month. Keep the newer label.
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

        const rangeStartString = toDateString(rangeStart);
        const rangeEndString = toDateString(rangeEnd);

        return {
            cells,
            monthLabels,
            numberOfWeeks,
            selectedYear,
            total: days
                .filter((day) => day.date >= rangeStartString && day.date <= rangeEndString)
                .reduce((sum, day) => sum + day.count, 0),
        };
    }, [days, view]);

    if (days.length === 0) {
        return (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Contribution graph</h2>
                <p className="mt-2 text-gray-600">
                    Contribution data will appear after the first scheduled sync.
                </p>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-medium text-gray-700">
                        {graph.total.toLocaleString('en-US')} contributions {view.mode === 'rolling' ? 'in the last 365 days' : `in ${graph.selectedYear}`}
                    </h2>

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
                                    role="img"
                                    aria-label={view.mode === 'rolling'
                                        ? 'GitHub contribution calendar for the last 365 days'
                                        : `GitHub contribution calendar for ${graph.selectedYear}`}
                                    className="grid grid-flow-col grid-rows-7 gap-[3px]"
                                    style={{ gridAutoColumns: '12px' }}
                                >
                                    {graph.cells.map((day, index) => (
                                        <span
                                            key={day?.date ?? `empty-${index}`}
                                            className="h-3 w-3 rounded-[2px] outline-none ring-blue-500 hover:ring-2"
                                            style={{
                                                backgroundColor: day
                                                    ? LEVEL_COLORS[day.level]
                                                    : 'transparent',
                                            }}
                                            title={day
                                                ? day.isFuture
                                                    ? `No contribution data yet for ${DATE_FORMATTER.format(new Date(`${day.date}T00:00:00.000Z`))}`
                                                    : `${day.count.toLocaleString('en-US')} ${day.count === 1 ? 'contribution' : 'contributions'} on ${DATE_FORMATTER.format(new Date(`${day.date}T00:00:00.000Z`))}`
                                                : undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 flex items-center justify-end gap-1 text-xs text-gray-500">
                        <span className="mr-1">Less</span>
                        {LEVEL_COLORS.map((color) => (
                            <span
                                key={color}
                                className="h-3 w-3 rounded-[2px]"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        <span className="ml-1">More</span>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto xl:max-h-[220px] xl:w-32 xl:flex-col xl:overflow-y-auto xl:pr-1" aria-label="Contribution range">
                    <button
                        type="button"
                        onClick={() => setView({ mode: 'rolling' })}
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
                            onClick={() => setView({ mode: 'year', year })}
                            aria-pressed={view.mode === 'year' && view.year === year}
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
        </section>
    );
}
