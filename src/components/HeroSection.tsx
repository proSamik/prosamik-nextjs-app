import React, { useState, useEffect } from 'react';
import { Terminal, Globe, Database, GitBranch, Monitor, Chrome, ArrowUpRight } from 'lucide-react';
import LoadingBar from "@/components/layout/LoadingBar";
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

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
    type: string;
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
            type: 'Web App',
            desc: 'Official portfolio showcasing projects and blogs',
            url: 'https://prosamik.com' 
        },
        { 
            icon: Globe, 
            title: 'githubme.com', 
            type: 'Web App',
            desc: 'Convert any GitHub README into a readable article format',
            url: 'https://githubme.com' 
        },
        { 
            icon: Database, 
            title: 'OnlineDB', 
            type: 'Web App',
            desc: 'Connect local or serverless databases to view and edit data easily',
            url: 'https://githubme.com/proSamik/database-viewer-in-web',
            status: 'Available Now'
        },
        { 
            icon: GitBranch, 
            title: 'Consistent Tracker', 
            type: 'Web App',
            desc: 'Track your consistency across GitHub, Twitter, Instagram, and YouTube',
            status: 'Coming Soon'
        },
        { 
            icon: Monitor, 
            title: 'FreeScreenshot', 
            type: 'macOS App',
            desc: 'Add beautiful colorful backgrounds to your Mac screenshots',
            url: 'https://githubme.com/proSamik/freescreenshot',
            status: 'Available Now'
        },
        { 
            icon: Chrome, 
            title: 'Tweet Copier', 
            type: 'Chrome Extension',
            desc: 'Save tweets and threads with one click for analysis and inspiration',
            url: 'https://githubme.com/proSamik/a-tweet-copier',
            status: 'Available Now'
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

            <div>
                <h2 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-6`}>My Products</h2>
                
                {/* Static grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-screen-xl mx-auto">
                    {myProducts.map(({ icon: Icon, title, desc, type, url, status }, index) => (
                        <div key={index} className="flex justify-center">
                            <Link 
                                href={url || "#"}
                                className="group relative block h-full p-6 rounded-xl 
                                    transition-all duration-300 hover:-translate-y-2 cursor-pointer
                                    bg-white dark:bg-gray-900
                                    border border-gray-200 dark:border-gray-800
                                    shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]
                                    dark:shadow-[0_2px_15px_-3px_rgba(79,70,229,0.15)]
                                    hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.2),0_10px_20px_-2px_rgba(0,0,0,0.05)]
                                    dark:hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.25)]
                                    w-full max-w-sm"
                                style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}
                            >
                                {/* Icon and Type Tag Row */}
                                <div className="flex items-center mb-4">
                                    <Icon className="text-indigo-500 mr-3 flex-shrink-0" size={isMobile ? 20 : 24} />
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                        {type}
                                    </span>
                                </div>
                                
                                {/* Title and Arrow Section */}
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors pr-6`}>
                                        {title}
                                    </h3>
                                    <ArrowUpRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform flex-shrink-0" />
                                </div>
                                
                                {/* Description */}
                                <p className={`text-gray-600 dark:text-gray-300 ${isMobile ? 'text-xs leading-tight' : 'text-sm'} flex-grow line-clamp-3`}>
                                    {desc}
                                </p>
                                
                                {/* Status or URL */}
                                <div className="mt-auto pt-2">
                                    {url ? (
                                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:underline`}>
                                            Visit <Globe size={12} />
                                        </span>
                                    ) : (
                                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-orange-500 flex items-center gap-1`}>
                                            {status} <Terminal size={12} />
                                        </span>
                                    )}
                                </div>
                                
                                {/* Animated bottom bar - appears on hover */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                            </Link>
                        </div>
                    ))}
                </div>
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