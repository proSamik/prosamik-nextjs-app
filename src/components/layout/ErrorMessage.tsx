// components/layout/ErrorLayout.tsx
import React from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from "@/components/layout/Footer";
import { useRouter } from 'next/router';

interface ErrorLayoutProps {
    message: string;
    customSteps?: string[];
}

const ErrorMessage = ({ message, customSteps }: ErrorLayoutProps) => {
    const router = useRouter();
    const defaultSteps = [
        'Ensure the backend server is running',
        'Check your network connection',
        'Try refreshing the page',
        'Go back to home and try again'
    ];

    const troubleshootingSteps = customSteps || defaultSteps;

    return (
        <div className="flex flex-col md:flex-row justify-between bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="md:w-64">
                <Navigation />
            </div>

            <main className="max-w-[800px] pl-7 py-8 flex-grow">
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-[728px]">
                        {/* Error Icon */}
                        <div className="flex justify-center mb-6">
                            <svg
                                className="h-16 w-16 text-red-500 dark:text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        {/* Error Message */}
                        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
                            Content Not Available
                        </h2>
                        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                            {message}
                        </p>

                        {/* Troubleshooting Steps */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                            <p className="font-medium text-gray-900 dark:text-white mb-2">
                                Troubleshooting steps:
                            </p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                                {troubleshootingSteps.map((step, index) => (
                                    <li key={index} className="mb-1">{step}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Back to Home Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={() => router.push('/')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 dark:bg-gray-700
                                text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600
                                transition-colors"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                    />
                                </svg>
                                <span>Back to Home</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <div className="md:w-64">
                <Footer />
            </div>
        </div>
    );
};

export default ErrorMessage;