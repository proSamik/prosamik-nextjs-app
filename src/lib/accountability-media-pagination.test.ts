import assert from 'node:assert/strict';
import test from 'node:test';
import {
    decodePrivateMediaCursor,
    encodePrivateMediaCursor,
    resolvePrivateMediaDateRange,
} from './accountability-media-pagination.ts';

test('private media cursor is stable, URL-safe and contains only the keyset tuple', () => {
    const tuple = {
        localDate: '2026-10-07',
        createdAt: '2026-10-07T12:00:00.000Z',
        id: '11111111-1111-4111-8111-111111111111',
    };
    const cursor = encodePrivateMediaCursor(tuple);
    assert.match(cursor, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(decodePrivateMediaCursor(cursor), tuple);
    assert.equal(cursor.includes('ownerId'), false);
});

test('private media cursor rejects malformed, non-canonical and extra-field values', () => {
    assert.throws(() => decodePrivateMediaCursor('not-base64!'), /Invalid media cursor/);
    const extra = Buffer.from(JSON.stringify({
        v: 1,
        localDate: '2026-10-07',
        createdAt: '2026-10-07T12:00:00.000Z',
        id: '11111111-1111-4111-8111-111111111111',
        ownerId: 'another-user',
    })).toString('base64url');
    assert.throws(() => decodePrivateMediaCursor(extra), /Invalid media cursor/);
    assert.throws(() => decodePrivateMediaCursor(`${extra}=`), /Invalid media cursor/);
});

test('private media date ranges are valid, non-future and limited to 366 inclusive days', () => {
    assert.deepEqual(resolvePrivateMediaDateRange({}, '2026-10-07'), {
        fromDate: '2026-09-08',
        toDate: '2026-10-07',
    });
    assert.deepEqual(resolvePrivateMediaDateRange({ fromDate: '2025-10-07', toDate: '2026-10-07' }, '2026-10-07'), {
        fromDate: '2025-10-07',
        toDate: '2026-10-07',
    });
    assert.throws(() => resolvePrivateMediaDateRange({ fromDate: '2026-10-08', toDate: '2026-10-07' }, '2026-10-07'), /past 366 days/);
    assert.throws(() => resolvePrivateMediaDateRange({ toDate: '2026-10-08' }, '2026-10-07'), /past 366 days/);
    assert.throws(() => resolvePrivateMediaDateRange({ fromDate: '2025-10-06', toDate: '2026-10-07' }, '2026-10-07'), /past 366 days/);
    assert.throws(() => resolvePrivateMediaDateRange({ fromDate: '2026-02-30' }, '2026-10-07'), /Invalid activity date/);
});
