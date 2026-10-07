import { headers } from 'next/headers';
import {
    SummaryMediaListQuerySchema,
    SummaryMediaPrepareRequestSchema,
} from '@/lib/accountability-summary-contract';
import { getAccountabilityOwner, isSameOriginRequest, privateJson } from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import { assertActivityDate } from '@/lib/accountability-domain';
import { listSummaryMediaSources, prepareSummaryMediaDerivative } from '@/lib/accountability-summary-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return { error: privateJson({ error: 'Origin not allowed.' }, { status: 403 }) };
    }
    const owner = await getAccountabilityOwner(await headers());
    if (!owner) return { error: privateJson({ error: 'Unauthorized.' }, { status: 401 }) };
    const limit = await consumeAccountabilityRateLimit(owner.id, 'summary-media', mutation ? 8 : 60, 60);
    if (!limit.allowed) {
        return { error: privateJson({ error: 'Too many media requests.' }, {
            status: 429,
            headers: { 'Retry-After': String(limit.retryAfterSeconds) },
        }) };
    }
    return { error: null, owner };
}

export async function GET(request: Request) {
    const authorization = await authorize(request);
    if (authorization.error || !authorization.owner) return authorization.error;
    const search = new URL(request.url).searchParams;
    const parsed = SummaryMediaListQuerySchema.safeParse({ activityDate: search.get('activityDate') });
    if (!parsed.success) return privateJson({ error: 'A valid IST activity date is required.' }, { status: 400 });
    try {
        assertActivityDate(parsed.data.activityDate);
        return privateJson({ data: await listSummaryMediaSources(authorization.owner.id, parsed.data.activityDate) });
    } catch (error) {
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        console.error('Unable to list summary media.');
        return privateJson({ error: 'Unable to load eligible private images.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey?.trim() || idempotencyKey.length > 180) {
        return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    }
    const body = await request.json().catch(() => null);
    const parsed = SummaryMediaPrepareRequestSchema.safeParse(body);
    if (!parsed.success) return privateJson({ error: 'Invalid image preparation request.' }, { status: 400 });
    try {
        assertActivityDate(parsed.data.activityDate);
        const data = await prepareSummaryMediaDerivative(
            authorization.owner.id,
            parsed.data.activityDate,
            parsed.data.sourceMediaAssetId,
        );
        return privateJson({ data }, { status: 201 });
    } catch (error) {
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        if (error instanceof Error && error.message === 'SUMMARY_SOURCE_MEDIA_NOT_FOUND') {
            return privateJson({ error: 'That eligible same-day image is no longer available.' }, { status: 404 });
        }
        console.error('Unable to prepare summary image.');
        return privateJson({ error: 'Unable to prepare the private sanitized image preview.' }, { status: 500 });
    }
}
