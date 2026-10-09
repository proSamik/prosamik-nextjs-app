import { headers } from 'next/headers';
import {
    getAccountabilityOwner,
    isSameOriginRequest,
    privateJson,
} from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import {
    FoodEntryRequestSchema,
    FoodEntryCorrectRequestSchema,
} from '@/lib/accountability-contract';
import { getFoodEntries, saveFoodEntry } from '@/lib/accountability-food';
import {
    getTodayActivityDate,
    shiftActivityDate,
} from '@/lib/accountability-service';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request))
        return {
            error: privateJson(
                { error: 'Origin not allowed.' },
                { status: 403 },
            ),
        };
    const owner = await getAccountabilityOwner(await headers());
    if (!owner)
        return {
            error: privateJson({ error: 'Unauthorized.' }, { status: 401 }),
        };
    const rate = await consumeAccountabilityRateLimit(
        owner.id,
        'food',
        mutation ? 60 : 120,
        60,
    );
    if (!rate.allowed)
        return {
            error: privateJson(
                { error: 'Too many requests.' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(rate.retryAfterSeconds) },
                },
            ),
        };
    return { owner };
}
export async function GET(request: Request) {
    const access = await authorize(request);
    if (!access.owner) return access.error;
    try {
        const params = new URL(request.url).searchParams;
        const to = params.get('to') ?? getTodayActivityDate();
        return privateJson({
            data: await getFoodEntries(
                access.owner.id,
                params.get('from') ?? shiftActivityDate(to, -364),
                to,
                true,
            ),
        });
    } catch (error) {
        return privateJson(
            {
                error:
                    error instanceof RangeError
                        ? error.message
                        : 'Unable to load food.',
            },
            { status: error instanceof RangeError ? 400 : 500 },
        );
    }
}
async function write(request: Request) {
    const access = await authorize(request, true);
    if (!access.owner) return access.error;
    const key = request.headers.get('Idempotency-Key');
    if (!key)
        return privateJson(
            { error: 'An Idempotency-Key header is required.' },
            { status: 400 },
        );
    const parsed = (
        request.method === 'PATCH'
            ? FoodEntryCorrectRequestSchema
            : FoodEntryRequestSchema
    ).safeParse(await request.json().catch(() => null));
    if (!parsed.success)
        return privateJson({ error: 'Invalid food entry.' }, { status: 400 });
    try {
        return privateJson(
            {
                data: await saveFoodEntry(
                    access.owner.id,
                    { kind: 'admin', id: access.owner.id },
                    key,
                    parsed.data,
                ),
            },
            { status: request.method === 'POST' ? 201 : 200 },
        );
    } catch (error) {
        const conflict =
            error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT';
        return privateJson(
            {
                error: conflict
                    ? 'Idempotency key already used.'
                    : error instanceof RangeError
                      ? error.message
                      : 'Unable to save food.',
            },
            {
                status: conflict
                    ? 409
                    : error instanceof RangeError
                      ? 400
                      : 500,
            },
        );
    }
}
export const POST = write;
export const PATCH = write;
