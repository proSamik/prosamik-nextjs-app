'use client';
import React, { useState } from "react";
import { ChevronRight, MoreHorizontal, X } from "lucide-react";
import {TimelineEvent, TimePeriod, YearRange} from "@/types/timeline";

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
        className="w-5 h-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
    </svg>
);

// Helper component for skill tags display
const SkillTags = ({ skills, maxVisible, onClick }: {
    skills: string[],
    maxVisible: number,
    onClick?: () => void
}) => {
    // Only show up to maxVisible tags
    const visibleSkills = skills.slice(0, maxVisible);
    const remainingCount = skills.length - maxVisible;

    return (
        <div className="flex flex-wrap gap-1 mt-2">
            {visibleSkills.map((skill, index) => (
                <span
                    key={index}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-md"
                >
                    {skill}
                </span>
            ))}
            {remainingCount > 0 && (
                <button
                    onClick={onClick}
                    className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-md hover:bg-gray-200"
                >
                    +{remainingCount} more
                </button>
            )}
        </div>
    );
};

export default function Timeline({ timelineData }: TimelineProps) {
    const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(timelineData[0].yearRange);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [showYearDescription, setShowYearDescription] = useState(false);

    const selectEvent = (event: TimelineEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const renderDescription = (description: string) => {
        return description.split('\n').map((paragraph, index) => {
            // Check if the paragraph starts with a tab (`\t`)
            const isSubPoint = paragraph.startsWith('\t');

            // Apply different styling for sub-points
            return (
                <p
                    key={index}
                    className={`text-gray-600 dark:text-gray-300 ${isSubPoint ? 'pl-4' : ''}`} // Add padding for sub-points
                >
                    {paragraph.trim()} {/* Trim to remove extra spaces or tabs */}
                </p>
            );
        });
    };

    // Function to render skills in categories
    const renderSkillCategories = (event: TimelineEvent) => {
        return (
            <div className="space-y-4 mt-6">
                <div>
                    <h4 className="text-lg font-semibold mb-2">General Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {event.skills.map((skill, index) => (
                            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
                {event.soft_skills && event.soft_skills.length > 0 && (
                    <div>
                        <h4 className="text-lg font-semibold mb-2">Soft Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {event.soft_skills.map((skill, index) => (
                                <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-md">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Get current period description
    const currentPeriod = timelineData.find(
        (period) => period.yearRange.start === selectedYearRange.start
    );

    return (
        <div className="w-full">
            <h1 className="text-2xl font-bold text-center mb-8">- My Proud Moments -</h1>
            <div className="flex flex-col md:flex-row gap-2 space-x-4">
                {/* Year blocks grid */}
                <div className="md:w-2/3 grid grid-cols-2 gap-2">
                    {timelineData.map((period) => (
                        <div
                            key={period.yearRange.start}
                            onClick={() => setSelectedYearRange(period.yearRange)}
                            className={`aspect-square p-4 rounded-lg cursor-pointer transition-all flex flex-col border-2 relative ${
                                selectedYearRange.start === period.yearRange.start
                                    ? "bg-blue-500 text-white border-blue-600"
                                    : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600"
                            } shadow-sm hover:shadow-md`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="text-sm opacity-60">
                                    {period.events.length} milestone{period.events.length !== 1 ? "s" : ""}
                                </div>
                                <CalendarIcon />
                            </div>
                            <div className="flex items-center w-full font-medium justify-center">
                                <span className="text-lg">{period.yearRange.start}</span>
                                <span className="text-lg">-</span>
                                <span className="text-lg">{period.yearRange.end}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Events list with hoverable description */}
                <div className="md:w-2/3 bg-white dark:bg-gray-900 p-1 rounded-lg">
                    <div className="w-full text-center relative">

                        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-4 p-2 rounded-lg cursor-default transition-all
                            border-2 shadow-sm hover:shadow-md bg-blue-500 text-white border-blue-600 group ">
                            <MoreHorizontal
                                className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity cursor-default"
                            />
                            <span>{`${selectedYearRange.start} - ${selectedYearRange.end}`}</span>
                            <div className="relative">
                                <MoreHorizontal
                                    className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity cursor-default"
                                    onMouseEnter={() => setShowYearDescription(true)}
                                    onMouseLeave={() => setShowYearDescription(false)}
                                />
                                {/* Tooltip for year range description */}
                                {showYearDescription && currentPeriod?.yearRange.description && (
                                    <div
                                        className="absolute left-1/2 transform -translate-x-1/2 mt-3 w-48 h-48">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1"></p>
                                    </div>
                                )}
                            </div>
                        </h2>
                        {currentPeriod?.yearRange.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentPeriod.yearRange.description}</p>
                        )}
                    </div>

                    <div className="mt-2 space-y-3">
                        {timelineData
                            .find((period) => period.yearRange.start === selectedYearRange.start)
                            ?.events.map((event, index) => (
                                <div
                                    key={index}
                                    onClick={() => selectEvent(event)}
                                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:shadow-md transition-all
                                group flex flex-col hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium">{event.title}</h3>
                                        <ChevronRight
                                            className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity"/>
                                    </div>
                                    <SkillTags
                                        skills={event.skills}
                                        maxVisible={3}
                                        onClick={() => selectEvent(event)}
                                    />
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Modal with newline handling */}
            {isModalOpen && selectedEvent && (
                <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
                    <div
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-[90%] max-w-[500px] overflow-hidden relative">
                        <div className="max-h-[80vh] overflow-y-auto">
                            <div className="p-6">
                                <button
                                    onClick={closeModal}
                                    className="absolute right-4 top-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    aria-label="Close modal"
                                >
                                    <X className="h-4 w-4"/>
                                </button>
                                <h3 className="text-xl font-semibold mb-4">{selectedEvent.title}</h3>
                                <div className="space-y-2 mb-4">
                                    {renderDescription(selectedEvent.description)}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                {renderSkillCategories(selectedEvent)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}