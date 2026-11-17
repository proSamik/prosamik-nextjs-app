// Pagination for /blogs. Pure functions (no server-only imports) so they can be tested directly.
// Page 1 lives at /blogs, later pages at /blogs/page/<n>. The slug "page" is reserved for that route.

export const BLOGS_PER_PAGE = 12;
export const RESERVED_SLUGS: readonly string[] = ['page'];

export function totalPages(count: number, perPage: number = BLOGS_PER_PAGE): number {
    return Math.max(1, Math.ceil(count / perPage));
}

export function paginate<T>(items: readonly T[], page: number, perPage: number = BLOGS_PER_PAGE): T[] {
    const start = (Math.max(1, page) - 1) * perPage;
    return items.slice(start, start + perPage);
}

export function pageHref(page: number): string {
    return page <= 1 ? '/blogs' : `/blogs/page/${page}`;
}

/** "2" -> 2; anything that is not a positive whole number (or has leading zeros) -> null. */
export function parsePage(value: string): number | null {
    return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

/** Page numbers to show: first, last, and the current page with one neighbour each side, with ellipses between gaps. */
export function pageWindow(current: number, total: number): Array<number | '…'> {
    const wanted = new Set([1, total, current - 1, current, current + 1].filter((n) => n >= 1 && n <= total));
    const sorted = [...wanted].sort((a, b) => a - b);
    const result: Array<number | '…'> = [];
    sorted.forEach((n, i) => {
        if (i > 0 && n - sorted[i - 1] > 1) result.push('…');
        result.push(n);
    });
    return result;
}
