import { getDatabase } from '@/lib/database';
import { calculateContributionStats, type StreakRange } from '@/lib/githubContributions';

export type YouTubeVideoType = 'short' | 'long-form';

export interface YouTubeVideo {
    id: string;
    title: string;
    publishedAt: string;
    date: string;
    type: YouTubeVideoType;
    durationSeconds: number;
    url: string;
}

export interface YouTubePublishingStats {
    totalUploads: number;
    firstUploadDate: string | null;
    currentStreak: StreakRange;
    longestStreak: StreakRange;
}

export interface YouTubeConsistencyData {
    handle: string;
    channelTitle: string;
    channelUrl: string;
    videos: YouTubeVideo[];
    shorts: YouTubePublishingStats;
    longForm: YouTubePublishingStats;
    syncedAt: string | null;
}

const DEFAULT_YOUTUBE_HANDLE = 'proSamik';
const SHORT_MAX_SECONDS = 180;

function parseDuration(duration: string) {
    const match = duration.match(
        /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
    );
    if (!match) return 0;

    const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
    return Number(days) * 86_400 + Number(hours) * 3_600 + Number(minutes) * 60 + Number(seconds);
}

async function youtubeRequest<T>(path: string, parameters: Record<string, string>) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error('YOUTUBE_API_KEY is not configured.');
    }

    const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    Object.entries({ ...parameters, key: apiKey }).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'prosamik.com-consistency-tracker',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube Data API request failed with status ${response.status}: ${body.slice(0, 200)}`);
    }

    return response.json() as Promise<T>;
}

async function fetchYouTubeChannel(handle: string) {
    const channelResponse = await youtubeRequest<{
        items?: Array<{
            id: string;
            snippet: { title: string };
            contentDetails: { relatedPlaylists: { uploads: string } };
        }>;
    }>('channels', {
        part: 'snippet,contentDetails',
        forHandle: handle.startsWith('@') ? handle : `@${handle}`,
        maxResults: '1',
    });
    const channel = channelResponse.items?.[0];

    if (!channel) {
        throw new Error(`YouTube channel @${handle.replace(/^@/, '')} was not found.`);
    }

    return channel;
}

async function fetchUploadVideoIds(uploadsPlaylistId: string) {
    const videoIds: string[] = [];
    let pageToken: string | undefined;

    do {
        const response = await youtubeRequest<{
            nextPageToken?: string;
            items?: Array<{ contentDetails: { videoId: string } }>;
        }>('playlistItems', {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: '50',
            ...(pageToken ? { pageToken } : {}),
        });

        videoIds.push(...(response.items || []).map((item) => item.contentDetails.videoId));
        pageToken = response.nextPageToken;
    } while (pageToken);

    return videoIds;
}

async function fetchVideoDetails(videoIds: string[]) {
    const videos: YouTubeVideo[] = [];

    for (let index = 0; index < videoIds.length; index += 50) {
        const ids = videoIds.slice(index, index + 50);
        const response = await youtubeRequest<{
            items?: Array<{
                id: string;
                snippet: { title: string; publishedAt: string };
                contentDetails: { duration: string };
                status: { privacyStatus: string };
            }>;
        }>('videos', {
            part: 'snippet,contentDetails,status',
            id: ids.join(','),
            maxResults: '50',
        });

        for (const video of response.items || []) {
            if (video.status.privacyStatus !== 'public') continue;

            const durationSeconds = parseDuration(video.contentDetails.duration);
            videos.push({
                id: video.id,
                title: video.snippet.title,
                publishedAt: video.snippet.publishedAt,
                date: video.snippet.publishedAt.slice(0, 10),
                type: durationSeconds <= SHORT_MAX_SECONDS ? 'short' : 'long-form',
                durationSeconds,
                url: `https://www.youtube.com/watch?v=${video.id}`,
            });
        }
    }

    return videos.sort((first, second) => first.publishedAt.localeCompare(second.publishedAt));
}

async function ensureYouTubeTable() {
    const sql = getDatabase();

    await sql`
        CREATE TABLE IF NOT EXISTS youtube_videos (
            video_id TEXT PRIMARY KEY,
            channel_handle TEXT NOT NULL,
            channel_title TEXT NOT NULL,
            title TEXT NOT NULL,
            published_at TIMESTAMPTZ NOT NULL,
            published_date DATE NOT NULL,
            video_type TEXT NOT NULL CHECK (video_type IN ('short', 'long-form')),
            duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
            video_url TEXT NOT NULL,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `;
}

