import { headers } from 'next/headers';
import { HabitUpdateRequestSchema, NoFapUpdateRequestSchema } from '@/lib/accountability-contract';
import { getAccountabilityOwner, isSameOriginRequest, privateJson } from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import { getProgress, getTodayActivityDate, recordHabitUpdate, recordNoFapStatus, shiftActivityDate } from '@/lib/accountability-service';
import { assertActivityDate } from '@/lib/accountability-domain';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return { error: privateJson({ error: 'Origin not allowed.' }, { status: 403 }) };
    }

    const requestHeaders = await headers();
    const owner = await getAccountabilityOwner(requestHeaders);
    if (!owner) return { error: privateJson({ error: 'Unauthorized.' }, { status: 401 }) };

    const rateLimit = await consumeAccountabilityRateLimit(owner.id, 'progress', mutation ? 60 : 120, 60);
    if (!rateLimit.allowed) {
        return { error: privateJson({ error: 'Too many requests.' }, {
            status: 429,
            headers: { 'Retry-After': rateLimit.retryAfterSeconds.toString() },
        }) };
    }
    return { error: null, owner };
}

export async function GET(request: Request) {
    const authorization = await authorize(request);
    if (authorization.error || !authorization.owner) return authorization.error;

    try {
        const search = new URL(request.url).searchParams;
        const toDate = search.get('to') ? assertActivityDate(search.get('to')!) : getTodayActivityDate();
        const fromDate = search.get('from') ? assertActivityDate(search.get('from')!) : shiftActivityDate(toDate, -364);
        if (fromDate > toDate) return privateJson({ error: 'Invalid date range.' }, { status: 400 });
        const data = await getProgress(authorization.owner.id, fromDate, toDate);
        return privateJson({ data });
    } catch {
        return privateJson({ error: 'Unable to load private progress.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return writeProgress(request);
}

export async function PATCH(request: Request) {
    return writeProgress(request);
}

async function writeProgress(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;

    const body = await request.json().catch(() => null);
    const habitParsed = HabitUpdateRequestSchema.safeParse(body);
    const noFapParsed = NoFapUpdateRequestSchema.safeParse(body);
    if (!habitParsed.success && !noFapParsed.success) {
        return privateJson({ error: 'Invalid progress update.' }, { status: 400 });
    }

    const parsed = habitParsed.success
        ? { kind: 'habit' as const, data: habitParsed.data }
        : noFapParsed.success
            ? { kind: 'no-fap' as const, data: noFapParsed.data }
            : null;
    if (!parsed) return privateJson({ error: 'Invalid progress update.' }, { status: 400 });

    const activityDate = parsed.data.activityDate;
    try {
        assertActivityDate(activityDate);
    } catch {
        return privateJson({ error: 'Invalid activity date.' }, { status: 400 });
    }

    if (activityDate > getTodayActivityDate()) {
        return privateJson({ error: 'Progress cannot be recorded for a future date.' }, { status: 400 });
    }

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    const source = { kind: 'admin' as const, id: authorization.owner.id };
    try {
        if (parsed.kind === 'habit') {
            const data = await recordHabitUpdate(authorization.owner.id, source, idempotencyKey, parsed.data);
            return privateJson({ data }, { status: 200 });
        }

        const data = await recordNoFapStatus(
            authorization.owner.id,
            source,
            idempotencyKey,
            parsed.data.activityDate,
            parsed.data.status,
        );
        return privateJson({ data }, { status: 200 });
    } catch (error) {
        if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
            return privateJson({ error: 'This idempotency key was already used for a different update.' }, { status: 409 });
        }
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to save the progress update.' }, { status: 500 });
    }
}
