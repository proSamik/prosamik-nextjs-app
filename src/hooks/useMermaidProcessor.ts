import { useEffect, RefObject } from 'react';
import mermaid from 'mermaid';

export const useMermaidProcessor = (
    contentRef: RefObject<HTMLDivElement | null>,
    contentString: string  // Changed from deps array to single string
) => {
    useEffect(() => {
        // Initialize mermaid
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
        });

        // Process any mermaid diagrams
        if (contentRef.current) {
            mermaid.contentLoaded();
        }
    }, [contentRef, contentString]); // No more spread operator
};