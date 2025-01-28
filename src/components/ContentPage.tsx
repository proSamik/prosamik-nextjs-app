// components/ContentPage.tsx
import React, { Suspense } from 'react';
import Loading from "@/components/layout/Loading";
import ErrorMessage from "@/components/layout/ErrorMessage";
import { useContentList } from "@/hooks/useContentList";

// Lazy load the ContentList component
const ContentList = React.lazy(() => import("@/components/ContentList"));

interface ContentPageProps {
    type: 'blog' | 'project';
}

export default function ContentPage({ type }: ContentPageProps) {
    // Keep only the data fetching logic
    const { data, error, loading } = useContentList({ type });

    // Loading and error states
    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    // Main content render
    return (
        <div className="w-fit mx-auto">
            <div className="text-center space-y-4 my-5 dark:animate-pulse ">
                <h1 className="text-4xl sm:text-5xl font-bold dark:text-white relative">
                    Only{'  '}
                    <span className="relative inline-block">
                        Website
                        {/* Accent line overlay */}
                        <span
                            className="absolute -inset-x-2 -inset-y-4 dark:bg-white/30 -rotate-3 transform bg-black/30"
                            style={{
                                clipPath: 'polygon(0% 55%, 100% 30%, 40% 80%, -10% 65%)'
                            }}
                        />
                        </span>{'  '}
                    that uses{' '}
                    <a
                        href="https://prosamik.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                         GitHub for articles
                    </a>
                </h1>
            </div>
            <div className="space-y-8">
                <Suspense fallback={<Loading />}>
                    <ContentList
                        repos={data?.repos || []}
                        type={type}
                    />
                </Suspense>
            </div>
        </div>
    );
}