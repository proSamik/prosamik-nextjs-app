import React, { useEffect, useRef, useState } from 'react';
import { BackendResponse } from '@/types/article';

import { processYouTubeLinks } from '@/utils/contentProcessors/youtubeProcessor';
import { processCodeBlocks } from '@/utils/contentProcessors/codeBlockProcessor';
import { processSVGs } from '@/utils/contentProcessors/svgProcessor';
import { processInlineCode } from '@/utils/contentProcessors/inlineCodeProcessor';
import { processBlockquotes } from '@/utils/contentProcessors/blockquoteProcessor';
import { processListItems } from '@/utils/contentProcessors/listItemProcessor';
import { processCenteredMedia } from '@/utils/contentProcessors/mediaCenterProcessor';

import ArticleHeader from './ArticleHeader';
import { useCodeBlockSyntaxHighlighter } from '@/hooks/useCodeBlockSyntaxHighlighter';
import Navigation from '@/components/Navigation';

interface ArticleLayoutProps {
    data: BackendResponse;
    content?: string;
}

const ArticleLayout = ({ data, content }: ArticleLayoutProps) => {
    const [processedContent, setProcessedContent] = useState<string>("");
    const contentRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Syntax highlighter for code blocks
    useCodeBlockSyntaxHighlighter(contentRef, [processedContent, String(isMobile)]); // Added `isMobile` as dependency to trigger re-apply

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const processContent = () => {
            let processedHtml = content || data.content;
            processedHtml = processYouTubeLinks(processedHtml);
            processedHtml = processCodeBlocks(processedHtml);
            processedHtml = processSVGs(processedHtml);
            processedHtml = processInlineCode(processedHtml);
            processedHtml = processBlockquotes(processedHtml);
            processedHtml = processListItems(processedHtml);
            processedHtml = processCenteredMedia(processedHtml);
            setProcessedContent(processedHtml);
        };

        processContent();
    }, [content, data.content]);

    // Add effect to handle list marker changes based on theme
    useEffect(() => {
        if (!contentRef.current) return;

        const updateListMarkers = () => {
            const htmlElement = document.documentElement;
            const lists = document.querySelectorAll('.github-markdown ul');

            if (!htmlElement || !lists) return;

            if (htmlElement.classList.contains('dark')) {
                lists.forEach(list => list.classList.add('dark'));
            } else {
                lists.forEach(list => list.classList.remove('dark'));
            }
        };

        // Initial check
        updateListMarkers();

        // Add event listener for theme changes
        window.addEventListener('themeChange', updateListMarkers);

        // Cleanup
        return () => {
            window.removeEventListener('themeChange', updateListMarkers);
        };
    }, []);

    // Handle screen resizing to detect mobile vs. desktop
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090); // Adjust the breakpoint as needed
        };

        handleResize(); // Run initially
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className="flex flex-col md:flex-row">
            {/* Navigation component */}
            <Navigation />

            {/* Main content area */}
            <main
                className={`max-w-[728px] mx-auto px-4 py-8`}
                style={{
                    width: isMobile ? '100%' : 'auto',
                    marginTop: isMobile ? '60px' : '0', // Apply a fixed margin for mobile
                }}
            >
                {/* Article Header */}
                <div className="flex justify-between items-center mb-8">
                    <ArticleHeader
                        data={data}
                        shareUrl={shareUrl}
                    />
                </div>

                {/* Article Content */}
                <article className="prose prose-lg max-w-none dark:prose-invert">
                    <div
                        ref={contentRef}
                        dangerouslySetInnerHTML={{ __html: processedContent }}
                        className="github-markdown"
                    />
                </article>
            </main>
        </div>
    );
};

export default ArticleLayout;
