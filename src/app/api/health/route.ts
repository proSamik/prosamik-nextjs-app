export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Liveness probe for Coolify: answers once the Next.js server is accepting requests.
export function GET() {
    return Response.json({ status: 'ok' }, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
