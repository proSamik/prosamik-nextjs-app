import assert from 'node:assert/strict';
import test from 'node:test';
import { linkProviders, PROVIDERS } from './providers.ts';

const count = (html: string, name: string) => (html.match(new RegExp(`>${name}</a>`, 'g')) ?? []).length;

test('links only the first prose mention, with nofollow', () => {
    const out = linkProviders('<p>Use Hetzner today. Hetzner is cheap.</p>');
    assert.equal(count(out, 'Hetzner'), 1);
    assert.match(out, /rel="nofollow noopener noreferrer"/);
    assert.ok(out.endsWith('Hetzner is cheap.</p>'));
});

test('skips code, headings, existing links and table headers', () => {
    const html = '<h2>Sentry</h2><pre><code>Sentry</code></pre><a href="/x">Sentry</a><table><th>Sentry</th></table><p>Then Sentry.</p>';
    const out = linkProviders(html);
    assert.equal(count(out, 'Sentry'), 2); // the author's own link plus one auto-link
    assert.ok(out.endsWith('<p>Then <a href="https://sentry.io" target="_blank" rel="nofollow noopener noreferrer">Sentry</a>.</p>'));
});

test('longest name wins and a link is never nested', () => {
    const out = linkProviders('<p>Cloudflare Tunnel then Cloudflare DNS</p>');
    assert.equal(count(out, 'Cloudflare Tunnel'), 1);
    assert.equal(count(out, 'Cloudflare'), 1);
    assert.doesNotMatch(out, /<a[^>]*>[^<]*<a /);
});

test('does not link inside URLs or hostnames', () => {
    const out = linkProviders('<p>docs at coolify.io and Coolify/app</p>');
    assert.equal(count(out, 'Coolify'), 0);
});

test('every provider has an https url', () => {
    for (const provider of PROVIDERS) assert.match(provider.url, /^https:\/\//);
});
