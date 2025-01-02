import React, { useState, useEffect } from 'react';
import { Terminal, Rocket, Timer, Server, GitMerge } from 'lucide-react';
import LoadingBar from "@/components/layout/LoadingBar";

interface HeroSectionProps {
    isMobile: boolean;
    onBuildsClick: () => void;
    onLogsClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ isMobile, onBuildsClick, onLogsClick  }) => {
    const [step, setStep] = useState(0);
    const steps = ['Initializing build...', 'Optimizing for speed...', 'Removing complexity...', 'Ready to ship! 🚀'];

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % steps.length);
        }, 2000);
        return () => clearInterval(timer);
    }, [steps.length]);

    const buildPhilosophy = [
        { icon: Rocket, title: 'Ship Fast, Refactor Later', desc: 'Focus on core functionality first' },
        { icon: GitMerge, title: 'Pragmatic > Perfect', desc: 'Make practical engineering decisions' },
        { icon: Server, title: 'Build for Scale', desc: 'Start simple, design for growth' },
        { icon: Timer, title: 'Automate Everything', desc: 'Eliminate manual operations' },
    ] as const;



    return (
        <div className={`flex flex-col ${isMobile ? 'px-6 space-y-5' : 'px-4 pt-4 space-y-10'}`}>
            <div className="space-y-10">
                    <LoadingBar />
            <div className={`${isMobile ? '' : 'space-y-8'}`}>


            </div>
                <h1 className={`font-bold ${isMobile ? 'text-4xl' : 'text-6xl leading-tight'}`}>
                    Building Products That
                    <span className="block text-blue-500 animate-pulse">Ship Fast</span>
                </h1>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} opacity-80 leading-relaxed`}>
                    Transforming ideas into shipped products through pragmatic engineering
                    {!isMobile && (<>
                        .
                        <br/>
                        No over-engineering, just right solutions.
                    </>)}
                </p>
            </div>

            <div className="bg-zinc-800 dark:bg-black/40 rounded-lg p-8 font-mono text-sm text-green-400 relative overflow-hidden w-full">
                <div className="flex items-center gap-2 mb-2">
                    <Terminal size={16}/>
                    <span>build-to-ship init project</span>
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

            <div className={` py-6 grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-6`}>
                {buildPhilosophy.map(({ icon: Icon, title, desc }, index) => (
                    <div
                        key={index}
                        className="p-3 rounded-lg transform hover:-translate-y-1 transition-all backdrop-blur-md bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 dark:from-gray-800/75 dark:via-gray-800/85 dark:to-gray-900/90 border-2 border-slate-300 dark:border-white/10 shadow-lg dark:shadow-black/20"
                    >
                        <Icon className="text-blue-500 mb-4" size={24} />
                        <h3 className="font-semibold mb-2">{title}</h3>
                        <p className="text-sm opacity-70">{desc}</p>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 justify-center">
                <button
                    onClick={onLogsClick}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    See Latest Builds
                </button>
                <button
                    onClick={onBuildsClick}
                    className="border border-blue-500 text-blue-500 px-6 py-2 rounded-lg hover:bg-blue-50  hover:text-gray-700 transition-colors">
                    Read Build Logs
                </button>
            </div>
        </div>
    );
};

export default HeroSection;