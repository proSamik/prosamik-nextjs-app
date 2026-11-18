import assert from 'node:assert/strict';
import test from 'node:test';
import { SlidingWindowLimiter } from './rate-limit.ts';

test('blocks after the limit and recovers when the window passes', () => {
    const limiter = new SlidingWindowLimiter();
    const rule = { limit: 3, windowMs: 1000 };
    assert.deepEqual([0, 1, 2].map((i) => limiter.hit('a', rule, i)), [false, false, false]);
    assert.equal(limiter.hit('a', rule, 3), true);
    assert.equal(limiter.hit('b', rule, 3), false);
    assert.equal(limiter.hit('a', rule, 2000), false);
});

test('memory stays bounded under a flood of unique keys', () => {
    const limiter = new SlidingWindowLimiter(100);
    for (let i = 0; i < 1000; i += 1) limiter.hit(`ip-${i}`, { limit: 5, windowMs: 60_000 }, i);
    assert.ok((limiter as unknown as { hits: Map<string, number[]> }).hits.size <= 101);
});
