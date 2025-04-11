import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Globe, Database, GitBranch, Monitor, Chrome, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    useEffect(() => {
        // Set up timer to cycle through build steps
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % steps.length);
        }, 2000);
        return () => clearInterval(timer);
    }, [steps.length]);

    // Auto-scrolling logic
    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        let scrollInterval: NodeJS.Timeout;
        let scrollDirection = 1; // 1 for right, -1 for left
        let pauseScroll = false;

        const startScrolling = () => {
            scrollInterval = setInterval(() => {
                if (pauseScroll) return;
                
                if (scrollContainer) {
                    // Calculate scroll position
                    const newScrollLeft = scrollContainer.scrollLeft + (2 * scrollDirection);
                    scrollContainer.scrollLeft = newScrollLeft;
                    
                    // Change direction if we reach the end
                    if (newScrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
                        scrollDirection = -1;
                    } else if (newScrollLeft <= 0) {
                        scrollDirection = 1;
                    }
                    
                    // Update arrow visibility
                    setShowLeftArrow(newScrollLeft > 10);
                    setShowRightArrow(newScrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth - 10);
                }
            }, 50);
        };

        startScrolling();

        // Pause auto-scrolling when user interacts
        const handleMouseEnter = () => { pauseScroll = true; };
        const handleMouseLeave = () => { pauseScroll = false; };
        const handleScroll = () => {
            if (scrollContainer) {
                setShowLeftArrow(scrollContainer.scrollLeft > 10);
                setShowRightArrow(scrollContainer.scrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth - 10);
            }
        };

        scrollContainer.addEventListener('mouseenter', handleMouseEnter);
        scrollContainer.addEventListener('mouseleave', handleMouseLeave);
        scrollContainer.addEventListener('scroll', handleScroll);

        return () => {
            clearInterval(scrollInterval);
            if (scrollContainer) {
                scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
                scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    // List of products with their details and icons
    const myProducts: ProductItem[] = [
        { 
            icon: Globe, 
            title: 'prosamik.com', 
            type: 'Website',
            desc: 'Official portfolio showcasing projects and blogs',
            url: 'https://prosamik.com' 
        },
        { 
            icon: Globe, 
            title: 'githubme.com', 
            type: 'Web Tool',
            desc: 'Convert any GitHub README into a readable article format',
            url: 'https://githubme.com' 
        },
        { 
            icon: Database, 
            title: 'OnlineDB', 
            type: 'Web App',
            desc: 'Connect local or serverless databases to view and edit data easily',
            status: 'Coming Soon'
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
            status: 'Coming Soon'
        },
        { 
            icon: Chrome, 
            title: 'Tweet Copier', 
            type: 'Chrome Extension',
            desc: 'Save tweets and threads with one click for analysis and inspiration',
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

            <div className="relative">
                <h2 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-6`}>My Products</h2>
                
                {/* Navigation arrows */}
                {showLeftArrow && (
                    <button 
                        onClick={scrollLeft}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md z-10 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <ChevronLeft size={24} className="text-gray-700 dark:text-gray-300" />
                    </button>
                )}
                
                {showRightArrow && (
                    <button 
                        onClick={scrollRight}
                        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md z-10 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <ChevronRight size={24} className="text-gray-700 dark:text-gray-300" />
                    </button>
                )}
                
                {/* Horizontal scrolling container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex space-x-6 py-4 overflow-x-auto scrollbar-hide scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {myProducts.map(({ icon: Icon, title, desc, type, url, status }, index) => (
                        <div key={index} style={{ minWidth: '320px', maxWidth: '320px', height: '240px' }}>
                            <Link 
                                href={url || "#"}
                                className="group relative block h-full p-6 rounded-xl 
                                    transition-all duration-300 hover:-translate-y-1 cursor-pointer
                                    bg-white dark:bg-gray-900
                                    border border-gray-200 dark:border-gray-800
                                    shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]
                                    dark:shadow-[0_2px_15px_-3px_rgba(79,70,229,0.15)]
                                    hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.2),0_10px_20px_-2px_rgba(0,0,0,0.05)]
                                    dark:hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.25)]"
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Type Badge */}
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                        {type}
                                    </span>
                                </div>
                                
                                {/* Title and Arrow Section */}
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors pr-8">
                                        {title}
                                    </h3>
                                    <ArrowUpRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform flex-shrink-0" />
                                </div>
                                
                                {/* Icon */}
                                <Icon className="text-indigo-500 mb-4" size={24} />
                                
                                {/* Description */}
                                <p className="text-gray-600 dark:text-gray-300 text-sm flex-grow">
                                    {desc}
                                </p>
                                
                                {/* Status or URL */}
                                <div className="mt-auto pt-4">
                                    {url ? (
                                        <span className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:underline">
                                            Visit <Globe size={14} />
                                        </span>
                                    ) : (
                                        <span className="text-sm text-orange-500 flex items-center gap-1">
                                            {status} <Terminal size={14} />
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