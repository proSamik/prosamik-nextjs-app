import React, {ReactNode, useState, useEffect, Suspense} from 'react';
import { ItemList, ItemCardProps } from '@/components/shared/ItemList';
import { ArticleLayoutType, RepoListItem } from '@/types/article';
import { useSlug } from '@/hooks/useSlug';
import { useRouter } from 'next/router';
import { useCachedRecommendations } from '@/hooks/useCachedRecommendations';

interface RecommendationLayoutProps {
    tags: string;
    currentArticleTitle: string;
    layoutType: ArticleLayoutType;
    children: ReactNode;
}


// New component for lazy loading
const LazyLoadWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);

    useEffect(() => {
        // Create intersection observer
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasIntersected) {
                    setIsVisible(true);
                    setHasIntersected(true);
                    observer.disconnect(); // Cleanup after first intersection
                }
            },
            {
                rootMargin: '100px', // Start loading 100px before element comes into view
                threshold: 0.1
            }
        );

        // Get the current element
        const element = document.getElementById('lazy-content');
        if (element) {
            observer.observe(element);
        }

        // Cleanup
        return () => observer.disconnect();
    }, [hasIntersected]);

    return (
        <div id="lazy-content">
            {isVisible ? (
                <Suspense fallback={
                    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg"></div>
                }>
                    {children}
                </Suspense>
            ) : (
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg"></div>
            )}
        </div>
    );
};

const RecommendationLayout: React.FC<RecommendationLayoutProps> = ({
                                                                       tags,
                                                                       currentArticleTitle,
                                                                       children
                                                                   }) => {
    const { createSlug } = useSlug();
    const router = useRouter();
    const currentSlug = router.query.slug as string;
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    // Screen size effect
    useEffect(() => {
        const handleResize = () => {
            setIsLargeScreen(window.innerWidth > 1500);
        };

        // Initial check
        handleResize();

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch cached recommendations
    const { data: blogRecs, loading: blogLoading } = useCachedRecommendations('blog', tags);
    const { data: projectRecs, loading: projectLoading } = useCachedRecommendations('project', tags);

    // Transform RepoListItem to ItemCardProps
    const transformToItemCardProps = (items: RepoListItem[], type: ArticleLayoutType): ItemCardProps[] => {
        return items.map(repo => ({
            title: repo.title,
            link: `/${type}s/${createSlug(repo.title)}`,
            description: repo.description,
            tags: repo.tags,
            views_count: repo.views_count,
            type: repo.type,
            repoPath: repo.repoPath
        }));
    };

    // Helper function to filter recommendations
    const getFilteredRecommendations = (items: RepoListItem[] = [], filterTags: string, type: ArticleLayoutType): ItemCardProps[] => {
        if (!items.length || !filterTags) return [];

        const tagsArray = filterTags.split(',').map(tag => tag.trim().toLowerCase());

        const filtered = items
            .filter(item => {
                const itemSlug = createSlug(item.title);
                if (itemSlug === currentSlug || item.title === currentArticleTitle) return false;
                if (!item.tags) return false;
                const itemTags = item.tags.toLowerCase();
                return tagsArray.some(tag => itemTags.includes(tag));
            })
            .slice(0, 4);

        return transformToItemCardProps(filtered, type);
    };

    const blogRecommendations = getFilteredRecommendations(blogRecs || [], tags, 'blog');
    const projectRecommendations = getFilteredRecommendations(projectRecs || [], tags, 'project');

    const recommendationTitle = (type: string) => (
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Similar {type}s
        </h3>
    );

    const RecommendationSection = ({ items, type }: { items: ItemCardProps[], type: string }) => {
        if (items.length === 0) return null;

        return (
            <div className="space-y-4">
                {recommendationTitle(type)}
                <ItemList items={items} title="recommendations" />
            </div>
        );
    };

    const hasRecommendations = blogRecommendations.length > 0 || projectRecommendations.length > 0;

    const RecommendationContent = () => {
        // Determine if we're on a project page or blog page
        const isProjectPage = router.pathname.includes('/projects/');

        // Order components based on current page type
        const Components = isProjectPage ? (
            <>
                {!projectLoading && projectRecommendations.length > 0 && (
                    <RecommendationSection items={projectRecommendations} type="Project" />
                )}
                {!blogLoading && blogRecommendations.length > 0 && (
                    <RecommendationSection items={blogRecommendations} type="Blog" />
                )}
            </>
        ) : (
            <>
                {!blogLoading && blogRecommendations.length > 0 && (
                    <RecommendationSection items={blogRecommendations} type="Blog" />
                )}
                {!projectLoading && projectRecommendations.length > 0 && (
                    <RecommendationSection items={projectRecommendations} type="Project" />
                )}
            </>
        );

        return (
            <div className="space-y-8">
                {Components}
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-7xl px-4">
            <div className={`flex ${isLargeScreen && hasRecommendations ? 'flex-row justify-start' : 'flex-col items-center'}`}>
                {/* Main content */}
                <main className={`
                  w-full  // Always take full width of parent
                  max-w-full  // Never exceed parent width
                  ${isLargeScreen && hasRecommendations ? 'lg:max-w-4xl' : ''} // Only apply max width on large screens
                  bg-white dark:bg-gray-800 
                  rounded-lg 
                  border border-gray-200 dark:border-gray-700 
                  shadow-sm 
                  p-4 lg:p-6
                `}>
                    <LazyLoadWrapper>
                        {children}
                    </LazyLoadWrapper>
                </main>

                {/* Recommendations */}
                {hasRecommendations && (
                    <>
                        {/* Desktop recommendations - only visible > 1500px */}
                        {isLargeScreen ? (
                            <aside className="ml-16 w-80 shrink-0">
                                <div className="sticky top-24">
                                    <div className="max-h-[calc(100vh-50px)] overflow-y-scroll w-fit">
                                        <RecommendationContent/>
                                        <style jsx>{`
                                            div::-webkit-scrollbar {
                                                display: none;
                                            }
                                        `}</style>
                                    </div>
                                </div>
                            </aside>
                        ) : (
                            <div className="w-full max-w-4xl mt-8 border-t pt-8">
                                <RecommendationContent/>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RecommendationLayout;