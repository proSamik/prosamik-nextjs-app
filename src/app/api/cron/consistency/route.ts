import { revalidateTag } from 'next/cache';
import { syncGitHubContributions } from '@/lib/githubContributions';
import { syncYouTubeVideos } from '@/lib/youtubeConsistency';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get('authorization');

    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [github, youtube] = await Promise.all([
            syncGitHubContributions(),
            syncYouTubeVideos(),
        ]);
        revalidateTag('consistency-embed-github', { expire: 0 });
        revalidateTag('consistency-embed-youtube', { expire: 0 });
        return Response.json({ success: true, github, youtube });
    } catch (error) {
        console.error('Consistency sync failed:', error);
        return Response.json({ success: false, error: 'Consistency sync failed.' }, { status: 500 });
    }
}
