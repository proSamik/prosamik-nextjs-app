import { getConsistencyData } from '@/lib/githubContributions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        const data = await getConsistencyData();
        return Response.json(data, {
            headers: {
                'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
            },
        });
    } catch (error) {
        console.error('Unable to load consistency data:', error);
        return Response.json({ error: 'Unable to load consistency data.' }, { status: 500 });
    }
}
