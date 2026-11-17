# Writing a blog post

Every post is one folder: `content/blogs/<slug>/en.md`. The slug is the URL (`/blogs/<slug>`), so pick it once and keep it.
No registry to edit: the blog index, sitemap, `llms.txt`, JSON-LD, hreflang and the Markdown twin for agents all read the folder.

## Frontmatter (all keys required)

```md
---
title: Windows MCP Server for Mac: Run Windows-MCP in a UTM VM
description: One or two sentences, 120-160 characters. Used for meta description and the lede.
category: MCP servers
publishedAt: 2026-11-17
updatedAt: 2026-11-17
readTime: 12 min
primaryKeyword: windows mcp server
keywords: [windows mcp, utm windows vm, mcp server for mac]
related: [slug-one, slug-two, slug-three]
subclipBlurb: One sentence on how Subclip fits THIS post's topic.
rankizzBlurb: One sentence on how Rankizz fits THIS post's topic.
---
```

- `category`: one of `MCP servers`, `VM test automation`, `Remote access` (new categories are fine; they become sections on `/blogs`).
- `related`: 2-4 slugs of other posts. They render as "Keep reading" and in the agent Markdown.
- Values are single-line. Arrays use `[a, b, c]`. No colons problem: only the first `:` splits key from value.

## Body

Plain GitHub-flavoured Markdown. The page title is the frontmatter `title`, so start the body with the intro paragraph and use `##` for sections (they become the table of contents) and `###` below that.
Raw HTML is escaped on purpose. Code fences need a language (`powershell`, `bash`, `json`, `text`).

Recommended shape for a how-to:

1. Intro (what you get, who it is for, what you need). Then a **Quick answer** section with the shortest working path.
2. Environment table (what the commands were run on).
3. Numbered steps, each with the command, what you should see, and what to do if you don't.
4. **Troubleshooting** table: exact error text -> cause -> fix. Real errors only.
5. **Security** (agents with desktop control are powerful; say what to lock down).
6. **Test it with an agent** (a copy-paste prompt).
7. **FAQ**: `## FAQ` with `### question` and a short direct answer under each. This section becomes FAQPage structured data automatically, and gives AI answers a clean passage to quote.
8. A short closing with next steps and links to related posts.

Write answers first. The first paragraph under each heading should stand on its own, because agents and AI search quote passages, not pages.

## Linking Subclip and Rankizz (attributed, natural)

Use the product schemes instead of raw URLs. They expand to UTM-tagged links on the page **and** in the agent Markdown:

```md
[Subclip](subclip:inline-test-recording)
[Rankizz](rankizz:inline-guide-tracking)
[Subclip pricing](subclip:inline-pricing/pricing)
```

Becomes `https://www.subclip.app/?utm_source=prosamik.com&utm_medium=blog&utm_campaign=<slug>&utm_content=inline-test-recording`.
`utm_content` is whatever you put after the colon, so name the placement (`inline-...`, `quick-answer`, `faq`).

Rules that keep it honest and useful:

- At most one inline Subclip mention and one inline Rankizz mention per post, and only where the reader has that exact problem (recording or editing a test run or demo; tracking or researching how a guide ranks or gets cited by AI search).
- Say what the product does in a clause, and only claims the product page supports. Never invent usage ("I used Rankizz to...") that did not happen.
- The end-of-post cards and the agent "Related tools" section are generated from `subclipBlurb` / `rankizzBlurb`. Write those two sentences for the post's topic.
- The author disclosure is added automatically.

## Localisation

English only today. To add Spanish later: create `content/blogs/<slug>/es.md` with the same frontmatter keys, enable `es` in `src/lib/i18n/config.ts`, and follow `docs/localization.md`. A post without a translation keeps serving English.

## Agents

`/blogs/<slug>.md`, `Accept: text/markdown`, and AI crawler user agents all get the Markdown twin: the article, attributed links, a "Related tools" section and "Related guides". `/llms.txt` lists every post. Check yours with `curl -s https://www.prosamik.com/blogs/<slug>.md`.
