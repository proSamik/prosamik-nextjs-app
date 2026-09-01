import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import { deleteRandomThought, updateRandomThought } from '@/lib/random-thoughts';
import { deleteFromR2, isR2PublicMediaUrl } from '@/lib/r2';
import { consumeRateLimit, getIpFromHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

async function authorize(method: string) {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session?.user?.email || !isAllowedAdminEmail(session.user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limiter = consumeRateLimit(`random-thoughts:${method}:${getIpFromHeaders(requestHeaders)}`, {
        windowMs: 60_000,
        max: 30,
    });

    if (!limiter.success) {
        return NextResponse.json(
            { error: 'Too many requests. Please wait before trying again.' },
            {
                status: 429,
                headers: { 'Retry-After': Math.max(1, Math.ceil(limiter.resetMs / 1000)).toString() },
            }
        );
    }

    return null;
}

async function getId(context: RouteContext): Promise<number | null> {
    const { id } = await context.params;
    const parsed = Number(id);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request: Request, context: RouteContext) {
    const authorizationError = await authorize('update');
    if (authorizationError) return authorizationError;

    const id = await getId(context);
    if (!id) return NextResponse.json({ error: 'Invalid thought ID.' }, { status: 400 });

    const body = await request.json().catch(() => null) as {
        content?: unknown;
        removeMediaIds?: unknown;
        media?: unknown;
    } | null;
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (content.length > 3000) {
        return NextResponse.json({ error: 'Thought text must be 3000 characters or fewer.' }, { status: 400 });
    }

    const removeMediaIds = Array.isArray(body?.removeMediaIds)
        ? body.removeMediaIds
            .map((mediaId) => Number(mediaId))
            .filter((mediaId) => Number.isSafeInteger(mediaId) && mediaId > 0)
        : [];
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

    try {
        const result = await updateRandomThought({ id, content, removeMediaIds, media });
        if (!result) return NextResponse.json({ error: 'Thought not found.' }, { status: 404 });

        await Promise.allSettled(result.removedMedia.map((item) => deleteFromR2(item.url)));
        revalidatePath('/random-thoughts');
        revalidatePath(`/t/${result.thought.slug}`);
        revalidatePath('/sitemap.xml');
        return NextResponse.json({ data: result.thought });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update this thought.';
        const status = message.startsWith('A thought needs') ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function DELETE(_request: Request, context: RouteContext) {
    const authorizationError = await authorize('delete');
    if (authorizationError) return authorizationError;

    const id = await getId(context);
    if (!id) return NextResponse.json({ error: 'Invalid thought ID.' }, { status: 400 });

    const thought = await deleteRandomThought(id);
    if (!thought) return NextResponse.json({ error: 'Thought not found.' }, { status: 404 });

    await Promise.allSettled(thought.media.map((item) => deleteFromR2(item.url)));
    revalidatePath('/random-thoughts');
    revalidatePath(`/t/${thought.slug}`);
    revalidatePath('/sitemap.xml');
    return NextResponse.json({ ok: true });
}
