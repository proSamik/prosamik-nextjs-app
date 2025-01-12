import React, { RefObject, useRef  } from 'react';
import ReactDOM from 'react-dom/client';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toPng } from 'html-to-image';

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
                maxHeight: '500px',
            }}
        >
            {code}
        </SyntaxHighlighter>
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
        wrapper.appendChild(copyButton);

        // Create export button
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

            // Add export functionality
            exportButton.addEventListener('click', () => {
                const codeBlockElement = wrapper.querySelector('div') as HTMLDivElement;
                if (codeBlockElement) {
                    void exportCodeBlockAsImage(codeBlockElement);
                }
            });
        }
    });
};

const exportCodeBlockAsImage = async (codeBlockElement: HTMLDivElement) => {
    try {
        // Create a clone of the element to manipulate
        const clonedElement = codeBlockElement.cloneNode(true) as HTMLDivElement;

        // Modify the cloned element to remove scrollbars and improve export
        const prepareCloneForExport = (clone: HTMLDivElement) => {
            // Remove any hover or opacity classes
            clone.classList.remove('group', 'relative');

            // Find and modify the syntax highlighter pre element
            const preElement = clone.querySelector('pre');
            if (preElement) {
                Object.assign(preElement.style, {
                    overflow: 'hidden',
                    maxHeight: 'none',
                    margin: '0',
                    padding: '1rem',
                });
            }

            // Ensure no scrollbars
            Object.assign(clone.style, {
                overflow: 'hidden',
                maxHeight: 'none',
                height: 'auto'
            });
        };

        // Prepare the clone
        prepareCloneForExport(clonedElement);

        // Create a temporary container to render the clone
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.appendChild(clonedElement);
        document.body.appendChild(tempContainer);

        // Use html-to-image to capture the entire code block
        const dataUrl = await toPng(clonedElement, {
            cacheBust: true,
            pixelRatio: 5, // High-density pixel ratio
            quality: 1, // Highest quality
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left',
                overflow: 'hidden'
            },
            filter: (node) => {
                // Remove specific elements we don't want in the export
                if (node.classList?.contains('opacity-0')) return false;

                // Remove language tag
                else if (node.classList?.contains('text-xs')) return false;

                return true;
            },
            imagePlaceholder: '', // Optional placeholder
        });

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Create download link
        const link = document.createElement('a');
        link.download = `code-block-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    } catch (error) {
        console.error('Failed to export code block as image', error);
    }
};

// Main component that includes both syntax highlighting and styling
const CodeBlock = ({ language, code }: { language: string; code: string }) => {
    const codeBlockRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={codeBlockRef} className="p-2 dark:bg-gray-300 rounded relative group">
            <div className="bg-[#f8f8f8] dark:bg-[#282c34] rounded-lg overflow-hidden">
                <CodeBlockHeader language={language}/>
                <ThemedSyntaxHighlighter language={language} code={code}/>
            </div>
        </div>
    );
};
