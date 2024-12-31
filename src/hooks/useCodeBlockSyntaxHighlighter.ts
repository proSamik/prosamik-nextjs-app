import { RefObject, useEffect } from 'react';
import { addCodeBlockSyntaxHighlighting } from "@/components/article/CodeBlockSyntaxHighlighter";

// Update hook to handle isMobile dependency
export const useCodeBlockSyntaxHighlighter = (
    contentRef: RefObject<HTMLDivElement | null>,
    processedContent?: string | string[],
    isMobile?: boolean
) => {
    // Only trigger when the content or layout changes
    useEffect(() => {
        if (contentRef.current) {
            // Apply syntax highlighting
            addCodeBlockSyntaxHighlighting(contentRef as RefObject<HTMLDivElement>);
        }
    }, [contentRef, processedContent, isMobile]);  // Add isMobile here to track layout changes
};
