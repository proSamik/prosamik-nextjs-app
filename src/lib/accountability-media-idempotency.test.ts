import assert from 'node:assert/strict';
import test from 'node:test';
import {
    digestMediaUploadIdempotencyKey,
    digestMediaUploadRequest,
    mediaUploadOperationKey,
} from './accountability-media-idempotency.ts';

test('upload operation keys keep authenticated admin and MCP sources separate', () => {
    assert.equal(mediaUploadOperationKey({ kind: 'admin', id: 'admin-web' }), 'media.upload.admin.admin-web');
    assert.equal(mediaUploadOperationKey({ kind: 'mcp', id: 'client:verified-hash' }), 'media.upload.mcp.client:verified-hash');
    assert.notEqual(
        mediaUploadOperationKey({ kind: 'admin', id: 'same-key' }),
        mediaUploadOperationKey({ kind: 'mcp', id: 'same-key' }),
    );
});

test('idempotency keys are stored only as stable SHA-256 digests', () => {
    const first = digestMediaUploadIdempotencyKey('upload-intent-1');
    const retry = digestMediaUploadIdempotencyKey('upload-intent-1');
    assert.equal(first.length, 32);
    assert.deepEqual(first, retry);
    assert.notDeepEqual(first, digestMediaUploadIdempotencyKey('upload-intent-2'));
});

test('canonical upload metadata hashes are stable and payload-specific', () => {
    const first = {
        localDate: '2026-10-07', category: 'body', pose: 'front', privateNotes: null,
        displayName: 'check-in.jpg', contentType: 'image/jpeg', byteSize: 1024,
    };
    assert.deepEqual(digestMediaUploadRequest(first), digestMediaUploadRequest({ ...first }));
    assert.notDeepEqual(digestMediaUploadRequest(first), digestMediaUploadRequest({ ...first, byteSize: 2048 }));
});
