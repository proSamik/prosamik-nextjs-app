import React from 'react';
import ReactDOM from 'react-dom/client';
import {createCopyButton, createExportButton} from "@/components/article/CodeBlockComponents";
import {CodeBlock} from "@/components/article/CodeBlockRendrer";


/**
 * Adds syntax highlighting and interactive features to code blocks
 * @param contentRef React ref to the content container
 */
export const addCodeBlockSyntaxHighlighting = (contentRef: React.RefObject<HTMLDivElement> | null) => {
    if (!contentRef || !contentRef.current) return;

    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        // Skip if already processed or is SVG
        if (codeBlock.hasAttribute('data-processed') ||
            codeBlock.textContent?.trim().startsWith('<svg')) return;

        // Mark as processed
        codeBlock.setAttribute('data-processed', 'true');

        const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        const language = languageClass ? languageClass.replace('language-', '') : 'plaintext';
        const originalHtml = codeBlock.getAttribute('data-original-html') || codeBlock.textContent || '';

        const wrapper = document.createElement('div');
        wrapper.className = 'relative group my-4';

        const codeContainer = document.createElement('div');
        wrapper.appendChild(codeContainer);

        // Create copy button
        const copyButton = createCopyButton(originalHtml);
        wrapper.appendChild(copyButton);

        // Create export button
        const exportButton = createExportButton(wrapper);
        wrapper.appendChild(exportButton);

        // Replace original code block
        const preElement = codeBlock.closest('pre');
        if (preElement && preElement.parentNode) {
            preElement.parentNode.replaceChild(wrapper, preElement);

            // Render the code block
            const root = ReactDOM.createRoot(codeContainer);
            root.render(
                <CodeBlock
                    language={language}
                    code={originalHtml}
                />
            );
        }
    });
};


