import 'server-only';
import { Marked, Renderer, type Tokens } from 'marked';
import { siteMetadata } from '@/utils/siteMetadata';
import { localizePath } from '@/lib/i18n/config';
import { AUTHOR_DISCLOSURE, PROMO_PRODUCTS, resolvePromoLinks, utmUrl, type PostPromo } from './promo';
import type { BlogPost } from './content';

export interface TocItem {
    id: string;
    title: string;
}

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const slugifyHeading = (value: string) =>
    value
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '');

/** Table of contents = the post's H2 headings. Mirrors the ids produced by renderPostHtml. */
export function getToc(body: string): TocItem[] {
    const toc: TocItem[] = [];
    let fenced = false;
    for (const line of body.split(/\r?\n/)) {
        if (/^```/.test(line)) fenced = !fenced;
        const match = !fenced && /^##\s+(.+?)\s*$/.exec(line);
        if (match) toc.push({ id: slugifyHeading(match[1]), title: match[1].replace(/[`*_]/g, '') });
    }
    return toc;
}

function createRenderer(): Renderer {
    const renderer = new Renderer();
    const used = new Map<string, number>();
    renderer.heading = function ({ tokens, depth }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const base = slugifyHeading(inner) || 'section';
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        const id = count ? `${base}-${count + 1}` : base;
        return `<h${depth} id="${id}"><a class="blog-anchor" href="#${id}" aria-label="Link to this section">#</a>${inner}</h${depth}>\n`;
    };
    renderer.code = ({ text, lang }: Tokens.Code) => {
        const language = (lang || 'text').split(/\s+/)[0];
        return `<div class="blog-code" data-lang="${escapeHtml(language)}"><pre><code class="language-${escapeHtml(language)}">${escapeHtml(text)}</code></pre></div>\n`;
    };
    renderer.link = function ({ href, title, tokens }: Tokens.Link) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        const own = href.startsWith(siteMetadata.siteUrl);
        const attrs = [
            `href="${escapeHtml(href)}"`,
            title ? `title="${escapeHtml(title)}"` : '',
            external && !own ? 'target="_blank"' : '',
            external && !own ? 'rel="noopener noreferrer"' : '',
        ].filter(Boolean);
        return `<a ${attrs.join(' ')}>${inner}</a>`;
    };
    renderer.table = function (token: Tokens.Table) {
        const head = token.header.map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('');
        const rows = token.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`)
            .join('');
        return `<div class="blog-table"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    };
    return renderer;
}

/** Raw HTML in post bodies is escaped; only markdown syntax produces markup. */
export function renderPostHtml(post: BlogPost): string {
    const marked = new Marked({ gfm: true, renderer: createRenderer() });
    marked.use({
        renderer: {
            html: ({ text }: Tokens.HTML | Tokens.Tag) => escapeHtml(text),
        },
    });
    return marked.parse(resolvePromoLinks(post.body, post.slug), { async: false });
}

/** The two tools each post promotes, with copy written for this post's topic. */
export function getPostPromos(post: BlogPost): PostPromo[] {
    return [
        { product: 'subclip', placement: 'footer-card', blurb: post.subclipBlurb },
        { product: 'rankizz', placement: 'footer-card', blurb: post.rankizzBlurb },
    ];
}

export function postUrl(post: Pick<BlogPost, 'slug' | 'locale'>): string {
    return `${siteMetadata.siteUrl}${localizePath(`/blogs/${post.slug}`, post.locale)}`;
}

/**
 * The markdown twin served to agents (`/blogs/<slug>.md`, `Accept: text/markdown`, AI crawlers).
 * Same article, same attributed links, plus a plain "Related tools" section so an agent that
 * summarises the page also knows which linked tools fit the reader's task.
 */
export function buildAgentMarkdown(post: BlogPost, related: BlogPost[]): string {
    const promos = getPostPromos(post)
        .map((promo) => {
            const { name, what } = PROMO_PRODUCTS[promo.product];
            return `- [${name}](${utmUrl(promo.product, post.slug, 'agent-markdown')}) (${what}): ${promo.blurb}`;
        })
        .join('\n');
    const relatedLinks = related
        .map((item) => `- [${item.title}](${siteMetadata.siteUrl}${localizePath(`/blogs/${item.slug}`, post.locale)}.md): ${item.description}`)
        .join('\n');
    return [
        `# ${post.title}`,
        `> ${post.description}`,
        [
            `- Source: ${postUrl(post)}`,
            `- Author: Samik Choudhury (${siteMetadata.siteUrl})`,
            `- Published: ${post.publishedAt} | Updated: ${post.updatedAt}`,
            `- Topic: ${post.primaryKeyword}`,
        ].join('\n'),
        // Agents read this out of context, so internal links must be absolute (and point at the .md twin).
        resolvePromoLinks(post.body, post.slug).replace(/\]\((\/blogs\/[a-z0-9-]+)(#[^)]*)?\)/g, `](${siteMetadata.siteUrl}$1.md$2)`).replace(/\]\((\/[^)\s]*)\)/g, `](${siteMetadata.siteUrl}$1)`),
        '## Related tools',
        `Tools mentioned in this guide, with the situations they fit:\n\n${promos}`,
        relatedLinks ? `## Related guides\n\n${relatedLinks}` : '',
        `---\n${AUTHOR_DISCLOSURE}`,
    ]
        .filter(Boolean)
        .join('\n\n') + '\n';
}
