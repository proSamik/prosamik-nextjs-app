import { Flame } from 'lucide-react';
import type { ReactNode } from 'react';
export default function ConsistencyStreakCard({
    total,
    current,
    longest,
    totalLabel = 'Total Contributions',
    currentLabel = 'Current Streak',
    longestLabel = 'Longest Streak',
    totalRange,
    currentRange,
    longestRange,
    share,
    compact = false,
}: {
    total: number;
    current: number;
    longest: number;
    totalLabel?: string;
    currentLabel?: string;
    longestLabel?: string;
    totalRange?: string;
    currentRange?: string;
    longestRange?: string;
    share?: ReactNode;
    compact?: boolean;
}) {
    return (
        <section
            className={`relative min-w-0 grid grid-cols-3 rounded-xl border border-gray-200 bg-white shadow-sm ${compact ? 'pt-8 xl:grid-cols-1' : 'my-4'}`}
        >
            {share}
            <div
                className={`flex flex-col items-center justify-center px-2 py-5 text-center sm:px-6 ${compact ? 'xl:py-2' : 'min-h-36 sm:min-h-44 sm:py-7'}`}
            >
                <strong className="text-2xl font-bold sm:text-3xl">
                    {total.toLocaleString('en-US')}
                </strong>
                <span
                    className={`mt-3 text-xs text-gray-700 ${compact ? 'sm:text-sm' : 'sm:text-base'}`}
                >
                    {totalLabel}
                </span>
                <span
                    className={`mt-3 text-[10px] text-gray-500 ${compact ? 'sm:text-xs' : 'sm:text-sm'}`}
                >
                    {totalRange}
                </span>
            </div>
            <div
                className={`flex flex-col items-center justify-center border-x border-gray-200 px-2 py-5 text-center sm:px-6 ${compact ? 'xl:border-x-0 xl:border-y xl:py-3' : 'min-h-36 sm:min-h-44 sm:py-7'}`}
            >
                <div
                    className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-orange-500 ${compact ? '' : 'sm:h-24 sm:w-24 sm:border-[5px]'}`}
                >
                    <Flame className="absolute -top-4 h-6 w-6 fill-orange-500 text-orange-500 sm:-top-5 sm:h-8 sm:w-8" />
                    <strong className="text-2xl font-bold sm:text-3xl">
                        {current}
                    </strong>
                </div>
                <span
                    className={`mt-3 text-xs font-semibold text-orange-600 ${compact ? 'sm:text-sm' : 'sm:text-base'}`}
                >
                    {currentLabel}
                </span>
                <span
                    className={`mt-2 text-[10px] text-gray-500 ${compact ? 'sm:text-xs' : 'sm:text-sm'}`}
                >
                    {currentRange}
                </span>
            </div>
            <div
                className={`flex flex-col items-center justify-center px-2 py-5 text-center sm:px-6 ${compact ? 'xl:py-2' : 'min-h-36 sm:min-h-44 sm:py-7'}`}
            >
                <strong className="text-2xl font-bold sm:text-3xl">
                    {longest}
                </strong>
                <span
                    className={`mt-3 text-xs text-gray-700 ${compact ? 'sm:text-sm' : 'sm:text-base'}`}
                >
                    {longestLabel}
                </span>
                <span
                    className={`mt-3 text-[10px] text-gray-500 ${compact ? 'sm:text-xs' : 'sm:text-sm'}`}
                >
                    {longestRange}
                </span>
            </div>
        </section>
    );
}
