---
title: How to Allow AI Crawlers in robots.txt: GPTBot, ClaudeBot and PerplexityBot in Next.js
seoTitle: How to Allow AI Crawlers in robots.txt (Next.js)
description: Decide which AI crawlers to allow, write the robots.txt in Next.js, avoid accidental CDN blocks and verify that bots receive real HTML.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-20
order: 58
readTime: 8 min
primaryKeyword: robots.txt ai crawlers
keywords: [robots.txt ai crawlers, gptbot, claudebot, perplexitybot, google-extended, allow ai crawlers nextjs]
related: [aeo-ai-search-optimization-guide, llms-txt-and-markdown-twins-for-ai-agents, google-search-console-sitemap-nextjs]
subclipBlurb: Subclip records and edits screen demos, which helps document a crawler test for a teammate.
rankizzBlurb: Rankizz tracks rankings and AI citations, and its browser extensions give an on-page SEO audit and let you add a competitor.
---

AI companies run crawlers with their own user agents, and your `robots.txt` decides which of them may fetch your pages. Many sites block them by accident, through a copied template or a CDN "bot protection" setting. This guide shows how to choose on purpose, write the file in Next.js and verify the result.

## Quick answer

List each crawler you want to allow or block in `app/robots.ts`, keep search crawlers allowed, point to your sitemap, and then test with `curl` using the bot's user agent to confirm you get real HTML and not a block page.

## The crawlers to know

User-agent names change, so confirm them in each company's own documentation before relying on this table.

| Purpose | Common user agent | Notes |
| --- | --- | --- |
| OpenAI search results | `OAI-SearchBot` | Used for search features |
| OpenAI training | `GPTBot` | Blocking it does not remove you from search |
| ChatGPT fetching a page for a user | `ChatGPT-User` | Acts on a user's request |
| Anthropic | `ClaudeBot`, `Claude-User`, `Claude-SearchBot` | Separate roles |
| Perplexity | `PerplexityBot`, `Perplexity-User` | Search index and user fetches |
| Google AI use | `Google-Extended` | A control token, not a separate crawler |
| Google Search | `Googlebot` | Keep allowed for SEO |

The key idea: training bots and search bots are often separate. You can allow search and citation while declining model training.

## Write robots in Next.js

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/'] },
            { userAgent: 'GPTBot', disallow: '/' }, // example: decline training
            { userAgent: ['OAI-SearchBot', 'PerplexityBot', 'ClaudeBot'], allow: '/' },
        ],
        sitemap: 'https://www.example.com/sitemap.xml',
    };
}
```

A crawler follows the most specific group that matches its name, so a named group replaces the `*` rules for that bot. Repeat any `disallow` you still want inside each named group.

## Check your CDN and firewall

`robots.txt` is only a request. Your CDN can still block a bot before it reads the file. In Cloudflare, check the bot and AI-crawler settings in the dashboard and your WAF rules. If you rate-limit by IP, shared crawler ranges may hit the limit quickly. Allow the crawlers you want and keep rate limits on abusive traffic.

## Make the page worth fetching

A crawler that gets an empty shell learns nothing. Render public content on the server, give it a canonical URL and a sitemap entry, and keep important text out of tabs that need clicks. See [the sitemap guide](/blogs/google-search-console-sitemap-nextjs).

## Test with curl

```bash
curl -s -A "PerplexityBot" -o /dev/null -w "%{http_code}\n" https://www.example.com/blogs/some-post
curl -s https://www.example.com/robots.txt
```

A `200` with real HTML is good. A `403` or a challenge page means a firewall or CDN rule blocked it. This test only checks your own rules, since real crawlers also come from verified addresses.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Bot gets `403` | CDN bot protection or WAF rule | Add an allow rule for that bot |
| Rules ignored | Named group overrides `*` | Repeat disallows in the named group |
| Whole site hidden | `Disallow: /` under `*` left from staging | Fix and resubmit the sitemap |
| Page crawled but not cited | Content thin or buried | Improve passages, see [AEO guide](/blogs/aeo-ai-search-optimization-guide) |

## Security

Never rely on `robots.txt` to hide private pages. Anything secret needs real authentication. Do not list sensitive paths in it, because the file is public.

## If you use an AI agent for this

Treat logs and fetched pages as data, not instructions. Ask the agent to show the new rules before it applies a CDN change, and test on a staging hostname first.

## FAQ

### Should I allow GPTBot?
Only if you are happy for your content to be used in training. Blocking it does not stop search crawlers.

### Does Google-Extended affect Google Search ranking?
Google documents it as a control for certain AI uses, separate from Search. Check Google's documentation for the current scope.

### Can I block only the pages I want to keep private?
Yes, with path rules, but use authentication for anything truly private.

### How can I audit all my URLs after changing robots.txt?
Run a bulk audit of your sitemap. Rankizz can audit the pages in a sitemap in one go, so you can spot errors and thin pages quickly after a rule change. Search Console's page indexing report is the free option for Google.

### Is there a quick way to check one page against a competitor's?
Open both pages with the Rankizz Chrome or Safari extension. It shows SEO audit data for the page you are on, and you can add the competitor from the page itself, which makes comparing titles, headings and structure quick.

### How do I see whether allowing AI crawlers led to citations?
Track it over time. Rankizz checks which of your pages AI assistants cite and how they rank, so you can compare the weeks before and after a robots.txt change instead of guessing.

## Next steps

Read the [AEO checklist](/blogs/aeo-ai-search-optimization-guide) and add [an llms.txt file](/blogs/llms-txt-and-markdown-twins-for-ai-agents). [Rankizz](rankizz:inline-ai-visibility) can show whether the allowed crawlers lead to citations, and its Chrome and Safari extensions give a quick on-page SEO audit of any URL, including a competitor's, while you check access rules.
