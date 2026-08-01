import { unstable_cache } from 'next/cache';
import { getConsistencyData } from '@/lib/githubContributions';
import { getYouTubeConsistencyData } from '@/lib/youtubeConsistency';

export const EMBED_CACHE_SECONDS = 60 * 60;

export const getCachedGitHubConsistencyData = unstable_cache(
    getConsistencyData,
    ['consistency-embed-github-v2'],
    {
        revalidate: EMBED_CACHE_SECONDS,
        tags: ['consistency-embed-github'],
    }
);

export const getCachedYouTubeConsistencyData = unstable_cache(
    getYouTubeConsistencyData,
    ['consistency-embed-youtube-v2'],
    {
        revalidate: EMBED_CACHE_SECONDS,
        tags: ['consistency-embed-youtube'],
    }
);
