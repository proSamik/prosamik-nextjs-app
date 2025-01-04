'use client';
import React, { useState } from "react";
import { ChevronRight, MoreHorizontal, X } from "lucide-react";
import { TimelineEvent, TimePeriod, YearRange } from "@/types/timeline";

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

export default function Timeline({ timelineData }: TimelineProps) {
    const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(timelineData[0].yearRange);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const selectEvent = (event: TimelineEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    // Function to render description paragraphs
    const renderDescription = (description: string) => {
        return description.split('\n').map((paragraph, index) => (
            <p key={index} className="text-gray-600 dark:text-gray-300">
                {paragraph}
            </p>
        ));
    };

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

                {/* Events list */}
                <div className="md:w-2/3 bg-white dark:bg-gray-900 p-1 rounded-lg">
                    <div className="w-full text-center">
                        <h2 className="inline-flex items-center gap-2 text-xl font-bold mb-4 p-2 rounded-lg cursor-pointer transition-all
                            border-2 shadow-sm hover:shadow-md bg-blue-500 text-white border-blue-600 group">
                            <span>{`${selectedYearRange.start} - ${selectedYearRange.end}`}</span>
                            <MoreHorizontal className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity"/>
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Click on them to see more details</p>
                    </div>

                    <div className="mt-2 space-y-3">
                        {timelineData
                            .find((period) => period.yearRange.start === selectedYearRange.start)
                            ?.events.map((event, index) => (
                                <div
                                    key={index}
                                    onClick={() => selectEvent(event)}
                                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:shadow-md transition-all
                                    group flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    <h3 className="text-lg font-medium text-center flex-1">{event.title}</h3>
                                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity"/>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Modal with newline handling */}
            {isModalOpen && selectedEvent && (
                <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 relative">
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
                            {selectedEvent.skills.map((skill, index) => (
                                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}