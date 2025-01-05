import { useEffect, useRef, useState } from 'react';
import { processYouTubeLinks } from "@/utils/contentProcessors/youtubeProcessor";
import { processCodeBlocks } from "@/utils/contentProcessors/codeBlockProcessor";
import { processSVGs } from "@/utils/contentProcessors/svgProcessor";
import { processInlineCode } from "@/utils/contentProcessors/inlineCodeProcessor";
import { processBlockquotes } from "@/utils/contentProcessors/blockquoteProcessor";
import { processListItems } from "@/utils/contentProcessors/listItemProcessor";
import { processCenteredMedia } from "@/utils/contentProcessors/mediaCenterProcessor";
import { processTableContent } from "@/utils/contentProcessors/tableProcessor";
import { useCodeBlockSyntaxHighlighter } from "@/hooks/useCodeBlockSyntaxHighlighter";
import { useMermaidProcessor } from '@/hooks/useMermaidProcessor';

interface ContentData {
    content: string; // Adjust this type definition based on actual data structure
}

export default function useProcessedContent(data: ContentData, content?: string) {
    const [processedContent, setProcessedContent] = useState<string>("");
    const contentRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Syntax highlighter for code blocks
    useCodeBlockSyntaxHighlighter(contentRef, [processedContent, String(isMobile)]);

    useMermaidProcessor(contentRef, processedContent);

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    useEffect(() => {
        const processContent = () => {
            let processedHtml = content || data.content;
            processedHtml = processYouTubeLinks(processedHtml);
            processedHtml = processCodeBlocks(processedHtml);
            processedHtml = processSVGs(processedHtml);
            processedHtml = processInlineCode(processedHtml);
            processedHtml = processBlockquotes(processedHtml);
            processedHtml = processListItems(processedHtml);
            processedHtml = processCenteredMedia(processedHtml);
            processedHtml = processTableContent(processedHtml);
            setProcessedContent(processedHtml);
        };

        processContent();
    }, [content, data.content]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { processedContent, contentRef, isMobile, shareUrl };
}
