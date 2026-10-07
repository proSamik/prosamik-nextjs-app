import { headers } from 'next/headers';
import { CheckInAnswerRequestSchema } from '@/lib/accountability-contract';
import { getAccountabilityOwner, isSameOriginRequest, privateJson } from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import { answerCheckIn, getCheckIns, getTodayActivityDate, shiftActivityDate } from '@/lib/accountability-service';
import { assertActivityDate } from '@/lib/accountability-domain';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return { error: privateJson({ error: 'Origin not allowed.' }, { status: 403 }) };
    }
    const owner = await getAccountabilityOwner(await headers());
    if (!owner) return { error: privateJson({ error: 'Unauthorized.' }, { status: 401 }) };
    const rateLimit = await consumeAccountabilityRateLimit(owner.id, 'check-ins', mutation ? 60 : 120, 60);
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
        const fromDate = search.get('from') ? assertActivityDate(search.get('from')!) : shiftActivityDate(toDate, -6);
        if (fromDate > toDate) return privateJson({ error: 'Invalid date range.' }, { status: 400 });
        const data = await getCheckIns(authorization.owner.id, fromDate, toDate);
        return privateJson({ data });
    } catch (error) {
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to load private check-ins.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authorization = await authorize(request, true);
    if (authorization.error || !authorization.owner) return authorization.error;

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) return privateJson({ error: 'An Idempotency-Key header is required.' }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = CheckInAnswerRequestSchema.safeParse(body);
    if (!parsed.success) return privateJson({ error: 'Invalid check-in response.' }, { status: 400 });
    try {
        assertActivityDate(parsed.data.activityDate);
        if (parsed.data.activityDate > getTodayActivityDate()) {
            return privateJson({ error: 'A check-in cannot be answered for a future date.' }, { status: 400 });
        }
        const data = await answerCheckIn(
            authorization.owner.id,
            { kind: 'admin', id: authorization.owner.id },
            idempotencyKey,
            parsed.data.activityDate,
            parsed.data.slotId,
            parsed.data.response,
        );
        return privateJson({ data });
    } catch (error) {
        if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
            return privateJson({ error: 'This idempotency key was already used for a different response.' }, { status: 409 });
        }
        if (error instanceof Error && error.message === 'CHECK_IN_NOT_FOUND') return privateJson({ error: 'Check-in slot not found.' }, { status: 404 });
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to save the check-in response.' }, { status: 500 });
    }
}
