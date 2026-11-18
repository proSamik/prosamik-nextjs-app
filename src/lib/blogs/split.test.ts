import assert from 'node:assert/strict';
import test from 'node:test';
import { splitHtmlAtMiddle } from './split.ts';

const section = (n: number) => `<h2>S${n}</h2><p>${'word '.repeat(80)}</p>`;

test('splits at the heading nearest the middle and loses nothing', () => {
    const html = [1, 2, 3, 4, 5, 6].map(section).join('');
    const [first, second] = splitHtmlAtMiddle(html);
    assert.equal(first + second, html);
    assert.ok(second.startsWith('<h2>S4') || second.startsWith('<h2>S3'));
});

test('keeps short articles whole', () => {
    const html = `<p>intro</p>${section(1)}`;
    assert.deepEqual(splitHtmlAtMiddle(html), [html, '']);
});

test('ignores escaped heading text inside code', () => {
    const html = `<pre>&lt;h2&gt;x&lt;/h2&gt;</pre>${section(1)}${section(2)}`;
    const [first, second] = splitHtmlAtMiddle(html);
    assert.equal(first + second, html);
});
