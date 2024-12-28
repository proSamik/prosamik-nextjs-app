import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import ArticleHeader from './ArticleHeader';
import useProcessedContent from '@/hooks/useProcessedContent';
import {ArticleLayoutProps} from "@/types/article"; // Reuse the same custom hook

const ProjectLayout = ({ data, content }: ArticleLayoutProps) => {
    const { processedContent, contentRef, isMobile, shareUrl } = useProcessedContent(data, content);

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
                    width: isMobile ? '100%' : 'auto',
                    marginTop: isMobile ? '60px' : '0',
                    marginBottom: isMobile ? '60px' : '0',
                }}
            >
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

export default ProjectLayout;
