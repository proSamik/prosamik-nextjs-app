// components/article/ArticleLayout.tsx
import React from 'react';
import ArticleHeader from './ArticleHeader';
import useProcessedContent from '@/hooks/useProcessedContent';
import { ArticleLayoutProps, ArticleLayoutType } from "@/types/article";
import { FaGithub } from "react-icons/fa";
import SEO from '@/components/layout/SEO';
import { siteMetadata } from '@/utils/siteMetadata';

interface EnhancedArticleLayoutProps extends ArticleLayoutProps {
    layoutType: ArticleLayoutType;
    tags?: string;
}

const constructGitHubUrl = (author: string, repository: string) => {
    const cleanAuthor = author?.trim() || '';
    const cleanRepo = repository?.trim() || '';
    return cleanAuthor && cleanRepo ? `https://github.com/${cleanAuthor}/${cleanRepo}` : '';
};

// Config determines layout-specific styles and components
const getLayoutConfig = (layoutType: string) => {
    if (layoutType === 'project') {
        return {
            mainClasses: 'max-w-[900px]',
            project: true,
        };
    }
    return {
        mainClasses: 'max-w-[900px]',
        project: false,
    };
};

const ArticleLayout = ({ data, content, layoutType, tags}: EnhancedArticleLayoutProps) => {
    const { processedContent, contentRef, shareUrl } = useProcessedContent(data, content);
    const githubUrl = constructGitHubUrl(data.metadata.author, data.metadata.repository);
    const config = getLayoutConfig(layoutType);

    const tagsArray = (tags || '').split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    // Extract text from content (HTML)
    const extractTextFromHTML = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    };

    const articleText = extractTextFromHTML(processedContent || '');

    // JSON-LD structured data for the article
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": data.metadata.title,
        "description": data.metadata.description || siteMetadata.defaultDescription,
        "author": {
            "@type": "Person",
            "name": data.metadata.author,
            "url": `https://github.com/${data.metadata.author}`,
        },
        "dateModified": data.metadata.lastUpdated,
        "publisher": {
            "@type": "Organization",
            "name": siteMetadata.title,
            "logo": {
                "@type": "ImageObject",
                "url": `${siteMetadata.siteUrl}/favicon.svg`,
            },
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${siteMetadata.siteUrl}`,
        },
        "keywords": tagsArray,
        "articleBody": articleText,
    };

    return (
        <>
            <SEO
                title={data.metadata.title}
                description={data.metadata.description || siteMetadata.defaultDescription}
                keywords={tags}
                structuredData={jsonLd}
                openGraph={{
                    type: 'article',
                    article: {
                        title: data.metadata.title,
                        modifiedTime: data.metadata.lastUpdated,
                        authors: [data.metadata.author],
                        tags: tagsArray,
                    },
                }}
                twitter={{
                    cardType: 'summary_large_image',
                    site: siteMetadata.twitterUsername,
                    creator: data.metadata.author,
                    imageAlt: data.metadata.title,
                }}
            />

            <div className={`${config.mainClasses} mx-auto px-4`}>
                <div className="flex justify-between items-center mb-8 w-full py-5">
                    <ArticleHeader data={data} shareUrl={shareUrl}/>
                </div>

                <article className="prose prose-lg dark:prose-invert w-full">
                    <div
                        ref={contentRef}
                        dangerouslySetInnerHTML={{__html: processedContent}}
                        className="github-markdown"
                    />

                    {data.metadata.repository && (
                        <div className="mt-8 w-full flex justify-center">
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white
                                rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors no-underline"
                            >
                                <FaGithub size={20}/>
                                <span>Visit Repository</span>
                            </a>
                        </div>
                    )}

                    {/* Layout-specific content sections */}
                    {config.project && (
                        <div className="mt-6 mx-4 bg-gray-100 dark:bg-gray-800 rounded-lg hidden">
                            <h3 className='p-3 flex justify-center'>Similar Projects</h3>
                        </div>
                    )}

                    {!config.project && (
                        <div className="mt-6 mx-4 bg-gray-100 dark:bg-gray-800 rounded-lg hidden">
                            <h3 className='p-3 flex justify-center'>Similar Blogs</h3>
                        </div>
                    )}
                </article>
            </div>
        </>
    );
};

export default ArticleLayout;