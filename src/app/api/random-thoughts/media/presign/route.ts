import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import { createPresignedMediaUpload, deleteFromR2 } from '@/lib/r2';
import { consumeRateLimit, getIpFromHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

async function authorize() {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.email || !isAllowedAdminEmail(session.user.email)) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const limiter = consumeRateLimit(`random-thought-media:${getIpFromHeaders(requestHeaders)}`, {
        windowMs: 60_000,
        max: 60,
    });

    if (!limiter.success) {
        return {
            error: NextResponse.json(
                { error: 'Too many upload requests. Please wait a moment.' },
                {
                    status: 429,
                    headers: { 'Retry-After': Math.max(1, Math.ceil(limiter.resetMs / 1000)).toString() },
                }
            ),
        };
    }

    return { error: null };
}

export async function POST(request: Request) {
    const authorization = await authorize();
    if (authorization.error) return authorization.error;

    const body = await request.json().catch(() => null) as { files?: unknown } | null;
    if (!Array.isArray(body?.files) || body.files.length === 0) {
        return NextResponse.json({ error: 'Select at least one file.' }, { status: 400 });
    }

    try {
        const uploads = [];
        for (const item of body.files) {
            if (!item || typeof item !== 'object') {
                return NextResponse.json({ error: 'Invalid file metadata.' }, { status: 400 });
            }

            const file = item as { name?: unknown; type?: unknown; size?: unknown };
            if (typeof file.name !== 'string' || typeof file.type !== 'string' || typeof file.size !== 'number') {
                return NextResponse.json({ error: 'Invalid file metadata.' }, { status: 400 });
            }

            uploads.push(await createPresignedMediaUpload({
                name: file.name,
                type: file.type,
                size: file.size,
            }));
        }

        return NextResponse.json({ data: uploads });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unable to prepare uploads.' },
            { status: 400 }
        );
    }
}

export async function DELETE(request: Request) {
    const authorization = await authorize();
    if (authorization.error) return authorization.error;

    const body = await request.json().catch(() => null) as { urls?: unknown } | null;
    const urls = Array.isArray(body?.urls)
        ? body.urls.filter((url): url is string => typeof url === 'string')
        : [];

    await Promise.allSettled(urls.map((url) => deleteFromR2(url)));
    return NextResponse.json({ ok: true });
}
