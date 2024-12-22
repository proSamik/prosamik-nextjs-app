import { RefObject, useEffect } from 'react';
import { addCodeBlockSyntaxHighlighting } from "@/components/CodeBlockSyntaxHighlighter";

export const useCodeBlockSyntaxHighlighter = (
    contentRef: RefObject<HTMLDivElement | null>,
    processedContent?: string | string[]
) => {
    const dependenciesKey = JSON.stringify(processedContent || []);

    useEffect(() => {
        if (contentRef.current) {
            addCodeBlockSyntaxHighlighting(contentRef as RefObject<HTMLDivElement>);
        }
    }, [contentRef, dependenciesKey]);
};
