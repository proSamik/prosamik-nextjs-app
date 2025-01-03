// hooks/useCachedRecommendations.ts
import { useState, useEffect } from 'react';
import { RepoListItem } from '@/types/article';
import { useContentList } from '@/hooks/useContentList';

interface CachedData {
    data: RepoListItem[];
    timestamp: number;
}

interface CacheItem {
    [key: string]: CachedData;
}

const CACHE_KEY = 'article_recommendations';
const CACHE_DURATION = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

export const useCachedRecommendations = (type: 'blog' | 'project', tags: string) => {
    const [cachedData, setCachedData] = useState<RepoListItem[]>([]);
    const { data: freshData, loading } = useContentList({ type });

    useEffect(() => {
        const checkAndUpdateCache = () => {
            try {
                // Get cached data
                const cachedString = localStorage.getItem(CACHE_KEY);
                const cached: CacheItem = cachedString ? JSON.parse(cachedString) : {};
                const cacheKey = `${type}-${tags}`;
                const now = Date.now();

                // Check if we have valid cached data
                if (
                    cached[cacheKey] &&
                    now - cached[cacheKey].timestamp < CACHE_DURATION
                ) {
                    setCachedData(cached[cacheKey].data);
                    return;
                }

                // If we have fresh data, update cache
                if (freshData?.repos) {
                    const newCache = {
                        ...cached,
                        [cacheKey]: {
                            data: freshData.repos,
                            timestamp: now,
                        },
                    };
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
                    setCachedData(freshData.repos);
                }
            } catch (error) {
                console.error('Error handling cache:', error);
                // If cache handling fails, use fresh data
                if (freshData?.repos) {
                    setCachedData(freshData.repos);
                }
            }
        };

        checkAndUpdateCache();
    }, [type, tags, freshData]);

    return {
        data: cachedData.length > 0 ? cachedData : freshData?.repos || [],
        loading
    };
};