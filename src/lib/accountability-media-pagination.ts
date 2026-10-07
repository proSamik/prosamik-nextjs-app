import { addActivityDays, assertActivityDate, toIstActivityDate, type ActivityDate } from './accountability-domain.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PrivateMediaCursor = {
    localDate: ActivityDate;
    createdAt: string;
    id: string;
};

export function resolvePrivateMediaDateRange(
    input: { fromDate?: string; toDate?: string },
    today: ActivityDate = toIstActivityDate(new Date()),
): { fromDate: ActivityDate; toDate: ActivityDate } {
    const validatedToday = assertActivityDate(today);
    const toDate = input.toDate ? assertActivityDate(input.toDate) : validatedToday;
    const fromDate = input.fromDate ? assertActivityDate(input.fromDate) : addActivityDays(toDate, -29);
    if (toDate > validatedToday || fromDate > toDate || fromDate < addActivityDays(toDate, -365)) {
        throw new RangeError('Media date range must be within the past 366 days.');
    }
    return { fromDate, toDate };
}

function validateCursor(value: unknown): PrivateMediaCursor {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Invalid media cursor.');
    const cursor = value as Record<string, unknown>;
    if (Object.keys(cursor).sort().join(',') !== 'createdAt,id,localDate,v'
        || cursor.v !== 1
        || typeof cursor.localDate !== 'string'
        || typeof cursor.createdAt !== 'string'
        || typeof cursor.id !== 'string') {
        throw new RangeError('Invalid media cursor.');
    }

    const localDate = assertActivityDate(cursor.localDate);
    const parsedCreatedAt = new Date(cursor.createdAt);
    if (!Number.isFinite(parsedCreatedAt.getTime()) || parsedCreatedAt.toISOString() !== cursor.createdAt
        || !UUID_PATTERN.test(cursor.id)) {
        throw new RangeError('Invalid media cursor.');
    }
    return { localDate, createdAt: cursor.createdAt, id: cursor.id };
}

/** A compact URL-safe keyset token; its fields are validated before SQL use. */
export function encodePrivateMediaCursor(value: PrivateMediaCursor): string {
    const cursor = validateCursor({ v: 1, ...value });
    return Buffer.from(JSON.stringify({ v: 1, ...cursor }), 'utf8').toString('base64url');
}

export function decodePrivateMediaCursor(value: string): PrivateMediaCursor {
    if (!value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new RangeError('Invalid media cursor.');
    }

    let text: string;
    try {
        const bytes = Buffer.from(value, 'base64url');
        text = bytes.toString('utf8');
        if (bytes.toString('base64url') !== value) throw new Error('Non-canonical cursor.');
        return validateCursor(JSON.parse(text));
    } catch {
        throw new RangeError('Invalid media cursor.');
    }
}
