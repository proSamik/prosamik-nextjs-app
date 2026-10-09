import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import {
    isPersonalApiKeyAuthorization,
    parsePersonalApiKeyAuthorization,
    principalFromVerifiedMcpClaims,
    resolveAccountabilityMcpResourceUrl,
    validateAccountabilityMcpRequest,
} from './accountability-mcp-security.ts';

test('accepts only canonical HTTPS resources outside loopback', () => {
    assert.equal(
        resolveAccountabilityMcpResourceUrl('https://accountability.example', '').toString(),
        'https://accountability.example/api/mcp',
    );
    assert.equal(
        resolveAccountabilityMcpResourceUrl('http://localhost:3000').toString(),
        'http://localhost:3000/api/mcp',
    );
    assert.throws(() => resolveAccountabilityMcpResourceUrl('http://accountability.example'));
    assert.throws(() => resolveAccountabilityMcpResourceUrl('https://accountability.example', 'https://accountability.example/api/mcp?token=x'));
    assert.throws(() => resolveAccountabilityMcpResourceUrl('https://accountability.example', 'https://accountability.example/other'));
});

test('recognizes only the personal API-key bearer prefix and exact selector.secret form', () => {
    const secret = 'A'.repeat(43);
    const header = `Bearer psamik_Abcdef12.${secret}`;
    assert.equal(isPersonalApiKeyAuthorization(header), true);
    assert.deepEqual(parsePersonalApiKeyAuthorization(header), {
        token: `psamik_Abcdef12.${secret}`,
        keyId: 'Abcdef12',
    });
    assert.equal(isPersonalApiKeyAuthorization('Bearer eyJhbGciOiJSUzI1NiJ9.jwt'), false);
    assert.equal(parsePersonalApiKeyAuthorization(`Bearer psamik_Abcdef12.${secret}extra`), null);
    assert.equal(parsePersonalApiKeyAuthorization('Bearer psamik_bad.selector'), null);
});

test('requires the exact endpoint host and rejects cross-origin or malformed origins', () => {
    const resource = new URL('https://accountability.example/api/mcp');
    const sameOrigin = new Request(resource, {
        method: 'POST',
        headers: { host: 'accountability.example', origin: 'https://accountability.example' },
    });
    const nativeClient = new Request(resource, { method: 'POST', headers: { host: 'accountability.example' } });
    const wrongHost = new Request(resource, { method: 'POST', headers: { host: 'attacker.example' } });
    const wrongOrigin = new Request(resource, {
        method: 'POST',
        headers: { host: 'accountability.example', origin: 'https://attacker.example' },
    });
    const nullOrigin = new Request(resource, {
        method: 'POST',
        headers: { host: 'accountability.example', origin: 'null' },
    });

    assert.equal(validateAccountabilityMcpRequest(sameOrigin, resource), true);
    assert.equal(validateAccountabilityMcpRequest(nativeClient, resource), true);
    assert.equal(validateAccountabilityMcpRequest(wrongHost, resource), false);
    assert.equal(validateAccountabilityMcpRequest(wrongOrigin, resource), false);
    assert.equal(validateAccountabilityMcpRequest(nullOrigin, resource), false);
});

test('accepts proxy-internal request URLs only with the configured public Host and endpoint', () => {
    const resource = new URL('https://www.prosamik.com/api/mcp');
    const request = (url: string, headers: Record<string, string> = {}) => new Request(url, {
        method: 'POST',
        headers: { host: resource.host, ...headers },
    });
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/api/mcp'), resource), true);
    assert.equal(validateAccountabilityMcpRequest(request('http://www.prosamik.com/api/mcp'), resource), true);
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/api/mcp', {
        origin: resource.origin,
    }), resource), true);
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/api/mcp', {
        host: 'attacker.example', 'x-forwarded-host': resource.host,
    }), resource), false);
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/api/mcp', {
        origin: 'https://attacker.example', 'x-forwarded-host': resource.host,
    }), resource), false);
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/other'), resource), false);
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/api/mcp?token=x'), resource), false);
    assert.equal(validateAccountabilityMcpRequest(request('http://localhost:3000/api/mcp', {
        origin: `${resource.origin}/untrusted`,
    }), resource), false);
});

test('binds the verified token to its owner, OAuth client, issuer, audience, scope and expiry', () => {
    const resource = new URL('https://accountability.example/api/mcp');
    const claims = {
        iss: 'https://accountability.example',
        aud: resource.toString(),
        sub: 'owner-user-id',
        client_id: 'registered-client-id',
        scope: 'openid progress:read check-ins:write',
        exp: 2_000_000_000,
    };
    const principal = principalFromVerifiedMcpClaims(
        claims,
        'Bearer signed-access-token',
        claims.iss,
        resource,
        1_900_000_000,
    );

    assert.ok(principal);
    assert.equal(principal.ownerId, 'owner-user-id');
    assert.equal(principal.clientId, 'registered-client-id');
    assert.notEqual(principal.sourceId, principal.clientId);
    assert.deepEqual(principal.scopes, ['openid', 'progress:read', 'check-ins:write']);
    assert.equal(principal.token, createHash('sha256').update('signed-access-token').digest('base64url'));
    assert.notEqual(principal.token, 'signed-access-token');
    assert.equal(principal.expiresAt, 2_000_000_000);

    assert.equal(principalFromVerifiedMcpClaims({ ...claims, iss: 'https://wrong.example' }, 'Bearer x', claims.iss, resource, 1_900_000_000), null);
    assert.equal(principalFromVerifiedMcpClaims({ ...claims, aud: 'https://wrong.example/mcp' }, 'Bearer x', claims.iss, resource, 1_900_000_000), null);
    assert.equal(principalFromVerifiedMcpClaims({ ...claims, exp: 1_900_000_000 }, 'Bearer x', claims.iss, resource, 1_900_000_000), null);
    assert.equal(principalFromVerifiedMcpClaims({ ...claims, sub: '' }, 'Bearer x', claims.iss, resource, 1_900_000_000), null);
    assert.equal(principalFromVerifiedMcpClaims({ ...claims, client_id: undefined }, 'Bearer x', claims.iss, resource, 1_900_000_000), null);
    assert.equal(principalFromVerifiedMcpClaims({ ...claims, scope: 'progress:read bad$scope' }, 'Bearer x', claims.iss, resource, 1_900_000_000), null);
    assert.equal(principalFromVerifiedMcpClaims(claims, null, claims.iss, resource, 1_900_000_000), null);
});
