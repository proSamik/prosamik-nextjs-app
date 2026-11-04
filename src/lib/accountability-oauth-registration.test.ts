import assert from 'node:assert/strict';
import test from 'node:test';
import { inferNativeApplicationType } from './accountability-oauth-registration.ts';

test('infers native for loopback-only redirects without application_type', () => {
    for (const uri of ['http://127.0.0.1:33418/callback', 'http://localhost:8080/cb', 'http://[::1]:9000/cb']) {
        assert.equal(inferNativeApplicationType({ redirect_uris: [uri] })?.application_type, 'native');
    }
    assert.equal(
        inferNativeApplicationType({ redirect_uris: ['com.example.app:/oauth'] })?.application_type,
        'native',
    );
});

test('leaves web clients and explicit application types alone', () => {
    assert.equal(inferNativeApplicationType({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }), null);
    assert.equal(
        inferNativeApplicationType({ redirect_uris: ['http://127.0.0.1:1/cb', 'https://example.com/cb'] }),
        null,
    );
    assert.equal(
        inferNativeApplicationType({ application_type: 'web', redirect_uris: ['http://127.0.0.1:1/cb'] }),
        null,
    );
    assert.equal(inferNativeApplicationType({ redirect_uris: ['http://evil.example/cb'] }), null);
    assert.equal(inferNativeApplicationType({ redirect_uris: [] }), null);
    assert.equal(inferNativeApplicationType(null), null);
});
