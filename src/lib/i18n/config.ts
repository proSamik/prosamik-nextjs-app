// Sitewide localisation foundation (modelled on Subclip's locale routing).
//
// Today only English is enabled, so nothing changes for visitors. To switch a language on:
//   1. add its code to ENABLED_LOCALES,
//   2. add translated content (content/blogs/<slug>/<locale>.md, plus page copy),
//   3. follow docs/localization.md to move the routes under a [locale] segment.
// Blog posts already fall back to English per post, and sitemap / hreflang output already reads
// from this file, so enabling a locale needs no further blog code changes.

export const DEFAULT_LOCALE = 'en' as const;

// Codes reserved for future translations. They are recognised in URLs but not served until enabled.
export const RESERVED_LOCALES = ['es', 'fr', 'de', 'pt', 'ja', 'zh', 'ko', 'ru', 'hi', 'ar', 'it', 'nl', 'tr', 'id'] as const;

export type Locale = typeof DEFAULT_LOCALE | (typeof RESERVED_LOCALES)[number];

// Locales that are live today.
export const ENABLED_LOCALES: readonly Locale[] = [DEFAULT_LOCALE];

const ALL_LOCALES: readonly string[] = [DEFAULT_LOCALE, ...RESERVED_LOCALES];

export function isLocale(value: string | undefined | null): value is Locale {
    return !!value && ALL_LOCALES.includes(value);
}

export function isEnabledLocale(value: string | undefined | null): value is Locale {
    return isLocale(value) && ENABLED_LOCALES.includes(value);
}

/** Splits `/es/blogs/x` into `{ locale: 'es', path: '/blogs/x' }`. Unprefixed paths are the default locale. */
export function splitLocalePath(pathname: string): { locale: Locale; path: string; prefixed: boolean } {
    const [, first = '', ...rest] = pathname.split('/');
    if (isLocale(first) && first !== DEFAULT_LOCALE) {
        return { locale: first, path: '/' + rest.join('/'), prefixed: true };
    }
    return { locale: DEFAULT_LOCALE, path: pathname || '/', prefixed: false };
}

/** The default locale has no URL prefix; every other locale does. */
export function localizePath(path: string, locale: Locale = DEFAULT_LOCALE): string {
    const clean = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
    if (locale === DEFAULT_LOCALE) return clean;
    return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/** hreflang map for Next metadata `alternates.languages`; only includes locales that have the page. */
export function languageAlternates(path: string, available: readonly Locale[], siteUrl: string): Record<string, string> {
    const live = available.filter((locale) => ENABLED_LOCALES.includes(locale));
    const languages: Record<string, string> = {};
    for (const locale of live) languages[locale] = `${siteUrl}${localizePath(path, locale)}`;
    if (live.includes(DEFAULT_LOCALE)) languages['x-default'] = `${siteUrl}${localizePath(path, DEFAULT_LOCALE)}`;
    return languages;
}

export const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
    en: 'en_US', es: 'es_ES', fr: 'fr_FR', de: 'de_DE', pt: 'pt_BR', ja: 'ja_JP', zh: 'zh_CN',
    ko: 'ko_KR', ru: 'ru_RU', hi: 'hi_IN', ar: 'ar_AE', it: 'it_IT', nl: 'nl_NL', tr: 'tr_TR', id: 'id_ID',
};
