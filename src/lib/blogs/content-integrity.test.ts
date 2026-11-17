import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { extractFaqs } from './faq.ts';

// Guards the data that feeds structured data, the sitemap and llms.txt: every post must have valid dates,
// the required frontmatter, a real FAQ (for FAQPage schema) and a unique, explicit position.
const dir = path.join(process.cwd(), 'content', 'blogs');
const slugs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(dir, entry.name, 'en.md')))
    .map((entry) => entry.name);

function parse(slug: string) {
    const raw = readFileSync(path.join(dir, slug, 'en.md'), 'utf8');
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    assert.ok(match, `${slug}: frontmatter missing`);
    const data: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const i = line.indexOf(':');
        if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    return { data, body: match[2] };
}

test('there are posts to check', () => assert.ok(slugs.length >= 18));

for (const slug of slugs) {
    test(`${slug}: frontmatter, dates and FAQ are valid`, () => {
        const { data, body } = parse(slug);
        for (const key of ['title', 'description', 'category', 'publishedAt', 'updatedAt', 'readTime', 'primaryKeyword', 'subclipBlurb', 'rankizzBlurb']) {
            assert.ok(data[key], `${slug}: ${key} is required`);
        }
        assert.match(data.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.match(data.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(!Number.isNaN(Date.parse(data.updatedAt)), `${slug}: updatedAt is not a date`);
        assert.ok(data.updatedAt >= data.publishedAt, `${slug}: updatedAt is before publishedAt`);
        assert.ok(data.description.length >= 60 && data.description.length <= 200, `${slug}: description length ${data.description.length}`);
        const faqs = extractFaqs(body);
        assert.ok(faqs.length >= 3, `${slug}: needs at least 3 FAQ entries for FAQPage schema, found ${faqs.length}`);
        for (const faq of faqs) assert.ok(faq.answer.length > 20, `${slug}: FAQ "${faq.question}" has an empty answer`);
    });
}

test('post order values are unique numbers', () => {
    const orders = slugs.map((slug) => parse(slug).data.order).filter(Boolean);
    assert.equal(new Set(orders).size, orders.length, 'duplicate order values');
    for (const value of orders) assert.match(value, /^\d+$/);
});
