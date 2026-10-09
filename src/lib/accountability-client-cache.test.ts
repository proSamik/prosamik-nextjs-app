import assert from 'node:assert/strict';
import test from 'node:test';
import { clearAccountabilityCache, peekAccountabilityCache, readAccountabilityCache } from './accountability-client-cache.ts';

test('private cache deduplicates simultaneous loads and invalidates after writes', async () => {
    clearAccountabilityCache();
    let calls = 0;
    const load = async () => { calls += 1; return { entries: [80.2] }; };
    const [first, second] = await Promise.all([
        readAccountabilityCache('/weight', load), readAccountabilityCache('/weight', load),
    ]);
    assert.deepEqual(first, second);
    assert.equal(calls, 1);
    await readAccountabilityCache('/weight', load);
    assert.equal(calls, 1);
    clearAccountabilityCache();
    assert.equal(peekAccountabilityCache('/weight'), undefined);
    await readAccountabilityCache('/weight', load);
    assert.equal(calls, 2);
    clearAccountabilityCache();
});

test('a request started before sign-out cannot repopulate the private cache', async () => {
    clearAccountabilityCache();
    let finish!: (value: unknown) => void;
    const request = readAccountabilityCache('/private', () => new Promise(resolve => { finish = resolve; }));
    clearAccountabilityCache(true);
    finish({ privateData: 'old session' });
    await request;
    assert.equal(peekAccountabilityCache('/private'), undefined);
});
