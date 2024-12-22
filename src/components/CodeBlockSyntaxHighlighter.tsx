import React, {RefObject } from 'react';
import ReactDOM from 'react-dom/client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export const addCodeBlockSyntaxHighlighting = (contentRef: RefObject<HTMLDivElement>) => {
    // Ensure contentRef.current is not null before proceeding
    if (!contentRef.current) return;

    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((codeBlock) => {
        // Skip SVG blocks
        if (codeBlock.textContent?.trim().startsWith('<svg')) return;

        // Determine language
        const languageClass = Array.from(codeBlock.classList).find(cls => cls.startsWith('language-'));
        const language = languageClass ? languageClass.replace('language-', '') : 'plaintext';

        // Get original HTML content
        const originalHtml = codeBlock.getAttribute('data-original-html') || codeBlock.textContent || '';

        // Create wrapper for syntax highlighter and copy button
        const wrapper = document.createElement('div');
        wrapper.className = 'relative group my-4';

        // Create a container for the syntax highlighter
        const syntaxHighlighterContainer = document.createElement('div');
        wrapper.appendChild(syntaxHighlighterContainer);

        // Create copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'absolute top-2 right-2 z-10 p-1 bg-white border rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100';
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        `;
        wrapper.appendChild(copyButton);

        // Replace original code block
        if (codeBlock.parentElement) {
            codeBlock.parentElement.parentNode?.replaceChild(wrapper, codeBlock.parentElement);

            // Render syntax highlighter
            const root = ReactDOM.createRoot(syntaxHighlighterContainer);
            root.render(
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                        margin: '0',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        maxWidth: '100%',
                        overflowX: 'auto'
                    }}
                >
                    {originalHtml}
                </SyntaxHighlighter>
            );

            // Add copy functionality
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(originalHtml).then(() => {
                    copyButton.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;

                    setTimeout(() => {
                        copyButton.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        `;
                    }, 2000);
                });
            });
        }
    });
};