import Link from 'next/link';
import type { TimePeriod } from '@/types/timeline';
import { getYearSlug } from '@/utils/slugs';

interface TimelineProps {
    timelineData: TimePeriod[];
}

const CalendarIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="h-5 w-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
    </svg>
);

export default function Timeline({ timelineData }: TimelineProps) {
    return (
        <section className="w-full">
            <h1 className="mb-8 text-center text-2xl font-bold">- My Proud Moments -</h1>
            <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3">
                {timelineData.map((period) => {
                    const yearSlug = getYearSlug(period.yearRange.start, period.yearRange.end);

                    return (
                        <Link
                            key={yearSlug}
                            href={`/milestone/${yearSlug}`}
                            className="group relative flex aspect-square flex-col rounded-lg border-2 border-gray-300 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between">
                                <span className="text-sm text-gray-500">
                                    {period.events.length} milestone{period.events.length !== 1 ? 's' : ''}
                                </span>
                                <CalendarIcon />
                            </div>
                            <div className="flex flex-grow items-center justify-center text-center font-medium">
                                <span className="text-lg">
                                    {period.yearRange.start}-{period.yearRange.end}
                                </span>
                            </div>
                            <span className="text-center text-sm text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
                                View milestones
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
