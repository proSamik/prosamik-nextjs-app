import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StreakRange } from '@/lib/githubContributions';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

export function formatConsistencyDate(date: string | null) {
    if (!date) return null;
    return DATE_FORMATTER.format(new Date(`${date}T00:00:00.000Z`));
}

export function formatConsistencyRange(
    start: string | null,
    end: string | null,
    fallback: string
) {
    const formattedStart = formatConsistencyDate(start);
    const formattedEnd = formatConsistencyDate(end);
    if (!formattedStart || !formattedEnd) return fallback;
    return formattedStart === formattedEnd
        ? formattedStart
        : `${formattedStart} - ${formattedEnd}`;
}

export function formatConsistencyStreak(streak: StreakRange) {
    return formatConsistencyRange(streak.start, streak.end, 'No active streak');
}

interface ConsistencySummaryCardProps {
    href: string;
    target?: '_blank';
    name: string;
    description: string;
    icon: ReactNode;
    iconClassName: string;
    total: number;
    totalLabel: string;
    totalRange: string;
    currentStreak: StreakRange;
    longestStreak: StreakRange;
    accent: 'orange' | 'red';
}

export default function ConsistencySummaryCard({
    href,
    target,
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
}: ConsistencySummaryCardProps) {
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
        <Link
            href={href}
            target={target}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
            className="group block"
            aria-label={`View ${name} streak details`}
        >
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
                        <span className="mt-1 text-[10px] leading-4 text-gray-500 sm:mt-2 sm:text-sm">{formatConsistencyStreak(currentStreak)}</span>
                    </div>

                    <div className="flex min-h-36 flex-col items-center justify-center px-2 py-5 text-center sm:min-h-44 sm:px-6 sm:py-7">
                        <strong className="text-2xl font-bold sm:text-3xl">{longestStreak.length}</strong>
                        <span className="mt-2 text-xs text-gray-700 sm:mt-3 sm:text-base">Longest Streak</span>
                        <span className="mt-2 text-[10px] leading-4 text-gray-500 sm:mt-3 sm:text-sm">{formatConsistencyStreak(longestStreak)}</span>
                    </div>
                </div>
            </article>
        </Link>
    );
}
