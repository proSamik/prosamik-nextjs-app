"use client"; // Mark as a client-side component

import { BackendResponse } from '@/types/article';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface ArticleLayoutProps {
    data: BackendResponse;
}

const ArticleLayout = ({ data }: ArticleLayoutProps) => {
    const [processedContent, setProcessedContent] = useState<string>("");

    // Updated formatDate function to handle ISO string with timezone
    const formatDate = (dateString: string): string => {
        try {
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.error('Invalid date:', dateString);
                return '';
            }

            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
            }).format(date);
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString; // Return original string if formatting fails
        }
    };

    // Remove HTML comments from content
    const removeHtmlComments = (html: string): string => {
        return html.replace(/<!--[\s\S]*?-->/g, '');
    };

    // Process YouTube links and embed them
    const processYouTubeLinks = (html: string): string => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const paragraphs = tempDiv.getElementsByTagName('p');
        Array.from(paragraphs).forEach((p) => {
            const youtubeLink = p.querySelector('a[href*="youtu"]');
            if (youtubeLink) {
                const url = youtubeLink.getAttribute('href');
                const videoId = url?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1];

                if (videoId) {
                    const textBefore = p.childNodes[0].textContent || '';

                    p.innerHTML = `
                    ${textBefore}
                    <div class="aspect-w-16 aspect-h-9 my-4">
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}"
                            title="YouTube video player"
                            style="border: 0;"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                            class="w-full h-[400px] rounded-lg"
                        ></iframe>
                    </div>
                `;
                }
            }
        });

        return tempDiv.innerHTML;
    };

    // Process content when component mounts or when content changes
    useEffect(() => {
        const cleanContent = removeHtmlComments(data.content);

        // Ensure we're working in a client-side environment before modifying DOM
        if (typeof window !== 'undefined') {
            setProcessedContent(processYouTubeLinks(cleanContent));
        } else {
            setProcessedContent(cleanContent);
        }
    }, [data.content]); // Depend on content to reprocess if it changes

    return (
        <main className="max-w-[728px] mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-serif mb-4">
                    {data.metadata.title}
                </h1>
                <div className="flex items-center space-x-4 mb-6">
                    <Link
                        href={`https://github.com/${data.metadata.author}`}
                        className="flex items-center space-x-2 text-gray-700 hover:text-black"
                    >
                        <Image
                            src={`https://github.com/${data.metadata.author}.png`}
                            alt={data.metadata.author}
                            width={48}
                            height={48}
                            className="rounded-full"
                            unoptimized // Since this is a GitHub avatar that's already optimized
                        />
                        <div>
                            <div className="font-medium">{data.metadata.author}</div>
                            {data.metadata.lastUpdated && (
                                <div className="text-sm text-gray-500">
                                    Last updated: {formatDate(data.metadata.lastUpdated)}
                                </div>
                            )}
                        </div>
                    </Link>
                </div>
                <div className="flex items-center space-x-4 text-gray-500">
                    <Link
                        href={`https://github.com/${data.metadata.repository}`}
                        className="hover:text-black"
                    >
                        View on GitHub
                    </Link>
                </div>
            </header>

            {/* Article Content */}
            <article className="prose prose-lg max-w-none">
                <div
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                    className="github-markdown"
                />
            </article>
        </main>
    );
};

export default ArticleLayout;
