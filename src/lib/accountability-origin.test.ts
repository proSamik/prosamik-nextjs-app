import assert from 'node:assert/strict';
import test from 'node:test';
import { isSameOriginRequest } from './accountability-origin.ts';

function mutation(url: string, origin?: string, extra: Record<string, string> = {}) {
    return new Request(url, {
        method: 'POST',
        headers: { ...(origin ? { origin } : {}), ...extra },
    });
}

test('public HTTPS origin works behind an internal HTTP reverse proxy', () => {
    const request = mutation('http://localhost:3000/api/samik-admin/api-keys', 'https://prosamik.com', {
        host: 'prosamik.com', 'x-forwarded-proto': 'https',
    });
    assert.equal(isSameOriginRequest(request, ['https://prosamik.com']), true);
    assert.equal(isSameOriginRequest(request, ['https://prosamik.com/api/auth']), true);
});

test('only explicitly configured public origins are accepted behind a proxy', () => {
    const urls = ['https://prosamik.com', 'https://www.prosamik.com'];
    assert.equal(isSameOriginRequest(mutation('http://internal:3000/api', 'https://www.prosamik.com'), urls), true);
    for (const origin of ['https://attacker.invalid', 'https://prosamik.com.attacker.invalid', 'http://prosamik.com', 'https://prosamik.com:444', 'http://internal:3000']) {
        assert.equal(isSameOriginRequest(mutation('http://internal:3000/api', origin, {
            host: 'prosamik.com', 'x-forwarded-host': new URL(origin).host, 'x-forwarded-proto': 'https',
        }), urls), false);
    }
});

test('missing, malformed and credential-bearing origins are rejected', () => {
    for (const origin of [undefined, 'null', 'not a URL', 'https://prosamik.com/path', 'https://user@prosamik.com', 'https://prosamik.com, https://attacker.invalid']) {
        assert.equal(isSameOriginRequest(mutation('http://internal:3000/api', origin), ['https://prosamik.com']), false);
    }
    assert.equal(isSameOriginRequest(mutation('https://prosamik.com/api', 'https://prosamik.com'), ['invalid']), false);
});

test('unconfigured direct hosting requires exact origin, host and port', () => {
    assert.equal(isSameOriginRequest(mutation('http://localhost:3000/api', 'http://localhost:3000', { host: 'localhost:3000' }), []), true);
    assert.equal(isSameOriginRequest(mutation('http://localhost:3000/api', 'http://localhost:3001'), []), false);
    assert.equal(isSameOriginRequest(mutation('http://localhost:3000/api', 'http://localhost:3000', { host: 'attacker.invalid' }), []), false);
    assert.equal(isSameOriginRequest(mutation('http://localhost:3000/api', 'https://prosamik.com', {
        'x-forwarded-host': 'prosamik.com', 'x-forwarded-proto': 'https',
    }), []), false);
});
