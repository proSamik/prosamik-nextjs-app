import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFilterSearch, buildTags, filterPosts, parseFilterParams, tagSlug, type BlogListItem } from './filter.ts';

const item = (slug: string, title: string, category: string, keywords: string[] = [], description = ''): BlogListItem =>
    ({ slug, href: `/blogs/${slug}`, title, description, category, readTime: '10 min', keywords });

const items = [
    item('a', 'How to Use a UTM MCP Server for Windows', 'VM test automation', ['utm', 'windows mcp'], 'Test apps in a VM.'),
    item('b', 'SSH into a Linux VM from a Mac', 'Remote access', ['ssh', 'openssh']),
    item('c', 'Cron Jobs for Next.js in Coolify', 'Deployment', ['coolify cron job'], 'Scheduled tasks.'),
    item('d', 'Healthcheck in Coolify', 'Deployment', ['coolify healthcheck']),
];

test('tags: one per category with counts, in first-seen order', () => {
    assert.deepEqual(buildTags(items).map((t) => [t.slug, t.count]), [['vm-test-automation', 1], ['remote-access', 1], ['deployment', 2]]);
    assert.equal(tagSlug('MCP servers'), 'mcp-servers');
});

test('empty search and no tag returns everything', () => assert.equal(filterPosts(items, '  ', null).length, 4));

test('search is case-insensitive and matches title, description and keywords', () => {
    assert.deepEqual(filterPosts(items, 'UTM', null).map((i) => i.slug), ['a']);
    assert.deepEqual(filterPosts(items, 'scheduled', null).map((i) => i.slug), ['c']);
    assert.deepEqual(filterPosts(items, 'openssh', null).map((i) => i.slug), ['b']);
});

test('every word must match (AND), in any order', () => {
    assert.deepEqual(filterPosts(items, 'coolify cron', null).map((i) => i.slug), ['c']);
    assert.deepEqual(filterPosts(items, 'cron coolify', null).map((i) => i.slug), ['c']);
    assert.deepEqual(filterPosts(items, 'coolify docker', null), []);
});

test('tag and search combine', () => {
    assert.deepEqual(filterPosts(items, '', 'deployment').map((i) => i.slug), ['c', 'd']);
    assert.deepEqual(filterPosts(items, 'health', 'deployment').map((i) => i.slug), ['d']);
    assert.deepEqual(filterPosts(items, 'health', 'remote-access'), []);
});

test('URL params round-trip and unknown tags are ignored', () => {
    const tags = buildTags(items);
    assert.equal(buildFilterSearch('', null), '');
    assert.equal(buildFilterSearch(' ssh ', 'remote-access'), '?q=ssh&tag=remote-access');
    assert.deepEqual(parseFilterParams('?q=ssh&tag=remote-access', tags), { query: 'ssh', tag: 'remote-access' });
    assert.deepEqual(parseFilterParams('?tag=nope', tags), { query: '', tag: null });
});
