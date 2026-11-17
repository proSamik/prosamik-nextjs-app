import assert from 'node:assert/strict';
import test from 'node:test';
import { siteMetadata } from './siteMetadata.ts';

test('default description fits a search snippet (120-160 characters)', () => {
    const length = siteMetadata.defaultDescription.length;
    assert.ok(length >= 120 && length <= 160, `defaultDescription is ${length} characters`);
});

test('Open Graph image is declared at the standard 1200x630 link-preview size', () => {
    assert.equal(siteMetadata.ogImageWidth, 1200);
    assert.equal(siteMetadata.ogImageHeight, 630);
    assert.match(siteMetadata.defaultImage, /^https:\/\//);
});
