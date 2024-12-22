import { RefObject, useEffect } from 'react';
import { addCodeBlockSyntaxHighlighting } from "@/components/CodeBlockSyntaxHighlighter";

export const useCodeBlockSyntaxHighlighter = (
    contentRef: RefObject<HTMLDivElement>,
    processedContent?: string
) => {
    useEffect(() => {
        if (contentRef.current) {
            addCodeBlockSyntaxHighlighting(contentRef);
        }
    }, [contentRef, processedContent]);
};