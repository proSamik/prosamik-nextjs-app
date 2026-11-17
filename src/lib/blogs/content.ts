import 'server-only';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_LOCALE, ENABLED_LOCALES, isLocale, type Locale } from '@/lib/i18n/config';

// Posts live in content/blogs/<slug>/<locale>.md. English is required; other locales are optional
// and each post falls back to English when a translation does not exist yet.
const CONTENT_DIR = path.join(process.cwd(), 'content', 'blogs');

export interface BlogFaq {
    question: string;
    answer: string;
}

export interface BlogPost {
    slug: string;
    locale: Locale;
    /** Locale the body is actually written in (differs from `locale` when falling back to English). */
    contentLocale: Locale;
    title: string;
    description: string;
    category: string;
    publishedAt: string;
    updatedAt: string;
    readTime: string;
    primaryKeyword: string;
    keywords: string[];
    related: string[];
    subclipBlurb: string;
    rankizzBlurb: string;
    /** Raw markdown body. Promo links still use the `subclip:` / `rankizz:` scheme. */
    body: string;
    faqs: BlogFaq[];
}

function parseFrontmatter(source: string, file: string): { data: Record<string, string | string[]>; body: string } {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source);
    if (!match) throw new Error(`Missing frontmatter in ${file}`);
    const data: Record<string, string | string[]> = {};
    for (const line of match[1].split(/\r?\n/)) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const colon = line.indexOf(':');
        if (colon === -1) throw new Error(`Invalid frontmatter line "${line}" in ${file}`);
        const key = line.slice(0, colon).trim();
        const raw = line.slice(colon + 1).trim();
        const unquote = (value: string) => value.replace(/^(["'])(.*)\1$/, '$2');
        data[key] = raw.startsWith('[') && raw.endsWith(']')
            ? raw.slice(1, -1).split(',').map((item) => unquote(item.trim())).filter(Boolean)
            : unquote(raw);
    }
    return { data, body: match[2].trim() };
}

const text = (data: Record<string, string | string[]>, key: string, file: string): string => {
    const value = data[key];
    if (typeof value !== 'string' || !value) throw new Error(`Frontmatter "${key}" is required in ${file}`);
    return value;
};
const list = (data: Record<string, string | string[]>, key: string): string[] => {
    const value = data[key];
    return Array.isArray(value) ? value : value ? [value] : [];
};

/** Pulls `### question` + answer pairs out of the "## FAQ" section for schema.org FAQPage output. */
export function extractFaqs(body: string): BlogFaq[] {
    const lines = body.split(/\r?\n/);
    const start = lines.findIndex((line) => /^##\s+(?:FAQ|Frequently asked questions)\s*$/i.test(line));
    if (start === -1) return [];
    const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
    const section = lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
    const faqs: BlogFaq[] = [];
    for (const block of section.split(/^###\s+/m).slice(1)) {
        const [question, ...answer] = block.split(/\r?\n/);
        const answerText = answer.join('\n').trim();
        if (question.trim() && answerText) faqs.push({ question: question.trim(), answer: answerText });
    }
    return faqs;
}

export function getBlogSlugs(): string[] {
    if (!existsSync(CONTENT_DIR)) return [];
    return readdirSync(CONTENT_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(path.join(CONTENT_DIR, entry.name, `${DEFAULT_LOCALE}.md`)))
        .map((entry) => entry.name)
        .sort();
}

/** Locales that have a translated file for this post (and are enabled sitewide). */
export function getBlogLocales(slug: string): Locale[] {
    return ENABLED_LOCALES.filter((locale) => existsSync(path.join(CONTENT_DIR, slug, `${locale}.md`)));
}

export function getBlogPost(slug: string, locale: Locale = DEFAULT_LOCALE): BlogPost | null {
    if (!/^[a-z0-9-]+$/.test(slug)) return null;
    const contentLocale = isLocale(locale) && getBlogLocales(slug).includes(locale) ? locale : DEFAULT_LOCALE;
    const file = path.join(CONTENT_DIR, slug, `${contentLocale}.md`);
    if (!existsSync(file)) return null;
    const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
    return {
        slug,
        locale,
        contentLocale,
        title: text(data, 'title', file),
        description: text(data, 'description', file),
        category: text(data, 'category', file),
        publishedAt: text(data, 'publishedAt', file),
        updatedAt: text(data, 'updatedAt', file),
        readTime: text(data, 'readTime', file),
        primaryKeyword: text(data, 'primaryKeyword', file),
        keywords: list(data, 'keywords'),
        related: list(data, 'related'),
        subclipBlurb: text(data, 'subclipBlurb', file),
        rankizzBlurb: text(data, 'rankizzBlurb', file),
        body,
        faqs: extractFaqs(body),
    };
}

export function getAllBlogPosts(locale: Locale = DEFAULT_LOCALE): BlogPost[] {
    return getBlogSlugs()
        .map((slug) => getBlogPost(slug, locale))
        .filter((post): post is BlogPost => post !== null)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
}
