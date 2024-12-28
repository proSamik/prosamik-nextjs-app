import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import ArticleHeader from './ArticleHeader';
import useProcessedContent from '@/hooks/useProcessedContent';
import { ArticleLayoutProps } from "@/types/article";
import CustomBackButton from "@/components/CustomBackButton";
import CustomForwardButton from "@/components/CustomForwardButton";
import {FaGithub} from "react-icons/fa";

// Function to construct clean GitHub URL
const constructGitHubUrl = (author: string, repository: string) => {
    const cleanAuthor = author?.trim() || '';
    const cleanRepo = repository?.trim() || '';
    return cleanAuthor && cleanRepo ? `https://github.com/${cleanAuthor}/${cleanRepo}` : '';
};

const ProjectLayout = ({ data, content }: ArticleLayoutProps) => {
    const [isMobileView, setIsMobileView] = useState(false);
    const { processedContent, contentRef, shareUrl } = useProcessedContent(data, content);

    const githubUrl = constructGitHubUrl(data.metadata.author, data.metadata.repository);


    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 1090);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex flex-col md:flex-row justify-between">
            <div className="md:w-64">
                <Navigation />
            </div>

            <main
                className="max-w-[768px] pl-7 py-8"
                style={{
                    width: isMobileView ? '100%' : 'auto',
                    marginTop: isMobileView ? '60px' : '0',
                    marginBottom: isMobileView ? '60px' : '0',
                }}
            >
                {isMobileView && (
                    <div className="flex justify-between mb-6">
                        <CustomBackButton />
                        <CustomForwardButton />
                    </div>
                )}

                <div className="flex justify-between items-center mb-8">
                    <ArticleHeader data={data} shareUrl={shareUrl} />
                </div>

                <article className="prose prose-lg max-w-none dark:prose-invert">
                    <div
                        ref={contentRef}
                        dangerouslySetInnerHTML={{ __html: processedContent }}
                        className="github-markdown"
                    />

                    {/* GitHub Button */}

                    {data.metadata.repository && (
                        <div className="mt-8 flex justify-center">
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors no-underline"
                            >
                                <FaGithub size={20} />
                                <span>Visit Repository</span>
                            </a>

                        </div>

                    )}

                </article>
            </main>

            <div className="md:w-64">
                <Footer />
            </div>
        </div>
    );
};

export default ProjectLayout;