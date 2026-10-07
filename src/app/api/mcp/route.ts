import { handleAccountabilityMcpPost } from '@/lib/accountability-mcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** OAuth-protected, stateless MCP endpoint. Other HTTP methods are not mounted. */
export async function POST(request: Request): Promise<Response> {
    try {
        return await handleAccountabilityMcpPost(request);
    } catch {
        return Response.json({ error: 'MCP request is temporarily unavailable.' }, {
            status: 503,
            headers: {
                'Cache-Control': 'private, no-store, max-age=0',
                'Pragma': 'no-cache',
                'Vary': 'Authorization, Origin',
                'X-Robots-Tag': 'noindex, nofollow, noarchive',
            },
        });
    }
}
