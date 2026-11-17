import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePromoLinks, utmUrl } from './promo.ts';

test('utmUrl attributes a product link to the post and placement', () => {
    const url = new URL(utmUrl('subclip', 'windows-mcp-server-for-mac-utm-vm', 'inline-recording'));
    assert.equal(url.origin, 'https://www.subclip.app');
    assert.equal(url.pathname, '/');
    assert.equal(url.searchParams.get('utm_source'), 'prosamik.com');
    assert.equal(url.searchParams.get('utm_medium'), 'blog');
    assert.equal(url.searchParams.get('utm_campaign'), 'windows-mcp-server-for-mac-utm-vm');
    assert.equal(url.searchParams.get('utm_content'), 'inline-recording');
});

test('resolvePromoLinks expands product schemes and keeps paths', () => {
    const out = resolvePromoLinks('See [Subclip](subclip:inline-a) and [pricing](rankizz:inline-b/pricing) or [docs](https://example.com).', 'my-post');
    assert.match(out, /\(https:\/\/www\.subclip\.app\/\?utm_source=prosamik\.com&utm_medium=blog&utm_campaign=my-post&utm_content=inline-a\)/);
    assert.match(out, /\(https:\/\/www\.rankizz\.com\/pricing\?utm_source=prosamik\.com&utm_medium=blog&utm_campaign=my-post&utm_content=inline-b\)/);
    assert.match(out, /\(https:\/\/example\.com\)/);
});

test('resolvePromoLinks leaves plain text mentions alone', () => {
    assert.equal(resolvePromoLinks('subclip:inline-a is not a link', 'x'), 'subclip:inline-a is not a link');
});
