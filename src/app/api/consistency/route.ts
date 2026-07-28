import { getConsistencyData } from '@/lib/githubContributions';
import { getYouTubeConsistencyData } from '@/lib/youtubeConsistency';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const [github, youtube] = await Promise.all([
            getConsistencyData(),
            getYouTubeConsistencyData(),
        ]);
        return Response.json({ github, youtube }, {
            headers: {
                'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
            },
        });
    } catch (error) {
        console.error('Unable to load consistency data:', error);
        return Response.json({ error: 'Unable to load consistency data.' }, { status: 500 });
    }
}
