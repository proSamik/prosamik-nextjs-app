import type { ConsistencyData } from '@/lib/githubContributions';
import type { YouTubeConsistencyData } from '@/lib/youtubeConsistency';

export const emptyGitHubConsistencyData: ConsistencyData = {
    username: 'proSamik',
    days: [],
    stats: {
        totalContributions: 0,
        firstContributionDate: null,
        currentStreak: { length: 0, start: null, end: null },
        longestStreak: { length: 0, start: null, end: null },
    },
    syncedAt: null,
};

const emptyPublishingStats = {
    totalUploads: 0,
    firstUploadDate: null,
    lastUploadDate: null,
    currentStreak: { length: 0, start: null, end: null },
    longestStreak: { length: 0, start: null, end: null },
};

export const emptyYouTubeConsistencyData: YouTubeConsistencyData = {
    handle: 'proSamik',
    channelTitle: 'proSamik',
    channelUrl: 'https://www.youtube.com/@proSamik',
    videos: [],
    overall: emptyPublishingStats,
    shorts: emptyPublishingStats,
    longForm: emptyPublishingStats,
    syncedAt: null,
};
