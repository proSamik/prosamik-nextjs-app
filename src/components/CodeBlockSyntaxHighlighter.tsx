import React, {RefObject } from 'react';
import ReactDOM from 'react-dom/client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {oneDark, oneLight} from 'react-syntax-highlighter/dist/cjs/styles/prism';



export const addCodeBlockSyntaxHighlighting = (contentRef: RefObject<HTMLDivElement> | null) => {
    // Explicit null check with type guard
    if (!contentRef || !contentRef.current) return;

    const highlightCode = () => {

        const isDarkMode = document.documentElement.classList.contains('dark');
        if (!contentRef.current) return; // Gracefully handle null reference
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
            copyButton.className = `
                                absolute top-2 right-2 z-10 p-1 
                                bg-white dark:bg-gray-800 
                                border border-gray-200 dark:border-gray-600 
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700 
                                transition-colors 
                                opacity-0 group-hover:opacity-100
                            `;
            copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
                 fill="none" 
                 stroke="currentColor" 
                 class="stroke-gray-700 dark:stroke-gray-300"
                 stroke-width="2" 
                 stroke-linecap="round" 
                 stroke-linejoin="round">
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
                        style={isDarkMode ? oneDark : oneLight}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
                             fill="none" 
                             stroke="green" 
                             class="stroke-green-600 dark:stroke-green-400"
                             stroke-width="2" 
                             stroke-linecap="round" 
                             stroke-linejoin="round">
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
    }


    highlightCode();

    // Listen for theme changes
    const themeChangeListener = () => {
        highlightCode();
    };

    window.addEventListener('themeChange', themeChangeListener);

    // Clean up listener when component unmounts
    return () => {
        window.removeEventListener('themeChange', themeChangeListener);
    };

};