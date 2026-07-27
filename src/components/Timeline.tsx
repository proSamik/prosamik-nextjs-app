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

function YearCard({ period, yearSlug, isPresent }: {
    period: TimePeriod;
    yearSlug: string;
    isPresent: boolean;
}) {
    return (
        <Link
            href={`/milestone/${yearSlug}`}
            className={`group flex min-h-[180px] w-full flex-col rounded-lg border-2 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md ${
                isPresent ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-300'
            }`}
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
}

export default function Timeline({ timelineData }: TimelineProps) {
    return (
        <section className="w-full">
            <h1 className="mb-10 text-center text-2xl font-bold">- My Proud Moments -</h1>

            <div className="relative mx-auto w-full max-w-3xl">
                <div
                    aria-hidden="true"
                    className="year-timeline-line absolute bottom-0 left-[15px] top-0 w-0.5 bg-gradient-to-b from-blue-600 to-blue-200 md:left-1/2 md:-translate-x-1/2"
                />

                <div className="space-y-7">
                    {timelineData.map((period, index) => {
                        const yearSlug = getYearSlug(period.yearRange.start, period.yearRange.end);
                        const isLeft = index % 2 === 0;

                        return (
                            <article
                                key={yearSlug}
                                className="year-card-reveal relative pl-12 md:grid md:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] md:items-center md:pl-0"
                                style={{ animationDelay: `${index * 110 + 180}ms` }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute left-2 top-7 z-10 h-4 w-4 rounded-full border-2 border-blue-600 bg-blue-600 ring-4 ring-white md:hidden"
                                />
                                <span
                                    aria-hidden="true"
                                    className="absolute left-6 top-[35px] h-0.5 w-6 bg-blue-500 md:hidden"
                                />

                                <div className={isLeft ? 'md:col-start-1' : 'md:col-start-3'}>
                                    <YearCard period={period} yearSlug={yearSlug} isPresent={index === 0} />
                                </div>

                                <div className="relative hidden h-full min-h-[180px] md:col-start-2 md:row-start-1 md:block">
                                    <span
                                        aria-hidden="true"
                                        className="absolute left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-blue-600 ring-4 ring-white"
                                    />
                                    <span
                                        aria-hidden="true"
                                        className={`absolute top-1/2 h-0.5 -translate-y-1/2 bg-blue-500 ${
                                            isLeft ? 'left-0 right-1/2' : 'left-1/2 right-0'
                                        }`}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
