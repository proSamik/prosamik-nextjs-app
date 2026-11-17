import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { extractFaqs } from './faq.ts';
import { RESERVED_SLUGS } from './pagination.ts';

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
        assert.ok(data.description.length >= 90 && data.description.length <= 160, `${slug}: description should be 90-160 characters for search snippets, got ${data.description.length}`);
        assert.ok(data.seoTitle && data.seoTitle.length >= 30 && data.seoTitle.length <= 60, `${slug}: seoTitle should be 30-60 characters, got ${data.seoTitle?.length}`);
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

// Privacy guard: posts get pasted into agents and indexed, so they must never carry the author's real
// addresses, machine/user names, emails, IDs or secret-shaped strings. Use placeholders (<vm-ip>, <user>),
// ranges (192.168.x.x) or generic examples instead.
const ALLOWED_IPS = new Set(['0.0.0.0', '127.0.0.1', '0.0.1.0']); // bind-all, loopback, a Windows feature version
const FORBIDDEN: Array<[string, RegExp]> = [
    ['email address', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/],
    ['home directory with a real user name', /\/Users\/(?!<)[A-Za-z0-9._-]+|\/home\/(?!<)[A-Za-z0-9._-]+|C:\\Users\\(?![<\\])[A-Za-z0-9._-]+/],
    ['UUID', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
    ['secret-shaped token', /\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|gho_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/],
    ["the author's real subnet (use 192.168.x.x or <vm-ip>)", /192\.168\.64/],
    ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

for (const slug of slugs) {
    test(`${slug}: contains no personal identifiers`, () => {
        const raw = readFileSync(path.join(dir, slug, 'en.md'), 'utf8');
        for (const ip of raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []) {
            assert.ok(ALLOWED_IPS.has(ip), `${slug}: contains a specific IP address (${ip}). Use <vm-ip> or a generic range like 192.168.x.x`);
        }
        for (const [label, pattern] of FORBIDDEN) {
            const match = raw.match(pattern);
            assert.ok(!match, `${slug}: contains a ${label} (${match?.[0]?.slice(0, 40)}). Replace it with a placeholder`);
        }
    });
}

test('no post uses a slug reserved for routing (e.g. "page" for /blogs/page/<n>)', () => {
    for (const slug of slugs) assert.ok(!RESERVED_SLUGS.includes(slug), `${slug} is a reserved slug`);
});
