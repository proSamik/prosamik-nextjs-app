import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOGS_PER_PAGE, RESERVED_SLUGS, pageHref, pageWindow, paginate, parsePage, totalPages } from './pagination.ts';

test('totalPages is at least 1 and rounds up', () => {
    assert.equal(totalPages(0), 1);
    assert.equal(totalPages(BLOGS_PER_PAGE), 1);
    assert.equal(totalPages(BLOGS_PER_PAGE + 1), 2);
    assert.equal(totalPages(25, 10), 3);
});

test('paginate slices the right window and never goes negative', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    assert.deepEqual(paginate(items, 1, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(paginate(items, 3, 10), [21, 22, 23, 24, 25]);
    assert.deepEqual(paginate(items, 0, 10), paginate(items, 1, 10));
    assert.deepEqual(paginate(items, 9, 10), []);
});

test('page 1 is /blogs and later pages are /blogs/page/<n>', () => {
    assert.equal(pageHref(1), '/blogs');
    assert.equal(pageHref(2), '/blogs/page/2');
});

test('parsePage only accepts positive whole numbers without leading zeros', () => {
    assert.equal(parsePage('2'), 2);
    for (const bad of ['0', '-1', '01', '1.5', 'x', '', '2a']) assert.equal(parsePage(bad), null);
});

test('pageWindow collapses gaps with ellipses', () => {
    assert.deepEqual(pageWindow(1, 1), [1]);
    assert.deepEqual(pageWindow(2, 3), [1, 2, 3]);
    assert.deepEqual(pageWindow(1, 10), [1, 2, '…', 10]);
    assert.deepEqual(pageWindow(5, 10), [1, '…', 4, 5, 6, '…', 10]);
    assert.deepEqual(pageWindow(10, 10), [1, '…', 9, 10]);
});

test('the slug "page" is reserved', () => assert.ok(RESERVED_SLUGS.includes('page')));
