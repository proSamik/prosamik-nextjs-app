import { headers } from 'next/headers';
import { SummaryActionRequestSchema } from '@/lib/accountability-summary-contract';
import { getAccountabilityOwner, isSameOriginRequest, privateJson } from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import {
    approveSummaryRevision,
    createSummaryDraft,
    editSummaryDraft,
    getSummaryStatus,
    publishSummaryApproval,
} from '@/lib/accountability-summary-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return { error: privateJson({ error: 'Origin not allowed.' }, { status: 403 }) };
    }
    const owner = await getAccountabilityOwner(await headers());
    if (!owner) return { error: privateJson({ error: 'Unauthorized.' }, { status: 401 }) };
    const limit = await consumeAccountabilityRateLimit(owner.id, 'summaries', mutation ? 30 : 120, 60);
    if (!limit.allowed) {
        return { error: privateJson({ error: 'Too many requests.' }, {
            status: 429,
            headers: { 'Retry-After': String(limit.retryAfterSeconds) },
        }) };
    }
    return { error: null, owner };
}

function hasIdempotencyKey(request: Request): boolean {
    const key = request.headers.get('Idempotency-Key');
    return Boolean(key?.trim() && key.length <= 180);
}

function errorResponse(error: unknown, fallback: string) {
    const code = error instanceof Error ? error.message : '';
    if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
    if (code === 'SUMMARY_DRAFT_NOT_FOUND' || code === 'SUMMARY_DRAFT_GROUP_NOT_FOUND'
        || code === 'SUMMARY_REVISION_NOT_FOUND' || code === 'SUMMARY_APPROVAL_NOT_FOUND'
        || code === 'SUMMARY_PUBLICATION_NOT_FOUND') {
        return privateJson({ error: 'Summary record not found.' }, { status: 404 });
    }
    if (code === 'SUMMARY_REVISION_CONFLICT' || code === 'SUMMARY_APPROVAL_CONFLICT'
        || code === 'SUMMARY_APPROVAL_STALE'
        || code === 'SUMMARY_DAILY_PUBLICATION_EXISTS' || code === 'SUMMARY_PUBLICATION_NOT_AVAILABLE'
        || code === 'SUMMARY_PUBLICATION_NOT_PENDING' || code === 'SUMMARY_APPROVAL_HASH_MISMATCH') {
        return privateJson({ error: 'This summary changed or already has a daily publication. Reload and review its status.' }, { status: 409 });
    }
    if (code === 'SUMMARY_PUBLIC_MEDIA_INVALID' || code === 'SUMMARY_TEXT_NOT_PUBLISHABLE') {
        return privateJson({ error: 'The text or one of the selected public derivatives is no longer eligible. Review and prepare it again.' }, { status: 400 });
    }
    if (code === 'SUMMARY_SOURCE_MEDIA_NOT_FOUND') return privateJson({ error: 'That eligible same-day image is no longer available.' }, { status: 404 });
    // Do not serialize database exceptions or request-bound details; errors can
    // carry query values from private draft text or media metadata.
    console.error(fallback);
    return privateJson({ error: fallback }, { status: 500 });
}

export async function GET(request: Request) {
    const authorization = await authorize(request);
    if (authorization.error || !authorization.owner) return authorization.error;
    try {
        const data = await getSummaryStatus(authorization.owner.id);
        return privateJson({ data });
    } catch (error) {
        return errorResponse(error, 'Unable to load private summary history.');
    }
}

export async function POST(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;
    if (!hasIdempotencyKey(request)) return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = SummaryActionRequestSchema.safeParse(body);
    if (!parsed.success || parsed.data.action === 'edit') return privateJson({ error: 'Invalid summary action.' }, { status: 400 });

    try {
        if (parsed.data.action === 'create') {
            return privateJson({ data: await createSummaryDraft(authorization.owner.id, parsed.data.activityDate) }, { status: 201 });
        }
        if (parsed.data.action === 'approve') {
            const data = await approveSummaryRevision(
                authorization.owner.id,
                parsed.data.draftId,
                parsed.data.revisionNumber,
                parsed.data.publicMedia,
            );
            return privateJson({ data }, { status: 200 });
        }
        const data = await publishSummaryApproval(authorization.owner, parsed.data.approvalId);
        return privateJson({ data }, { status: 200 });
    } catch (error) {
        return errorResponse(error, 'The summary action could not be completed.');
    }
}

export async function PATCH(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;
    if (!hasIdempotencyKey(request)) return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = SummaryActionRequestSchema.safeParse(body);
    if (!parsed.success || parsed.data.action !== 'edit') return privateJson({ error: 'Invalid summary edit.' }, { status: 400 });
    try {
        const data = await editSummaryDraft(
            authorization.owner.id,
            parsed.data.draftId,
            parsed.data.revisionNumber,
            parsed.data.title,
            parsed.data.body,
        );
        return privateJson({ data }, { status: 200 });
    } catch (error) {
        return errorResponse(error, 'The summary edit could not be completed.');
    }
}
