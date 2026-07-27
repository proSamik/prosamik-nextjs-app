'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import type { TimePeriod, YearRange } from '@/types/timeline';
import { getMilestoneSlug, getYearSlug } from '@/utils/slugs';

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

function SkillTags({ skills, maxVisible }: { skills: string[]; maxVisible: number }) {
    const visibleSkills = skills.slice(0, maxVisible);
    const remainingCount = skills.length - maxVisible;

    return (
        <div className="mt-2 flex flex-wrap gap-1">
            {visibleSkills.map((skill) => (
                <span key={skill} className="rounded-md bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                    {skill}
                </span>
            ))}
            {remainingCount > 0 && (
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                    +{remainingCount} more
                </span>
            )}
        </div>
    );
}

export default function Timeline({ timelineData }: TimelineProps) {
    const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(timelineData[0].yearRange);
    const currentPeriod = timelineData.find(
        (period) => period.yearRange.start === selectedYearRange.start
    );

    return (
        <div className="w-full">
            <h1 className="mb-8 text-center text-2xl font-bold">- My Proud Moments -</h1>
            <div className="flex flex-col gap-2 md:flex-row md:space-x-4">
                <div className="grid grid-cols-2 gap-2 md:w-2/3">
                    {timelineData.map((period) => (
                        <button
                            type="button"
                            key={period.yearRange.start}
                            onClick={() => setSelectedYearRange(period.yearRange)}
                            className={`relative flex aspect-square flex-col rounded-lg border-2 p-4 text-left shadow-sm transition-all hover:shadow-md ${
                                selectedYearRange.start === period.yearRange.start
                                    ? 'border-blue-600 bg-blue-500 text-white'
                                    : 'border-gray-300 bg-white hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="text-sm opacity-60">
                                    {period.events.length} milestone{period.events.length !== 1 ? 's' : ''}
                                </div>
                                <CalendarIcon />
                            </div>
                            <div className="flex w-full items-center justify-center font-medium">
                                <span className="text-lg">{period.yearRange.start}</span>
                                <span className="text-lg">-</span>
                                <span className="text-lg">{period.yearRange.end}</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="rounded-lg bg-white p-1 md:w-2/3">
                    <div className="relative w-full text-center">
                        <h2 className="group mb-4 inline-flex cursor-default items-center gap-2 rounded-lg border-2 border-blue-600 bg-blue-500 p-2 text-xl font-bold text-white shadow-sm transition-all hover:shadow-md">
                            <MoreHorizontal className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                            <span>{`${selectedYearRange.start} - ${selectedYearRange.end}`}</span>
                            <MoreHorizontal className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />
                        </h2>
                        {currentPeriod?.yearRange.description && (
                            <p className="mt-1 text-sm text-gray-500">{currentPeriod.yearRange.description}</p>
                        )}
                    </div>

                    <div className="mt-2 space-y-3">
                        {currentPeriod?.events.map((event) => {
                            const yearSlug = getYearSlug(currentPeriod.yearRange.start, currentPeriod.yearRange.end);
                            const milestoneSlug = getMilestoneSlug(event.title);

                            return (
                                <Link
                                    key={event.title}
                                    href={`/milestone/${yearSlug}/${milestoneSlug}`}
                                    className="group flex flex-col rounded-lg bg-gray-50 p-2 transition-all hover:bg-gray-100 hover:shadow-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium">{event.title}</h3>
                                        <ChevronRight className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
                                    </div>
                                    <SkillTags skills={event.skills} maxVisible={3} />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
