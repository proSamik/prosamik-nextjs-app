import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export { isSameOriginRequest } from './accountability-origin';

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
