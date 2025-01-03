import React, { useState, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { FaGithub } from "react-icons/fa";

export interface ItemCardProps {
    title: string;
    link: string;
    description?: string;
    tags?: string;
    views_count?: number;
    repoPath?: string;
    type?: string;
    isMobile?: boolean;
}

interface AnimatedWordProps {
    word: string;
    isActive: boolean;
    onComplete: () => void;
}

const AnimatedWord: React.FC<AnimatedWordProps> = ({ word, isActive, onComplete }) => {
    const [opacity, setOpacity] = useState(0);
    const [scale, setScale] = useState(0.5);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined;
        if (isActive) {
            setOpacity(1);
            setScale(1);

            timeoutId = setTimeout(() => {
                setOpacity(0);
                setScale(1.2);
                setTimeout(onComplete, 500);
            }, 1500);
        } else {
            setOpacity(0);
            setScale(0.5);
        }

        return () => clearTimeout(timeoutId);
    }, [isActive, onComplete]);

    return (
        <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                      text-4xl font-bold text-slate-700 dark:text-slate-200
                      transition-all duration-500 ease-in-out"
            style={{
                opacity,
                transform: `translate(-50%, -50%) scale(${scale})`,
            }}
        >
            {word}
        </span>
    );
};

const FinalTitle: React.FC<{ title: string, isVisible: boolean }> = ({ title, isVisible }) => {
    const [scale, setScale] = useState(0.5);
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (isVisible) {
            setScale(0.5);
            setOpacity(0);
            setTimeout(() => {
                setScale(1);
                setOpacity(1);
            }, 100);
        }
    }, [isVisible]);

    return (
        <div
            className="absolute inset-0 flex items-center justify-center p-6 text-center"
            style={{
                opacity,
                transform: `scale(${scale})`,
                transition: 'all 0.8s ease-out'
            }}
        >
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                {title}
            </h2>
        </div>
    );
};

export const StyledItemCard: React.FC<ItemCardProps> = ({
                                                            title,
                                                            link,
                                                            description = '',
                                                            tags = '',
                                                            views_count = 0,
                                                            repoPath = '',
                                                            type = '',
                                                            isMobile = false,
                                                        }) => {
    const [activeWordIndex, setActiveWordIndex] = useState(0);
    const setAnimationCycles = useState(0)[1];
    const [showFinalTitle, setShowFinalTitle] = useState(false);
    const [canAnimate, setCanAnimate] = useState(true); // Track if hover animation is allowed

    const tagList = tags ? tags.split(',').map(tag => tag.trim()) : [];

    const words = title
        .replace(/[[\]()]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const handleWordComplete = useCallback(() => {
        if (showFinalTitle) return;

        setActiveWordIndex((prev) => {
            const nextIndex = (prev + 1) % words.length;
            if (nextIndex === 0) {
                setAnimationCycles(cycles => {
                    const newCycles = cycles + 1;
                    if (newCycles >= 2) {
                        setShowFinalTitle(true);
                    }
                    return newCycles;
                });
            }
            return nextIndex;
        });
    }, [setAnimationCycles, showFinalTitle, words.length]);

    const handleHover = () => {
        if (showFinalTitle && canAnimate) {
            setShowFinalTitle(false);
            setActiveWordIndex(0);
            setAnimationCycles(1);
            setCanAnimate(false); // Prevent further hover animations until card is unhovered
        }
    };

    const handleMouseLeave = () => {
        setCanAnimate(true); // Reset the ability to animate on next hover
        setShowFinalTitle(true);
    };


    // Handle single word animation
    useEffect(() => {
        if (words.length === 1 && !showFinalTitle) {
            const timer = setTimeout(() => {
                setAnimationCycles(cycles => {
                    const newCycles = cycles + 1;
                    if (newCycles >= 2) {
                        setShowFinalTitle(true);
                    }
                    return newCycles;
                });
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [words.length, showFinalTitle, setAnimationCycles]);

    const getGitHubUrl = (fullPath: string): string => {
        const match = fullPath.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+/);
        return match ? match[0] : fullPath;
    };

    const handleGitHubClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(getGitHubUrl(repoPath), '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={`min-w-[24rem] max-w-[32rem] flex-1 m-4`}>
            <a href={link}
               className="block"
               onMouseEnter={handleHover}
               onMouseLeave={handleMouseLeave}
            >
                {/* Animated Placeholder */}
                <div className={`${isMobile ? 'h-44' : 'h-48'} relative overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700`}>
                    {/* Window Controls and Type Badge */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between h-full">
                            {/* Window Controls */}
                            <div className="flex items-center gap-2 px-4">
                                <div className="w-3 h-3 rounded-full bg-red-500 opacity-75 hover:opacity-100" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-75 hover:opacity-100" />
                                <div className="w-3 h-3 rounded-full bg-green-500 opacity-75 hover:opacity-100" />
                            </div>
                            {/* Type Badge */}
                            {type && (
                                <div className="px-4 mb-1">
                                    <span className="px-2.5 my-1 text-xs font-medium rounded-md

                                                   text-slate-600 dark:text-slate-300
                                                   border border-slate-300 dark:border-slate-600">
                                        {type}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subtle background pattern */}
                    <div className="absolute inset-0 pt-8 opacity-5">
                        <div className="h-full w-full bg-[linear-gradient(90deg,rgba(0,0,0,.1)_1px,transparent_0),linear-gradient(rgba(0,0,0,.1)_1px,transparent_0)] bg-[size:20px_20px]" />
                    </div>

                    {/* Animated content */}
                    <div className="relative h-full w-full pt-8 justify-center">
                        {!showFinalTitle ? (
                            words.map((word, index) => (
                                <AnimatedWord
                                    key={`${word}-${index}`}
                                    word={word}
                                    isActive={index === activeWordIndex}
                                    onComplete={handleWordComplete}
                                />
                            ))
                        ) : (
                            <FinalTitle title={title} isVisible={showFinalTitle} />
                        )}
                    </div>

                    {/* Type Badge moved to header */}
                </div>

                {/* Card Content */}
                <div className="bg-white dark:bg-slate-800 rounded-b-xl shadow-lg">
                    {/* Title Section */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                            {title}
                        </h2>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {tagList.slice(0, 6).map((tag) => (
                                <span
                                    key={tag}
                                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                        repoPath
                                            ? "border border-gray-500 dark:text-white text-gray-500 hover:text-white hover:bg-gray-500 dark:hover:bg-gray-400/70"
                                            : "bg-blue-500 text-white hover:bg-blue-600"
                                    }`}
                                >
                                    #{tag}
                                </span>
                            ))}
                            {tagList.length > 6 && (
                                <span className="px-3 py-1 text-sm rounded-full
                                               bg-slate-100 dark:bg-slate-700
                                               text-slate-600 dark:text-slate-300">
                                    +{tagList.length - 6} more
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Description and Footer */}
                    <div className="p-6">
                        {description && (
                            <p className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-3">
                                {description}
                            </p>
                        )}

                        {/* Footer */}
                        <div className="flex justify-between items-center mt-4">
                            {views_count > 0 && (
                                <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                                    <Eye size={18} />
                                    <span>{views_count}</span>
                                </div>
                            )}
                            {repoPath && (
                                <button
                                    onClick={handleGitHubClick}
                                    className="text-slate-600 dark:text-slate-400
                                             hover:text-slate-800 dark:hover:text-slate-200
                                             transition-colors duration-300"
                                    aria-label="View on GitHub"
                                >
                                    <FaGithub size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </a>
        </div>
    );
};

export default StyledItemCard;