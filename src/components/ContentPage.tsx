import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from "@/components/layout/Footer";
import Loading from "@/components/layout/Loading";
import ErrorMessage from "@/components/layout/ErrorMessage";
import ContentList from "@/components/ContentList";
import CustomBackButton from "@/components/layout/CustomBackButton"
import CustomForwardButton from "@/components/layout/CustomForwardButton";
import {usePageAnalytics} from "@/hooks/usePageAnalytics";
import {useContentList} from "@/hooks/useContentList";

interface ContentPageProps {
    type: 'blog' | 'project';
}

export default function ContentPage({ type }: ContentPageProps) {
    const [isMobile, setIsMobile] = useState(false);
    const { data, error, loading } = useContentList({ type });
    const { trackPageView } = usePageAnalytics();

    useEffect(() => {
        void trackPageView(type + 's');
    }, [trackPageView, type]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    if (isMobile) {
        return (
            <div className="flex flex-col md:flex-row">
                <Navigation />
                <main
                    className={`max-w-[800px] mx-auto px-4 py-4`}
                    style={{
                        width: '100%',
                        marginTop: '60px',
                        marginBottom: '80px',
                    }}
                >
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomForwardButton />
                    </div>
                    <div className="space-y-8">
                        <ContentList
                            repos={data?.repos || []}
                            type={type}
                        />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-grow flex flex-col md:flex-row">
                <div className="md:w-64 flex-shrink-0">
                    <Navigation />
                </div>
                <main className="flex-grow max-w-[800px] w-full mx-auto px-4 py-4">
                    <div className="space-y-8">
                        <ContentList
                            repos={data?.repos || []}
                            type={type}
                        />
                    </div>
                </main>
                <div className="hidden md:block md:w-64 flex-shrink-0" />
            </div>
            <Footer />
        </div>
    );
}