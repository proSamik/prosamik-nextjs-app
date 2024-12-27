import React, { useState } from 'react';
import { X } from 'lucide-react';

interface TimelineEvent {
    title: string;
    description: string;
    skills: string[];
}

interface YearRange {
    start: string;
    end: string;
}

interface TimePeriod {
    yearRange: YearRange;
    events: TimelineEvent[];
}

const timelineData: TimePeriod[] = [
    {
        yearRange: {
            start: "2024",
            end: "Present"
        },
        events: [
            {
                title: "DevOps Engineer @rtCamp",
                description: "Working on AWS infrastructure, CI/CD pipelines, and automation using Terraform and Ansible.",
                skills: ["#AWS", "#Terraform", "#Docker", "#CI/CD", "#Linux"]
            },
            {
                title: "Open Source Contributions",
                description: "Contributing to WordPress Core and developing custom solutions for enterprise clients.",
                skills: ["#WordPress", "#PHP", "#JavaScript", "#OpenSource"]
            }
        ]
    },
    {
        yearRange: {
            start: "2023",
            end: "2024"
        },
        events: [
            {
                title: "DevOps Trainee @rtCamp",
                description: "Learned and implemented DevOps practices, cloud infrastructure, and automation techniques.",
                skills: ["#DevOps", "#AWS", "#Docker", "#GitLab"]
            },
            {
                title: "Tech Community Leadership",
                description: "Led multiple tech communities, organized workshops and hackathons, fostering collaboration and learning.",
                skills: ["#Leadership", "#Community", "#EventManagement"]
            }
        ]
    },
    {
        yearRange: {
            start: "2022",
            end: "2023"
        },
        events: [
            {
                title: "GDSC Lead",
                description: "Led Google Developer Student Clubs chapter, organized tech events and workshops focused on Google technologies.",
                skills: ["#GoogleCloud", "#Android", "#Leadership"]
            },
            {
                title: "E-Cell Secretary",
                description: "Managed entrepreneurship initiatives, startup mentoring sessions, and innovation challenges.",
                skills: ["#Entrepreneurship", "#EventManagement", "#Strategy"]
            }
        ]
    },
    {
        yearRange: {
            start: "2021",
            end: "2022"
        },
        events: [
            {
                title: "Android Study Jams Lead",
                description: "Conducted Android development workshops and mentored students in building mobile applications.",
                skills: ["#Android", "#Kotlin", "#Teaching"]
            },
            {
                title: "Technical Writing",
                description: "Published technical articles and documentation on various development topics and best practices.",
                skills: ["#TechnicalWriting", "#Documentation", "#Blogging"]
            }
        ]
    },
    {
        yearRange: {
            start: "2017",
            end: "2020"
        },
        events: [
            {
                title: "Web Development Intern",
                description: "Developed responsive websites and web applications using modern frameworks and tools.",
                skills: ["#React", "#JavaScript", "#CSS", "#WebDev"]
            },
            {
                title: "Hackathon Winner",
                description: "Won first place in college hackathon for developing an innovative solution for online education.",
                skills: ["#Innovation", "#ProblemSolving", "#TeamWork"]
            },
            {
                title: "Programming Club Lead",
                description: "Founded and led the college programming club, organizing coding competitions and practice sessions.",
                skills: ["#DSA", "#Mentoring", "#PeerLearning"]
            },
            {
                title: "First Open Source Contribution",
                description: "Started contributing to open source projects and learning collaborative development practices.",
                skills: ["#OpenSource", "#Git", "#Collaboration"]
            }
        ]
    }
];

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

export default function Timeline() {
    const [selectedYearRange, setSelectedYearRange] = useState<YearRange>(timelineData[0].yearRange);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const handleEventClick = (event: TimelineEvent): void => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    // Calculate number of columns needed (3 years per column)
    const columns = Math.ceil(timelineData.length / 3);

    return (
        <div className="w-full">
            <h1 className="text-2xl font-bold text-center mb-8">Timeline</h1>
            <div className="flex flex-col md:flex-row gap-2 space-x-4">
                {/* Year blocks grid */}
                <div className="md:w-2/3 grid grid-cols-2 gap-2">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={colIndex} className="space-y-4">
                            {timelineData
                                .slice(colIndex * 3, (colIndex + 1) * 3)
                                .map((period: TimePeriod) => (
                                    <div
                                        key={period.yearRange.start}
                                        onClick={() => setSelectedYearRange(period.yearRange)}
                                        className={`aspect-square p-4 rounded-lg cursor-pointer transition-all
                                            flex flex-col border-2 relative
                                            ${selectedYearRange.start === period.yearRange.start
                                            ? 'bg-blue-500 text-white border-blue-600'
                                            : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'
                                        } shadow-sm hover:shadow-md`}
                                    >
                                        {/* Top row with milestones and calendar */}
                                        <div className="flex justify-between items-start">
                                            <div className="text-sm text-nowrap opacity-60 ">
                                                {period.events.length} milestone{period.events.length !== 1 ? 's' : ''}
                                            </div>
                                            <CalendarIcon />
                                        </div>

                                        {/* Centered year range */}
                                        <div className="flex ">
                                            <div className="flex items-center w-full font-medium justify-center">
                                                <span className="text-lg ">{period.yearRange.start}</span>
                                                <span className="text-lg ">-</span>
                                                <span className="text-lg ">{period.yearRange.end}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ))}
                </div>

                {/* Events list */}
                <div className="md:w-2/3 bg-white dark:bg-gray-900 p-1 rounded-lg ">
                    <div className="w-full text-center">
                        <h2 className="inline-block text-xl font-bold mb-4 p-3 rounded-lg cursor-pointer transition-all
                  border-2 shadow-sm hover:shadow-md bg-blue-500 text-white border-blue-600">
                            {`${selectedYearRange.start} - ${selectedYearRange.end}`}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {timelineData
                            .find((period) => period.yearRange.start === selectedYearRange.start)
                            ?.events.map((event: TimelineEvent, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => handleEventClick(event)}
                                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer
                                        hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-600"
                                >
                                    <h3 className="text-lg font-medium">{event.title}</h3>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Modal for event details */}
            {isModalOpen && (
                <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
                    <div
                        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96 relative border border-gray-300 dark:border-gray-600">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute right-4 top-4 p-2 hover:bg-gray-200
                                dark:hover:bg-gray-700 rounded-full transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="mt-2">
                            <h3 className="text-xl font-semibold text-gray-900
                                dark:text-white mb-4 pr-8">
                                {selectedEvent?.title}
                            </h3>

                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {selectedEvent?.description}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {selectedEvent?.skills.map((skill: string, index: number) => (
                                    <span
                                        key={index}
                                        className="bg-blue-100 dark:bg-blue-900 text-blue-800
                                            dark:text-blue-100 px-2 py-1 rounded-md text-sm"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}