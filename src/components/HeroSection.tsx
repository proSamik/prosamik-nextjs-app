import React, { useState, useEffect } from 'react';
import { Terminal, Globe, Github, Package, Rocket, Timer } from 'lucide-react';
import LoadingBar from "@/components/layout/LoadingBar";
import { LucideIcon } from 'lucide-react';

interface HeroSectionProps {
    isMobile: boolean;
    onBuildsClick: () => void;
    onLogsClick: () => void;
}

// Define interface for product objects with proper typing for Lucide icons
interface ProductItem {
    icon: LucideIcon;
    title: string;
    desc: string;
    url?: string;
    status?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ isMobile, onBuildsClick, onLogsClick  }) => {
    const [step, setStep] = useState(0);
    const steps = ['Initializing build...', 'Optimizing for speed...', 'Removing complexity...', 'Ready to ship! 🚀'];

    useEffect(() => {
        // Set up timer to cycle through build steps
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % steps.length);
        }, 2000);
        return () => clearInterval(timer);
    }, [steps.length]);

    // List of products with their details and icons
    const myProducts: ProductItem[] = [
        { 
            icon: Globe, 
            title: 'prosamik.com', 
            desc: 'Official Website of Samik Choudhury',
            url: 'https://prosamik.com' 
        },
        { 
            icon: Github, 
            title: 'githubme.com', 
            desc: 'Convert README.md files into readable articles',
            url: 'https://githubme.com' 
        },
        { 
            icon: Package, 
            title: 'SaaS Kit', 
            desc: 'A scalable foundation for SaaS applications',
            status: 'Coming Soon'
        },
        { 
            icon: Rocket, 
            title: 'n8n Templates', 
            desc: 'Free automation workflows',
            status: 'Coming Soon'
        },
    ];

    return (
        <div className={`flex flex-col ${isMobile ? 'px-6 space-y-5' : 'px-4 pt-4 space-y-10'}`}>
            <div className="space-y-10">
                    <LoadingBar />
            <div className={`${isMobile ? '' : 'space-y-8'}`}>


            </div>
                <h1 className={`font-bold ${isMobile ? 'text-4xl' : 'text-6xl leading-tight'}`}>
                    Samik&apos;s Solopreneur Toolkit
                    <div className="mt-6 mb-2 text-xl text-gray-700 dark:text-gray-300 font-medium">Save on what matters:</div>
                    <div className="flex flex-wrap gap-3 mt-2">
                        <span className="px-4 py-2 bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-200 text-base font-medium rounded-full flex items-center">
                            <span className="mr-1">Time</span> <span className="text-xl">⏳</span>
                        </span>
                        <span className="px-4 py-2 bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-200 text-base font-medium rounded-full flex items-center">
                            <span className="mr-1">Effort</span> <span className="text-xl">👨‍💻</span>
                        </span>
                        <span className="px-4 py-2 bg-teal-200 text-teal-900 dark:bg-teal-800 dark:text-teal-200 text-base font-medium rounded-full flex items-center">
                            <span className="mr-1">Money</span> <span className="text-xl">💰</span>
                        </span>
                    </div>
                </h1>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} opacity-80 leading-relaxed`}>
                    Simple tools and templates that help developers work smarter, not harder
                    {!isMobile && (<>
                        .
                        <br/>
                        Designed to save you time, effort, and money on your next project.
                    </>)}
                </p>
            </div>

            <div className="bg-zinc-800 dark:bg-black/40 rounded-lg p-8 font-mono text-sm text-green-400 relative overflow-hidden w-full">
                <div className="flex items-center gap-2 mb-2">
                    <Terminal size={16}/>
                    <span>init most-effective-project</span>
                </div>
                <div className="space-y-1">
                    {isMobile ? (
                        <div>{steps[step]}</div>
                    ) : (
                        steps.map((text, index) => (
                            <div
                                key={index}
                                className={`transform transition-all duration-500 ${
                                    index === step ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                                }`}
                            >
                                $ {text}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <h2 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mt-6`}>My Products</h2>

            <div className={` py-2 grid ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'} gap-6`}>
                {myProducts.map(({ icon: Icon, title, desc, url, status }, index) => (
                    <div
                        key={index}
                        className="group relative flex flex-col p-6 bg-white dark:bg-gray-900 shadow-blue-200 dark:shadow-blue-200 dark:shadow-sm shadow-lg rounded-lg hover:shadow-xl transition-all duration-200"
                    >
                        <Icon className="text-blue-500 mb-4" size={28} />
                        <h3 className="font-semibold mb-2">{title}</h3>
                        <p className="text-sm opacity-70 mb-3">{desc}</p>
                        {url ? (
                            <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                            >
                                Visit <Globe size={14} />
                            </a>
                        ) : (
                            <span className="text-sm text-amber-500 flex items-center gap-1">
                                {status} <Timer size={14} />
                            </span>
                        )}
                    </div>
                ))}
            </div>

            

            <div className="flex gap-4 justify-center">
                <button
                    onClick={onLogsClick}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Explore Featured Projects
                </button>
                <button
                    onClick={onBuildsClick}
                    className="border border-blue-500 text-blue-500 px-6 py-2 rounded-lg hover:bg-blue-50  hover:text-gray-700 transition-colors">
                    View Recent Blogs
                </button>
            </div>
        </div>
    );
};

export default HeroSection;