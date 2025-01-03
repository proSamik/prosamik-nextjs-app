// components/ContentPage.tsx
import React from 'react';
import Loading from "@/components/layout/Loading";
import ErrorMessage from "@/components/layout/ErrorMessage";
import ContentList from "@/components/ContentList";
import { useContentList } from "@/hooks/useContentList";

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
        <div className="w-full mx-auto">
            <div className="space-y-8">
                <ContentList
                    repos={data?.repos || []}
                    type={type}
                />
            </div>
        </div>
    );
}