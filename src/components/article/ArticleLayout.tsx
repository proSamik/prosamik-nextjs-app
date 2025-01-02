import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from "@/components/layout/Footer";
import ArticleHeader from './ArticleHeader';
import useProcessedContent from '@/hooks/useProcessedContent';
import { ArticleLayoutProps, ArticleLayoutType } from "@/types/article";
import CustomBackButton from "@/components/layout/CustomBackButton";
import CustomNextButton from "@/components/layout/CustomNextButton";
import { FaGithub } from "react-icons/fa";

interface EnhancedArticleLayoutProps extends ArticleLayoutProps {
    layoutType: ArticleLayoutType;
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
            mainClasses: 'max-w-[800px]',
            project: true,  // Example of project-specific feature
        };
    }

    // Default blog configuration
    return {
        mainClasses: 'max-w-[900px]',
        project: false,
    };
};

const ArticleLayout = ({ data, content, layoutType }: EnhancedArticleLayoutProps) => {
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

    const config = getLayoutConfig(layoutType);

    return (
        <div className={`flex flex-col md:flex-row justify-between bg-gray-50 dark:bg-gray-900`}>
            <div className="">
                <Navigation/>
            </div>

            <main
                className={`${config.mainClasses} pl-7 py-8 px-8`}
                style={{
                    width: isMobileView ? '100%' : 'auto',
                    marginTop: isMobileView ? '60px' : '0',
                    marginBottom: isMobileView ? '60px' : '0',
                }}
            >
                {isMobileView && (
                    <div className="flex justify-between mb-6">
                        <CustomBackButton/>
                        <CustomNextButton/>
                    </div>
                )}

                <div className="flex justify-between items-center mb-8">
                    <ArticleHeader data={data} shareUrl={shareUrl}/>
                </div>

                <article className="prose prose-lg max-w-none dark:prose-invert">

                    <div
                        ref={contentRef}
                        dangerouslySetInnerHTML={{__html: processedContent}}
                        className="github-markdown"
                    />

                    {data.metadata.repository && (
                        <div className="mt-8 flex justify-center">
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

                    {/* Example of project layout-specific content */}
                    {config.project && (
                        <div className="mt-6 mx-4  bg-gray-100 dark:bg-gray-800 rounded-lg hidden">
                            <h3 className='p-3 flex justify-center'>Similar Projects</h3>
                            {/* Add tech stack content for projects */}
                        </div>
                    )}

                    {/* Example of blog layout-specific content */}
                    {!config.project && (
                        <div className="mt-6 mx-4 bg-gray-100 dark:bg-gray-800 rounded-lg hidden">
                            <h3 className='p-3 flex justify-center'>Similar Blogs</h3>
                            {/* Add tech stack content for projects */}
                        </div>
                    )}
                </article>

                {isMobileView && (
                    <div className="flex justify-between mb-6">
                        <CustomBackButton/>
                        <CustomNextButton/>
                    </div>
                )}
            </main>

            <div className="">
                <Footer/>
            </div>
        </div>
    );
};

export default ArticleLayout;