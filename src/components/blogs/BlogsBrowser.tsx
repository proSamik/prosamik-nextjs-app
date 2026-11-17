'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { buildFilterSearch, filterPosts, parseFilterParams, tagSlug, type BlogListItem, type TagOption } from '@/lib/blogs/filter';

// Search box and category badges for /blogs. With no filter the server-rendered list (children, with its
// pagination) is shown, so crawlers and no-JS visitors get the full, paginated list. With a search or a
// badge selected, matching posts from ALL pages are listed instead. The state lives in the URL
// (?q=...&tag=...) so a filtered view can be shared.
export default function BlogsBrowser({ items, tags, children }: { items: BlogListItem[]; tags: TagOption[]; children: ReactNode }) {
    const [query, setQuery] = useState('');
    const [tag, setTag] = useState<string | null>(null);
    const ready = useRef(false);

    // Restore a shared filter from the URL after hydration.
    useEffect(() => {
        const initial = parseFilterParams(window.location.search, tags);
        setQuery(initial.query);
        setTag(initial.tag);
        ready.current = true;
    }, [tags]);

    // Keep the URL in sync (replaceState: filtering should not fill the back-button history).
    useEffect(() => {
        if (!ready.current) return;
        window.history.replaceState(null, '', `${window.location.pathname}${buildFilterSearch(query, tag)}`);
    }, [query, tag]);

    const active = query.trim() !== '' || tag !== null;
    const results = useMemo(() => filterPosts(items, query, tag), [items, query, tag]);
    const grouped = useMemo(() => {
        const groups = new Map<string, BlogListItem[]>();
        for (const result of results) groups.set(result.category, [...(groups.get(result.category) ?? []), result]);
        return [...groups.entries()];
    }, [results]);

    // Scroll positions change when the list swaps between the full view and results.
    useEffect(() => {
        let cancelled = false;
        void import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => { if (!cancelled) requestAnimationFrame(() => ScrollTrigger.refresh()); });
        return () => { cancelled = true; };
    }, [active, results.length]);

    const clear = () => { setQuery(''); setTag(null); };

    return (
        <>
            <div className="blog-toolbar" role="search">
                <label className="blog-search">
                    <Search size={18} aria-hidden="true" />
                    <input
                        type="search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" spellCheck={false}
                        placeholder="Search guides: UTM, SSH, Coolify, MCP…" aria-label="Search guides"
                    />
                    {query && <button type="button" className="blog-search-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={16} aria-hidden="true" /></button>}
                </label>
                <div className="blog-tags" role="group" aria-label="Filter by topic">
                    <button type="button" className="blog-tag" data-tone="all" aria-pressed={tag === null} onClick={() => setTag(null)}>
                        All <span>{items.length}</span>
                    </button>
                    {tags.map((option) => (
                        <button key={option.slug} type="button" className="blog-tag" data-tone={option.slug} aria-pressed={tag === option.slug} onClick={() => setTag(tag === option.slug ? null : option.slug)}>
                            <i aria-hidden="true" />{option.name} <span>{option.count}</span>
                        </button>
                    ))}
                </div>
                <p className="blog-results-note" role="status" aria-live="polite">
                    {active ? `${results.length} ${results.length === 1 ? 'guide' : 'guides'} found` : ''}
                    {active && <button type="button" onClick={clear}>Clear filters</button>}
                </p>
            </div>

            {/* The full list stays mounted (just hidden) so its scroll animations and SEO markup are untouched. */}
            <div hidden={active}>{children}</div>

            {active && (
                results.length === 0 ? (
                    <div className="blog-empty">
                        <strong>No guides match.</strong>
                        <span>Try a different word, or pick another topic.</span>
                        <button type="button" onClick={clear}>Show all guides</button>
                    </div>
                ) : (
                    grouped.map(([category, posts]) => (
                        <section key={category} className="blog-group" aria-labelledby={`found-${tagSlug(category)}`}>
                            <h2 id={`found-${tagSlug(category)}`}>{category}</h2>
                            <ul>
                                {posts.map((post) => (
                                    <li key={post.slug}>
                                        <Link href={post.href}>
                                            <span className="blog-row-title">{post.title}<ArrowUpRight size={20} /></span>
                                            <span className="blog-row-desc">{post.description}</span>
                                            <span className="blog-row-meta">{post.readTime} read</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))
                )
            )}
        </>
    );
}
