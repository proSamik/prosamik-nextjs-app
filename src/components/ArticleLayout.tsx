import { BackendResponse } from '@/types/article';
import Image from 'next/image';
import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import {
    TwitterShareButton,
    LinkedinShareButton,
    FacebookShareButton
} from 'react-share';
import {
    Share2 as ShareIcon,
    Linkedin,
    Twitter as TwitterIcon,
    Facebook as FacebookIcon
} from 'react-feather';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { formatDate } from '@/utils/dateUtils';
import { processYouTubeLinks } from '@/utils/contentProcessors/youtubeProcessor';
import { processCodeBlocks } from '@/utils/contentProcessors/codeBlockProcessor';
import { processSVGs } from '@/utils/contentProcessors/svgProcessor';
import { processInlineCode } from '@/utils/contentProcessors/inlineCodeProcessor';
import { processBlockquotes } from '@/utils/contentProcessors/blockquoteProcessor';
import { processListItems } from '@/utils/contentProcessors/listItemProcessor';
import { processCenteredMedia } from '@/utils/contentProcessors/mediaCenterProcessor';

interface ArticleLayoutProps {
    data: BackendResponse;
    content?: string;
}

const ArticleLayout = ({ data, content }: ArticleLayoutProps) => {
    const [processedContent, setProcessedContent] = useState("");
    const contentRef = useRef<HTMLDivElement>(null);

    const addCodeBlockSyntaxHighlighting = () => {
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

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const processContent = () => {
            const sourceContent = content || data.content;
            let processedHtml = sourceContent;
            processedHtml = processYouTubeLinks(processedHtml);
            processedHtml = processCodeBlocks(processedHtml);
            processedHtml = processSVGs(processedHtml);
            processedHtml = processInlineCode(processedHtml);
            processedHtml = processBlockquotes(processedHtml);
            processedHtml = processListItems(processedHtml);
            processedHtml = processCenteredMedia(processedHtml);
            setProcessedContent(processedHtml);
        };

        processContent();
    }, [data.content, content]);

    useEffect(() => {
        if (processedContent) {
            addCodeBlockSyntaxHighlighting();
        }
    }, [processedContent]);

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = data.metadata.title;

    return (
        <main className="max-w-[728px] mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-serif mb-4 text-center">
                    {data.metadata.title}
                </h1>
                <div className="flex justify-center space-x-4 mb-6">
                    <div className="flex items-center space-x-2 text-gray-700">
                        <Image
                            src={`https://github.com/${data.metadata.author}.png`}
                            alt={data.metadata.author}
                            width={48}
                            height={48}
                            className="rounded-full"
                            unoptimized
                        />
                        <div>
                            <div className="font-medium">{data.metadata.author}</div>
                            {data.metadata.lastUpdated && formatDate(data.metadata.lastUpdated)}
                        </div>
                    </div>
                </div>
            </header>

            <article className="prose prose-lg max-w-none">
                <div
                    ref={contentRef}
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                    className="github-markdown"
                />
            </article>

            <div className="flex gap-4 mt-8 items-center">
                <span className="text-gray-600 flex items-center">
                    <ShareIcon className="mr-2" size={20} />
                    Share
                </span>
                <TwitterShareButton
                    url={shareUrl}
                    title={shareTitle}
                    hashtags={['article']}
                >
                    <button className="p-2 rounded-full bg-blue-400 hover:bg-blue-500 text-white">
                        <TwitterIcon size={20} />
                    </button>
                </TwitterShareButton>
                <LinkedinShareButton
                    url={shareUrl}
                    title={shareTitle}
                >
                    <button className="p-2 rounded-full bg-blue-700 hover:bg-blue-800 text-white">
                        <Linkedin size={20} />
                    </button>
                </LinkedinShareButton>
                <FacebookShareButton
                    url={shareUrl}
                    hashtag={`#${shareTitle.replace(/\s+/g, '')}`}
                >
                    <button className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
                        <FacebookIcon size={20} />
                    </button>
                </FacebookShareButton>
            </div>
        </main>
    );
};

export default ArticleLayout;