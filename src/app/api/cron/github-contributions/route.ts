import { syncGitHubContributions } from '@/lib/githubContributions';

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
        const result = await syncGitHubContributions();
        return Response.json({ success: true, ...result });
    } catch (error) {
        console.error('GitHub contribution sync failed:', error);
        return Response.json({ success: false, error: 'Contribution sync failed.' }, { status: 500 });
    }
}
