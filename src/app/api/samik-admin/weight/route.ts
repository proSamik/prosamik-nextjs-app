import { headers } from 'next/headers';
import {
    WeightEntryCorrectRequestSchema,
    WeightEntryRequestSchema,
} from '@/lib/accountability-contract';
import { assertActivityDate } from '@/lib/accountability-domain';
import { getAccountabilityOwner, isSameOriginRequest, privateJson } from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import {
    correctWeightEntry,
    createWeightEntry,
    getTodayActivityDate,
    getWeightEntries,
    shiftActivityDate,
} from '@/lib/accountability-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return { error: privateJson({ error: 'Origin not allowed.' }, { status: 403 }) };
    }
    const owner = await getAccountabilityOwner(await headers());
    if (!owner) return { error: privateJson({ error: 'Unauthorized.' }, { status: 401 }) };
    const limit = await consumeAccountabilityRateLimit(owner.id, 'weight', mutation ? 60 : 120, 60);
    if (!limit.allowed) return { error: privateJson({ error: 'Too many requests.' }, {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    }) };
    return { error: null, owner };
}

export async function GET(request: Request) {
    const access = await authorize(request);
    if (access.error || !access.owner) return access.error;
    try {
        const search = new URL(request.url).searchParams;
        const toDate = search.get('to') ? assertActivityDate(search.get('to')!) : getTodayActivityDate();
        const fromDate = search.get('from') ? assertActivityDate(search.get('from')!) : shiftActivityDate(toDate, -364);
        if (fromDate > toDate) return privateJson({ error: 'Invalid date range.' }, { status: 400 });
        return privateJson({ data: await getWeightEntries(access.owner.id, fromDate, toDate, { includeEvidenceAssetIds: true }) });
    } catch (error) {
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to load private measurements.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const access = await authorize(request, true);
    if (access.error || !access.owner) return access.error;
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    const parsed = WeightEntryRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateJson({ error: 'Invalid measurement.' }, { status: 400 });
    try {
        assertActivityDate(parsed.data.activityDate);
        if (parsed.data.activityDate > getTodayActivityDate()) {
            return privateJson({ error: 'A measurement cannot be recorded for a future date.' }, { status: 400 });
        }
        const data = await createWeightEntry(
            access.owner.id,
            { kind: 'admin', id: access.owner.id },
            idempotencyKey,
            parsed.data,
        );
        return privateJson({ data }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
            return privateJson({ error: 'This idempotency key was already used for a different measurement.' }, { status: 409 });
        }
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to save the measurement.' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const access = await authorize(request, true);
    if (access.error || !access.owner) return access.error;
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    const parsed = WeightEntryCorrectRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateJson({ error: 'Invalid measurement correction.' }, { status: 400 });
    try {
        if (parsed.data.activityDate) {
            assertActivityDate(parsed.data.activityDate);
            if (parsed.data.activityDate > getTodayActivityDate()) {
                return privateJson({ error: 'A measurement cannot be corrected to a future date.' }, { status: 400 });
            }
        }
        const data = await correctWeightEntry(
            access.owner.id,
            { kind: 'admin', id: access.owner.id },
            idempotencyKey,
            parsed.data,
        );
        return privateJson({ data });
    } catch (error) {
        if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
            return privateJson({ error: 'This idempotency key was already used for a different correction.' }, { status: 409 });
        }
        if (error instanceof Error && error.message === 'WEIGHT_ENTRY_NOT_FOUND') {
            return privateJson({ error: 'Measurement not found.' }, { status: 404 });
        }
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to correct the measurement.' }, { status: 500 });
    }
}