function calculatePublishingStats(videos: YouTubeVideo[]): YouTubePublishingStats {
    const countsByDate = new Map<string, number>();
    videos.forEach((video) => {
        countsByDate.set(video.date, (countsByDate.get(video.date) || 0) + 1);
    });
    const days = [...countsByDate.entries()]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([date, count]) => ({
            date,
            count,
            level: Math.min(count, 4) as 1 | 2 | 3 | 4,
        }));
    const stats = calculateContributionStats(days);

    return {
        totalUploads: videos.length,
        firstUploadDate: days[0]?.date ?? null,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
    };
}

export async function getYouTubeConsistencyData(): Promise<YouTubeConsistencyData> {
    await ensureYouTubeTable();
    const sql = getDatabase();
    const handle = (process.env.YOUTUBE_HANDLE || DEFAULT_YOUTUBE_HANDLE).replace(/^@/, '');
    const rows = await sql<{
        id: string;
        channel_title: string;
        title: string;
        published_at: string;
        date: string;
        type: YouTubeVideoType;
        duration_seconds: number;
        url: string;
        synced_at: string;
    }[]>`
        SELECT
            video_id AS id,
            channel_title,
            title,
            published_at::text,
            published_date::text AS date,
            video_type AS type,
            duration_seconds,
            video_url AS url,
            synced_at::text
        FROM youtube_videos
        WHERE LOWER(channel_handle) = LOWER(${handle})
        ORDER BY published_at ASC
    `;
    const videos = rows.map((row) => ({
        id: row.id,
        title: row.title,
        publishedAt: row.published_at,
        date: row.date,
        type: row.type,
        durationSeconds: row.duration_seconds,
        url: row.url,
    }));
    const channelTitle = rows[0]?.channel_title ?? 'proSamik';

    return {
        handle,
        channelTitle,
        channelUrl: `https://www.youtube.com/@${handle}`,
        videos,
        shorts: calculatePublishingStats(videos.filter((video) => video.type === 'short')),
        longForm: calculatePublishingStats(videos.filter((video) => video.type === 'long-form')),
        syncedAt: rows.at(-1)?.synced_at ?? null,
    };
}

export async function syncYouTubeVideos() {
    await ensureYouTubeTable();
    const sql = getDatabase();
    const handle = (process.env.YOUTUBE_HANDLE || DEFAULT_YOUTUBE_HANDLE).replace(/^@/, '');
    const channel = await fetchYouTubeChannel(handle);
    const videoIds = await fetchUploadVideoIds(channel.contentDetails.relatedPlaylists.uploads);
    const videos = await fetchVideoDetails(videoIds);

    if (videos.length === 0) {
        throw new Error(`YouTube returned no public uploads for @${handle}.`);
    }

    await sql.begin(async (transaction) => {
        await transaction`SELECT pg_advisory_xact_lock(hashtext('prosamik-youtube-videos-sync'))`;
        await transaction`
            INSERT INTO youtube_videos ${transaction(
                videos.map((video) => ({
                    video_id: video.id,
                    channel_handle: handle,
                    channel_title: channel.snippet.title,
                    title: video.title,
                    published_at: video.publishedAt,
                    published_date: video.date,
                    video_type: video.type,
                    duration_seconds: video.durationSeconds,
                    video_url: video.url,
                })),
                'video_id',
                'channel_handle',
                'channel_title',
                'title',
                'published_at',
                'published_date',
                'video_type',
                'duration_seconds',
                'video_url'
            )}
            ON CONFLICT (video_id)
            DO UPDATE SET
                channel_handle = EXCLUDED.channel_handle,
                channel_title = EXCLUDED.channel_title,
                title = EXCLUDED.title,
                published_at = EXCLUDED.published_at,
                published_date = EXCLUDED.published_date,
                video_type = EXCLUDED.video_type,
                duration_seconds = EXCLUDED.duration_seconds,
                video_url = EXCLUDED.video_url,
                synced_at = NOW()
        `;
    });

    return {
        handle,
        channelTitle: channel.snippet.title,
        videosUpdated: videos.length,
        syncedAt: new Date().toISOString(),
    };
}
