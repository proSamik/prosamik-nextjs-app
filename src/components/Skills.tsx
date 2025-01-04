import { useState, useEffect } from 'react';

export default function Skills() {
    const technicalSkills = {
        projectImplementation: ["#Android", "#DevOps"],
        languages: ["#JavaScript", "#Kotlin", "#GoLang"],
        knowBasics: ["#HTML", "#CSS"]
    };

    const nonTechnicalSkills = {
        softSkills: ["Team Management", "Community Building", "Leadership"],
        personalInterests: ["Bicycle Riding", "Bike & Car Driving", "Traveling", "Adventure"]
    };

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 640); // Adjust based on your preferred breakpoint
        };

        handleResize(); // Run on initial render
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="py-2">
            <h2 className="text-2xl font-bold mb-4 pb-2 text-center">- Skills -</h2>

            {/* Flex container for both Technical and Non-Technical sections */}
            <div className={`flex justify-center gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>

                {/* Technical Skills */}
                <div className={`w-full p-4 border-2 ${isMobile ? 'border-gray-500' : 'border-blue-500'} rounded-lg hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-blue-700 dark:hover:text-white transition duration-200`}>
                    <h3 className="text-xl font-semibold mb-2 text-center">Technical Skills</h3>

                    <div>
                        <h4 className="font-semibold text-lg">Project Implementation</h4>
                        <div className="flex flex-wrap gap-2">
                            {technicalSkills.projectImplementation.map((skill, index) => (
                                <span key={index} className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <h4 className="font-semibold text-lg">Languages</h4>
                        <div className="flex flex-wrap gap-2">
                            {technicalSkills.languages.map((skill, index) => (
                                <span key={index} className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <h4 className="font-semibold text-lg">Know Basics</h4>
                        <div className="flex flex-wrap gap-2">
                            {technicalSkills.knowBasics.map((skill, index) => (
                                <span key={index} className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Non-Technical Skills */}
                <div className={`w-full p-4 border-2 ${isMobile ? 'border-gray-500' : 'border-gray-500'} rounded-lg hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-white transition duration-200`}>
                    <h3 className="text-xl font-semibold mb-2 text-center">Complimentary Skills</h3>

                    <div>
                        <h4 className="font-semibold text-lg">Soft Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {nonTechnicalSkills.softSkills.map((skill, index) => (
                                <span key={index} className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <h4 className="font-semibold text-lg">Personal Interests</h4>
                        <div className="flex flex-wrap gap-2">
                            {nonTechnicalSkills.personalInterests.map((interest, index) => (
                                <span key={index} className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm">
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
