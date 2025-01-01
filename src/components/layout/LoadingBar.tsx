import {useEffect, useState} from "react";

const loadingSteps = [
    { message: "Scanning productivity shortcuts...", percent: 0 },
    { message: "Compiling time-saving strategies...", percent: 15 },
    { message: "Loading rapid deployment tools...", percent: 30 },
    { message: "Optimizing development workflows...", percent: 60 },
    { message: "Gathering efficiency templates...", percent: 85 },
    { message: "Finalizing acceleration toolkit...", percent: 95 },
    { message: "Your fast-track resources are ready!", percent: 100 }
] as const;


const LoadingBar = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCompleted(sessionStorage.getItem('loadingCompleted') === 'true');
        }
    }, []);

    useEffect(() => {
        if (completed) {
            setCurrentStep(loadingSteps.length - 1);
            return;
        }

        const timer = setInterval(() => {
            setCurrentStep(prev => {
                const next = (prev + 1) % loadingSteps.length;
                if (next === loadingSteps.length - 1) {
                    setCompleted(true);
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem('loadingCompleted', 'true');
                    }
                }
                return next;
            });
        }, 500);

        return () => clearInterval(timer);
    }, [completed]);

    const barColor = completed
        ? "bg-green-500"
        : "bg-green-500";

    return (
        <div className="h-24 flex items-end">
            <div className="w-full space-y-2">
                <div className="flex justify-end text-sm">
                    <span>{loadingSteps[currentStep].percent} % </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${barColor}`}
                        style={{ width: `${loadingSteps[currentStep].percent}`+ "%" }}
                    />
                </div>
                <p className="text-xs text-gray-500 transition-all duration-300">
                    {loadingSteps[currentStep].message}
                </p>
            </div>
        </div>
    );
};

export default LoadingBar;