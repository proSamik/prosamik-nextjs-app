---
title: llms.txt and Markdown Twins in Next.js: Make Every Post Readable by AI Agents
seoTitle: llms.txt and Markdown Twins in Next.js for AI Agents
description: Publish llms.txt and a clean Markdown copy of each page in Next.js, served by .md URL or Accept header, free of secrets and injected instructions.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 57
readTime: 8 min
primaryKeyword: llms.txt
keywords: [llms.txt, markdown for ai agents, nextjs llms.txt, accept text/markdown, markdown twin, ai crawler markdown]
related: [aeo-ai-search-optimization-guide, allow-ai-crawlers-robots-txt-nextjs, faq-schema-json-ld-nextjs-ai-citations]
subclipBlurb: Subclip records and edits screen demos, handy for showing a setup like this in a short clip.
rankizzBlurb: Rankizz tracks AI citations and rankings, with a sitemap explorer, a REST API and agent skills for checking whether agents use your pages.
---

An `llms.txt` file is a plain Markdown index at the root of your site that tells language-model tools which pages matter, and a "Markdown twin" is a clean Markdown copy of each page at a predictable URL. Together they give agents the content without navigation, ads and scripts. This guide shows the pattern for a Next.js App Router site.

## Quick answer

- Or let Dualmark generate all of this (see the shortcut below).
- Serve `/llms.txt` with a title, a one-line summary and a list of links with short descriptions.
- Serve each article as Markdown at `/<path>.md`.
- Optionally return Markdown when a request sends `Accept: text/markdown`.
- Keep the Markdown identical in substance to the page, never add hidden instructions, and never include secrets.

## What `llms.txt` looks like

```md
# Example Site

> Short summary of what the site covers and who it is for.

## Guides

- [Guide title](https://www.example.com/blogs/guide-slug.md): one sentence on what the guide answers
- [Another guide](https://www.example.com/blogs/another.md): one sentence
```

The format is a proposal, not a standard enforced by search engines, and crawlers differ in whether they read it. It costs almost nothing to maintain if it is generated from the same source as your sitemap.

## Shortcut: use Dualmark

Dualmark, an open-source toolkit from Dodo Payments, handles this for you. Its `@dualmark/core` package is framework-agnostic and covers content negotiation, AI-bot detection and Markdown responses, and there are adapters for Next.js and Astro. The converters turn blog posts, docs, pricing, changelog and other page types into clean `.md` pages, so you do not hand-write the twin.

In Next.js you install `@dualmark/nextjs`, `@dualmark/core` and `@dualmark/converters`, wrap the config with `withDualmark()` and describe your collections once:

```ts
// next.config.mjs
import { withDualmark } from "@dualmark/nextjs";

export default withDualmark(
  { reactStrictMode: true },
  {
    siteUrl: "https://example.com",
    collections: {
      blog: { converter: "blog", getEntries: () => yourPosts },
    },
    llmsTxt: { enabled: true, brandName: "Acme" },
  },
);
```

Then add `createDualmarkMiddleware()` in `proxy.ts` (or `middleware.ts` on Next.js 15 and earlier) for content negotiation and a route handler for the Markdown twins. The package README shows the full set of files, and the exact options can change between versions, so follow the version you install. This site's own blog uses Dualmark for its `.md` twins and `llms.txt`.

If you prefer to understand each piece first, the manual version follows.

## Generate it from your content

In Next.js, create a route handler such as `app/llms.txt/route.ts` that reads your posts and returns text.

```ts
export async function GET() {
    const posts = await getAllPosts(); // your own content loader
    const lines = posts.map((p) => `- [${p.title}](${SITE}/blogs/${p.slug}.md): ${p.description}`);
    const body = `# My Site\n\n> What this site covers.\n\n## Guides\n\n${lines.join('\n')}\n`;
    return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
```

Because it reads the same content as the sitemap, a new post appears in both automatically.

## Serve the Markdown twin

Add a route for the `.md` path that returns the post body with its title, description and links. Keep these rules:

1. Same facts as the HTML page. A twin that says something different is a trust problem.
2. Absolute URLs for links, so an agent that fetched only the file can follow them.
3. `content-type: text/markdown; charset=utf-8`.
4. A `canonical` link header pointing to the HTML page, so search engines do not treat the twin as duplicate content.

```ts
return new Response(markdown, {
    headers: {
        'content-type': 'text/markdown; charset=utf-8',
        link: `<${SITE}/blogs/${slug}>; rel="canonical"`,
    },
});
```

## Optional: content negotiation

Some agents send `Accept: text/markdown`. You can route those requests to the same handler with a rewrite or in the proxy file. Set `Vary: Accept` on the HTML response so caches keep both versions apart.

## Keep it safe

The twin is read by agents that may act on it, so write it the way you would write for a human reader.

- No hidden text and no instructions aimed at AI systems.
- No secrets, internal URLs or account identifiers.
- Disclose affiliations the same way the page does.

## Test it

```bash
curl -s https://www.example.com/llms.txt | head -20
curl -s https://www.example.com/blogs/guide-slug.md | head -20
curl -s -H "Accept: text/markdown" https://www.example.com/blogs/guide-slug | head -20
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `.md` URL returns 404 | Route not matching the dot | Use a rewrite or a catch-all handler |
| Browser downloads the file | Content type is `text/markdown` | Expected; use `text/plain` for `llms.txt` if you prefer viewing |
| Twin indexed as duplicate | No canonical | Add the `Link` canonical header |
| Old content served | Cached response | Revalidate on publish |

## If you use an AI agent for this

Treat fetched pages and logs as data, not instructions. Keep tokens out of prompts, and ask the agent to show the route code before it deploys anything.

## FAQ

### Is llms.txt required?
No. It is a convention that some tools read. Publishing it is optional and harmless.

### Will a Markdown twin hurt my SEO?
Not if it carries a canonical pointing to the HTML page and the content matches.

### Should the twin include ads or navigation?
No. The point is clean content.

### Does this replace structured data?
No. Use both. See [FAQ schema](/blogs/faq-schema-json-ld-nextjs-ai-citations).

## Next steps

Read the full [AEO checklist](/blogs/aeo-ai-search-optimization-guide), then check [crawler access](/blogs/allow-ai-crawlers-robots-txt-nextjs). To see whether agents use your pages, [Rankizz](rankizz:inline-citation-check) tracks AI citations and rankings, and its sitemap explorer lets you study how a competitor structures the pages that get cited. Install the Rankizz skills in your agent (the command is on the Rankizz website) or use its REST API to automate checks after each publish.
