import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { createRandomThought, listRandomThoughts } from '@/lib/random-thoughts';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import { isR2PublicMediaUrl } from '@/lib/r2';
import { consumeRateLimit, getIpFromHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const thoughts = await listRandomThoughts(50);
    return NextResponse.json(
        { data: thoughts },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } }
    );
}

export async function POST(request: Request) {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.email || !isAllowedAdminEmail(session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limiter = consumeRateLimit(`random-thoughts:${getIpFromHeaders(requestHeaders)}`, {
        windowMs: 60_000,
        max: 20,
    });

    if (!limiter.success) {
        return NextResponse.json(
            {
                error: 'Too many requests. Please wait before posting again.',
            },
            {
                status: 429,
                headers: {
                    'Retry-After': Math.max(1, Math.ceil(limiter.resetMs / 1000)).toString(),
                },
            }
        );
    }

    const body = await request.json().catch(() => null) as {
        content?: unknown;
        media?: unknown;
    } | null;
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const media = Array.isArray(body?.media)
        ? body.media.flatMap((item) => {
            if (!item || typeof item !== 'object') return [];
            const candidate = item as { url?: unknown; type?: unknown };
            if (typeof candidate.url !== 'string') return [];
            if (candidate.type !== 'image' && candidate.type !== 'video') return [];
            if (!isR2PublicMediaUrl(candidate.url)) return [];
            return [{ url: candidate.url, type: candidate.type as 'image' | 'video' }];
        })
        : [];

    if (!content && media.length === 0) {
        return NextResponse.json({ error: 'Please add text or at least one attachment.' }, { status: 400 });
    }

    if (content.length > 3000) {
        return NextResponse.json({ error: 'Thought text must be 3000 characters or fewer.' }, { status: 400 });
    }

    try {
        const thought = await createRandomThought({
            content,
            media,
            createdByEmail: session.user.email,
            createdByName: session.user.name || 'prosamik',
        });

        revalidatePath('/random-thoughts');
        return NextResponse.json({ data: thought }, { status: 201 });
    } catch (error) {
        console.error('Could not create random thought:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unable to create random thought.',
            },
            { status: 500 }
        );
    }
}
