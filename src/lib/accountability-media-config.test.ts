import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPrivateBucketIsDistinct } from './accountability-media-config.ts';

test('private media rejects the public Random Thoughts bucket', () => {
    assert.throws(
        () => assertPrivateBucketIsDistinct('prosamik-random-thoughts', 'prosamik-random-thoughts'),
        /distinct from the public Random Thoughts bucket/,
    );
});

test('private media accepts a configured bucket distinct from the public bucket', () => {
    assert.equal(
        assertPrivateBucketIsDistinct('prosamik-secure-bucket', 'prosamik-random-thoughts'),
        'prosamik-secure-bucket',
    );
});

test('private media fails closed when the private bucket is missing', () => {
    assert.throws(
        () => assertPrivateBucketIsDistinct(undefined, 'prosamik-random-thoughts'),
        /SECURE_BUCKET is not configured/,
    );
});
