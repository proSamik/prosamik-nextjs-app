// Subtle, attributed promotion for Subclip and Rankizz inside blog posts.
//
// Authors write plain markdown links with a product scheme, e.g.
//   [Subclip](subclip:inline-recording)        -> https://www.subclip.app/?utm_...&utm_content=inline-recording
//   [Rankizz](rankizz:inline-keywords/pricing) -> https://www.rankizz.com/pricing?utm_...
// The same resolver runs for the HTML page and for the markdown twin that agents read, so the
// attribution and the wording are identical in both.

export type PromoProduct = 'subclip' | 'rankizz';

export const PROMO_PRODUCTS: Record<PromoProduct, { name: string; origin: string; what: string }> = {
    subclip: {
        name: 'Subclip',
        origin: 'https://www.subclip.app',
        what: 'screen recorder, live streaming and AI video editor with an MCP server',
    },
    rankizz: {
        name: 'Rankizz',
        origin: 'https://www.rankizz.com',
        what: 'SEO and AI-search visibility workspace with a REST API and MCP server',
    },
};

export const UTM_SOURCE = 'prosamik.com';
export const UTM_MEDIUM = 'blog';

export function utmUrl(product: PromoProduct, slug: string, placement: string, path = '/'): string {
    const url = new URL(path, PROMO_PRODUCTS[product].origin);
    url.searchParams.set('utm_source', UTM_SOURCE);
    url.searchParams.set('utm_medium', UTM_MEDIUM);
    url.searchParams.set('utm_campaign', slug);
    url.searchParams.set('utm_content', placement);
    return url.toString();
}

const PROMO_LINK = /\]\((subclip|rankizz):([a-z0-9-]+)(\/[^)\s]*)?\)/g;

/** Replaces `(subclip:placement)` / `(rankizz:placement/path)` link targets with UTM-tagged URLs. */
export function resolvePromoLinks(markdown: string, slug: string): string {
    return markdown.replace(PROMO_LINK, (_m, product: PromoProduct, placement: string, path?: string) =>
        `](${utmUrl(product, slug, placement, path || '/')})`);
}

export interface PostPromo {
    product: PromoProduct;
    placement: string;
    /** One sentence tying the product to this post's topic. Written per post so it reads naturally. */
    blurb: string;
}

export const AUTHOR_DISCLOSURE =
    'Disclosure: the author builds Subclip and Rankizz, which are linked in this guide where they are relevant.';
