import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Better Auth validates the exact issuer/resource discovery paths and builds
// metadata from the same configuration used to issue and verify MCP tokens.
export async function GET(request: Request): Promise<Response> {
    return auth.handler(request);
}

export async function HEAD(request: Request): Promise<Response> {
    return auth.handler(request);
}
