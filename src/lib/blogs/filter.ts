// Search and tag (category) filtering for /blogs. Pure functions so they are easy to test; the UI that uses
// them is BlogsBrowser. Filtering runs across ALL posts, not just the current page.

export interface BlogListItem {
    slug: string;
    href: string;
    title: string;
    description: string;
    category: string;
    readTime: string;
    keywords: string[];
}

export interface TagOption {
    name: string;
    slug: string;
    count: number;
}

export const tagSlug = (category: string) => category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const normalize = (value: string) =>
    value.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.+# ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** One tag badge per category, with how many posts it holds, in the order the categories first appear. */
export function buildTags(items: readonly BlogListItem[]): TagOption[] {
    const tags = new Map<string, TagOption>();
    for (const item of items) {
        const slug = tagSlug(item.category);
        const existing = tags.get(slug);
        if (existing) existing.count += 1;
        else tags.set(slug, { name: item.category, slug, count: 1 });
    }
    return [...tags.values()];
}

/** Every word of the query must appear somewhere in the title, description, category or keywords. */
export function filterPosts(items: readonly BlogListItem[], query: string, tag: string | null): BlogListItem[] {
    const words = normalize(query).split(' ').filter(Boolean);
    return items.filter((item) => {
        if (tag && tagSlug(item.category) !== tag) return false;
        if (words.length === 0) return true;
        const haystack = normalize([item.title, item.description, item.category, ...item.keywords].join(' '));
        return words.every((word) => haystack.includes(word));
    });
}

/** Reads ?q= and ?tag= from a query string; an unknown tag is ignored. */
export function parseFilterParams(search: string, tags: readonly TagOption[]): { query: string; tag: string | null } {
    const params = new URLSearchParams(search);
    const tag = params.get('tag');
    return { query: (params.get('q') ?? '').slice(0, 120), tag: tag && tags.some((t) => t.slug === tag) ? tag : null };
}

/** Builds the query string for the URL bar ('' when no filter is active). */
export function buildFilterSearch(query: string, tag: string | null): string {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (tag) params.set('tag', tag);
    const text = params.toString();
    return text ? `?${text}` : '';
}
