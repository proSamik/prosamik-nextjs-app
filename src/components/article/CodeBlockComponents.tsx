import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { exportCodeBlockAsImage } from '@/utils/exportCodeBlock';

/**
 * CodeBlockHeader Component
 * Renders the header with language tag and window-like controls
 */
export const CodeBlockHeader = ({ language }: { language: string }) => {
    return (
        <div className="h-8 bg-[#f8f8f8] dark:bg-[#282c34] rounded-t-lg">
            <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-2 px-4">
                    <div className="w-3 h-3 rounded-full bg-red-500 opacity-75 hover:opacity-100 transition-opacity duration-200" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400 opacity-75 hover:opacity-100 transition-opacity duration-200" />
                    <div className="w-3 h-3 rounded-full bg-green-500 opacity-75 hover:opacity-100 transition-opacity duration-200" />
                </div>
                {language && (
                    <div className="px-4 mb-1">
                        <span className="px-2.5 my-1 text-xs font-medium rounded-md text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                            {language}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * ThemedSyntaxHighlighter Component
 * Provides syntax highlighting with dynamic theme support
 */
export const ThemedSyntaxHighlighter = ({ language, code }: { language: string; code: string }) => {
    // Use CSS media query for theme detection
    const [isDark, setIsDark] = React.useState(document.documentElement.classList.contains('dark'));

    React.useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    setIsDark(document.documentElement.classList.contains('dark'));
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <SyntaxHighlighter
            language={language}
            style={isDark ? oneDark : oneLight}
            customStyle={{
                margin: '0',
                padding: '1rem',
                background: 'inherit',
                maxWidth: '100%',
                overflowX: 'auto',
                minHeight: '50px',
                maxHeight: '500px',
            }}
        >
            {code}
        </SyntaxHighlighter>
    );
};

/**
 * Creates a copy button for code blocks
 * @param originalHtml The original HTML content to be copied
 * @returns HTMLButtonElement
 */
export const createCopyButton = (originalHtml: string): HTMLButtonElement => {
    const copyButton = document.createElement('button');
    copyButton.className = `
        absolute right-16 top-10 z-10
        bg-[#f8f8f8] dark:bg-[#282c34]
        text-gray-600 dark:text-gray-400
        px-2 py-1 rounded text-sm
        opacity-0 group-hover:opacity-100
        transition-opacity border
        border-gray-300 dark:border-gray-600
    `;
    copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
             fill="none" stroke="currentColor" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    `;

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(originalHtml).then(() => {
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" 
                     class="text-green-600 dark:text-green-400"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;

            setTimeout(() => {
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
                         fill="none" stroke="currentColor" 
                         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
            }, 2000);
        });
    });

    return copyButton;
};

/**
 * Creates an export button for code blocks
 * @param wrapper The wrapper div containing the code block
 * @returns HTMLButtonElement
 */
export const createExportButton = (wrapper: HTMLDivElement): HTMLButtonElement => {
    const exportButton = document.createElement('button');
    exportButton.className = `
        absolute right-5 top-10 z-10
        bg-[#f8f8f8] dark:bg-[#282c34]
        text-gray-600 dark:text-gray-400
        px-2 py-1 rounded text-sm
        opacity-0 group-hover:opacity-100
        transition-opacity border
        border-gray-300 dark:border-gray-600
    `;
    exportButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" 
             fill="none" stroke="currentColor" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    `;

    exportButton.addEventListener('click', () => {
        const codeBlockElement = wrapper.querySelector('div') as HTMLDivElement;
        if (codeBlockElement) {
            void exportCodeBlockAsImage(codeBlockElement);
        }
    });

    return exportButton;
};
