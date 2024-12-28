import React, { useState, useEffect } from 'react';  // Added useState and useEffect
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import ArticleHeader from './ArticleHeader';
import useProcessedContent from '@/hooks/useProcessedContent';
import {ArticleLayoutProps} from "@/types/article";
import CustomBackButton from "@/components/CustomBackButton";
import CustomForwardButton from "@/components/CustomForwardButton";

const BlogLayout = ({ data, content }: ArticleLayoutProps) => {
    // Added manual mobile detection
    const [isMobileView, setIsMobileView] = useState(false);
    const { processedContent, contentRef, shareUrl } = useProcessedContent(data, content);

    // Added useEffect for window resize handling
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 1090);  // Using same breakpoint as before
        };

        // Initial check
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex flex-col md:flex-row justify-between">
            {/* Navigation */}
            <div className="md:w-64">
                <Navigation />
            </div>

            {/* Main content */}
            <main
                className="max-w-[768px] pl-7 py-8"
                style={{
                    width: isMobileView ? '100%' : 'auto',
                    marginTop: isMobileView ? '60px' : '0',
                    marginBottom: isMobileView ? '60px' : '0',
                }}
            >
                {/* Navigation Buttons Row - Only shown on mobile */}
                {isMobileView && (
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomForwardButton />
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <ArticleHeader data={data} shareUrl={shareUrl} />
                </div>

                {/* Content */}
                <article className="prose prose-lg max-w-none dark:prose-invert">
                    <div
                        ref={contentRef}
                        dangerouslySetInnerHTML={{ __html: processedContent }}
                        className="github-markdown"
                    />
                </article>
            </main>

            {/* Footer */}
            <div className="md:w-64">
                <Footer />
            </div>
        </div>
    );
};

export default BlogLayout;