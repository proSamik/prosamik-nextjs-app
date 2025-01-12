import React, { RefObject } from 'react';
import ReactDOM from 'react-dom/client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Header component for code blocks
const CodeBlockHeader = ({ language }: { language: string }) => {
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

// Themed syntax highlighter component
const ThemedSyntaxHighlighter = ({ language, code }: { language: string; code: string }) => {
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
                maxHeight: '300px'
            }}
        >
            {code}
        </SyntaxHighlighter>
    );
};

// Main component that includes both syntax highlighting and styling
const CodeBlock = ({ language, code }: { language: string; code: string }) => {
    return (
        <div className="dark:p-2  dark:bg-gray-300 rounded">
            <div className="bg-[#f8f8f8] dark:bg-[#282c34] rounded-lg overflow-hidden">
                <CodeBlockHeader language={language}/>
                <ThemedSyntaxHighlighter language={language} code={code}/>
            </div>

        </div>

    );
};

export const addCodeBlockSyntaxHighlighting = (contentRef: RefObject<HTMLDivElement> | null) => {
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
        const copyButton = document.createElement('button');
        copyButton.className = `
            absolute right-5 top-10 z-10
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
        wrapper.appendChild(copyButton);

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

            // Add copy functionality
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
        }
    });
};