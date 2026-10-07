import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export type AccountabilityOwner = {
    id: string;
    email: string;
    name: string | null;
};

/** Verify the signed-in account on the server; never accept owner IDs from a request. */
export async function getAccountabilityOwner(requestHeaders: Headers): Promise<AccountabilityOwner | null> {
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user?.id || !session.user.email || !isAllowedAdminEmail(session.user.email)) return null;

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
    };
}

export function privateJson(data: unknown, init: ResponseInit = {}): NextResponse {
    const headers = new Headers(init.headers);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Vary', 'Cookie, Authorization');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return NextResponse.json(data, { ...init, headers });
}

/** Cookie-authenticated mutations are accepted only from the same origin. */
export function isSameOriginRequest(request: Request): boolean {
    const requestUrl = new URL(request.url);
    const host = request.headers.get('host');
    if (host && host.toLowerCase() !== requestUrl.host.toLowerCase()) return false;

    const origin = request.headers.get('origin');
    if (!origin) return false;
    try {
        return new URL(origin).origin === requestUrl.origin;
    } catch {
        return false;
    }
}
