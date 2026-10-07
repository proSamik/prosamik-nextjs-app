import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeJsonLd } from '../src/lib/structured-data.ts';

test('JSON-LD serialization prevents closing-script breakout and round-trips content', () => {
    const value = {
        headline: '</script><script>globalThis.xss = true</script>',
        description: 'A & B > C < D',
        separators: '\u2028\u2029',
    };
    const serialized = serializeJsonLd(value);
    assert.equal(serialized.includes('</script>'), false);
    assert.equal(serialized.includes('<script'), false);
    assert.match(serialized, /\\u003c\/script\\u003e/);
    assert.deepEqual(JSON.parse(serialized), value);
});
