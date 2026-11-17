import assert from 'node:assert/strict';
import test from 'node:test';
import { blogsDescription, blogsTitle } from './seo.ts';

test('index and paginated SEO copy stays within search-result limits', () => {
    for (const page of [1, 2, 3, 9, 10, 99]) {
        const title = blogsTitle(page);
        const description = blogsDescription(page, 99);
        assert.ok(title.length >= 30 && title.length <= 60, `title for page ${page} is ${title.length} characters: ${title}`);
        assert.ok(description.length >= 90 && description.length <= 160, `description for page ${page} is ${description.length} characters`);
    }
});

test('titles carry no site-name suffix', () => {
    for (const page of [1, 2, 3]) assert.ok(!/\|/.test(blogsTitle(page)), `title for page ${page} has a pipe suffix`);
});

test('paginated titles and descriptions are unique per page', () => {
    assert.notEqual(blogsTitle(1), blogsTitle(2));
    assert.notEqual(blogsTitle(2), blogsTitle(3));
    assert.notEqual(blogsDescription(1, 3), blogsDescription(2, 3));
});
