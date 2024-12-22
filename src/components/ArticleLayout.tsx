import React, { useEffect, useRef, useState } from 'react';
import { BackendResponse } from '@/types/article';
import ThemeToggle from '@/components/ThemeToggle';

import { processYouTubeLinks } from '@/utils/contentProcessors/youtubeProcessor';
import { processCodeBlocks } from '@/utils/contentProcessors/codeBlockProcessor';
import { processSVGs } from '@/utils/contentProcessors/svgProcessor';
import { processInlineCode } from '@/utils/contentProcessors/inlineCodeProcessor';
import { processBlockquotes } from '@/utils/contentProcessors/blockquoteProcessor';
import { processListItems } from '@/utils/contentProcessors/listItemProcessor';
import { processCenteredMedia } from '@/utils/contentProcessors/mediaCenterProcessor';

import ArticleHeader from './ArticleHeader';
import { useCodeBlockSyntaxHighlighter } from '@/hooks/useCodeBlockSyntaxHighlighter';

interface ArticleLayoutProps {
    data: BackendResponse;
    content?: string;
}

const ArticleLayout = ({ data, content }: ArticleLayoutProps) => {
    const [processedContent, setProcessedContent] = useState("");
    const contentRef = useRef<HTMLDivElement>(null);

    useCodeBlockSyntaxHighlighter(contentRef, [processedContent]);

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
    }, [data.content, content]);

    // Add effect to handle list marker changes
    useEffect(() => {
        const updateListMarkers = () => {
            const htmlElement = document.documentElement;
            const lists = document.querySelectorAll('.github-markdown ul');

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

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <main className="max-w-[728px] mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <ArticleHeader
                    data={data}
                    shareUrl={shareUrl}
                />
                <ThemeToggle />
            </div>

            <article className="prose prose-lg max-w-none dark:prose-invert">
                <div
                    ref={contentRef}
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                    className="github-markdown"
                />
            </article>
        </main>
    );
};

export default ArticleLayout;