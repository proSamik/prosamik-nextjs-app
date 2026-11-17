# Localization

English is the only enabled language today. The foundation is in place so a language can be switched on without reworking the blog.

## What already exists

- `src/lib/i18n/config.ts`: `DEFAULT_LOCALE`, `ENABLED_LOCALES`, reserved locale codes, `localizePath`, `splitLocalePath`, `languageAlternates` (hreflang).
- Blog content is per locale: `content/blogs/<slug>/<locale>.md`. A post with no translation serves its English file.
- `src/proxy.ts` routes `/<locale>/...` to the unprefixed route and sets `x-prosamik-locale` once a locale is enabled. Disabled locale prefixes are left alone.
- Sitemap and page metadata emit `alternates.languages` only for locales that have the page.
- Agent Markdown (`/blogs/<slug>.md`) and `/llms.txt` serve English; per-locale twins follow the same file layout.

## Turning a language on (example: Spanish)

1. Add `content/blogs/<slug>/es.md` for each translated post (same frontmatter keys; translate `title`, `description`, `subclipBlurb`, `rankizzBlurb`, body; keep slugs and `related` the same).
2. Add `'es'` to `ENABLED_LOCALES` in `src/lib/i18n/config.ts`.
3. Make the routes locale-aware. Subclip does this by moving its pages under a `[siteLocale]` segment that the proxy rewrites into. For this site:
   - Move `src/app/**` page routes under `src/app/[locale]/` (home, `/about`, `/projects`, `/blogs`, `/consistency`, `/milestone`, `/t`), keeping `api`, `md`, `llms.txt`, `sitemap`, and `.well-known` at the top level.
   - Add `generateStaticParams` returning `ENABLED_LOCALES` and pass `params.locale` into `getBlogPost(slug, locale)`.
   - Set `<html lang>` from the locale in the root layout (read it from `params`, not from headers, to keep pages static).
   - Translate page copy (home, about, navigation, footer) into a per-locale dictionary.
4. Update `src/proxy.ts` matcher so `/<locale>/blogs/...` also reaches the markdown negotiation.

Step 3 is the real work; steps 1, 2 and 4 are small.
