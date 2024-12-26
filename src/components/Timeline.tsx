import { useState } from 'react';

const timelineData = [
    {
        year: "2023-2024",
        title: "Graduated and Worked as Trainee @rtCamp",
        description: "Gained hands-on experience in WordPress development and DevOps.",
        skills: ["#WordPress", "#DevOps"],
    },
    {
        year: "2022-2023",
        title: "GDSC Lead & E-Cell Secretary",
        description: "Led initiatives, managed events, and fostered innovation among peers.",
        skills: ["#Leadership", "#EventManagement"],
    },
];

export default function Timeline() {
    const [activeItem, setActiveItem] = useState<number | null>(null); // Allow number or null

    return (
        <div className="space-y-8 px-4 py-6">
            {timelineData.map((item, index) => (
                <div key={index}>
                    <div
                        onClick={() => setActiveItem(activeItem === index ? null : index)}
                        className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 p-4 rounded-lg transition"
                    >
                        <h3 className="text-xl font-semibold">{item.year}</h3>
                        <p className="text-gray-600 dark:text-gray-300">{item.title}</p>
                    </div>
                    {activeItem === index && (
                        <div className="mt-4 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
                            <p>{item.description}</p>
                            <div className="mt-2 space-x-2">
                                {item.skills.map((skill, i) => (
                                    <span
                                        key={i}
                                        className="bg-blue-500 text-white px-2 py-1 rounded-md text-sm"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
