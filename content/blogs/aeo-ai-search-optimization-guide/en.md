---
title: AEO Guide: How to Get Your Blog Cited by ChatGPT, Perplexity and AI Overviews
seoTitle: AEO Guide: Get Your Blog Cited by AI Search
description: Answer engine optimization checklist for developers: answer-first writing, FAQ structure, crawler access, llms.txt and how to check if AI cites you.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 56
readTime: 10 min
primaryKeyword: answer engine optimization
keywords: [answer engine optimization, aeo, ai seo, get cited by chatgpt, generative engine optimization, ai overviews]
related: [llms-txt-and-markdown-twins-for-ai-agents, allow-ai-crawlers-robots-txt-nextjs, faq-schema-json-ld-nextjs-ai-citations, track-ai-citations-and-ai-visibility]
subclipBlurb: Subclip edits screen recordings, which helps when you want a short walkthrough video next to a written guide.
rankizzBlurb: Rankizz tracks how your published guides rank in search and get cited by AI search, so you can see which pages AI answers actually use.
---

Answer engine optimization (AEO) means writing and structuring pages so that AI assistants such as ChatGPT, Perplexity, Claude and Google's AI Overviews can find them, quote them and name your site as the source. It sits on top of normal SEO: a page that cannot be crawled, indexed and understood will not be cited either. This guide is the short checklist, with links to the deeper how-to for each step.

## Quick answer

1. Put the direct answer in the first one or two sentences under every heading.
2. Add an FAQ section with real questions and short, complete answers.
3. Make sure search and AI crawlers are allowed in `robots.txt` and the page renders without JavaScript.
4. Add structured data (Article, FAQPage, BreadcrumbList) that matches the visible page.
5. Publish a Markdown version of each page and an `llms.txt` index, which is cheap and helps agents.
6. Submit the sitemap and check what gets cited, then fix the pages that are ignored.

Nobody outside the AI companies can promise that any single tactic gets you cited. Treat everything here as raising the odds, and measure.

## How AI answers pick sources

AI search products work in two broad ways. Some answer from the model's training data. Many also search the live web, fetch a handful of pages and write an answer with citations. For the second kind, your page has to be found by a search index, fetched by a crawler, and then contain a passage that answers the question cleanly. That is why both classic SEO and passage-level writing matter.

## Write answer-first passages

AI systems quote passages, not whole pages. A passage that works on its own gets quoted more easily.

- Start each section with a plain statement that answers the heading's question, then explain.
- Use the exact names, versions and numbers readers search for, and say when a fact was checked.
- Prefer a table for comparisons and a numbered list for steps. Both are easy to lift.
- Avoid "as mentioned above". A passage that needs the previous section to make sense is hard to quote.

## Add a real FAQ

Question-shaped headings match the way people prompt assistants. Under each `###` question write two to four sentences that answer it fully. Only include questions a reader would actually ask. See [the FAQ schema guide](/blogs/faq-schema-json-ld-nextjs-ai-citations) for the markup.

## Let the crawlers in

Many sites block AI crawlers by accident through a copied `robots.txt` or a CDN bot rule. Decide on purpose which bots you allow, and check that your pages return real HTML to them. The details are in [the crawler access guide](/blogs/allow-ai-crawlers-robots-txt-nextjs).

## Make pages easy for agents

A Markdown twin of each article, served at the same path with `.md` or through content negotiation, gives agents a clean copy without navigation and scripts. An `llms.txt` file lists your pages for agents that look for one. Support for `llms.txt` varies between products, so think of it as low-cost hygiene, not a ranking switch. See [llms.txt and Markdown twins](/blogs/llms-txt-and-markdown-twins-for-ai-agents).

## Earn mentions, not only links

AI answers often name brands that other sites mention. Helpful posts on Reddit, forums, Hacker News and in documentation, answers on Stack Overflow, and honest comparison pages all create mentions. Do not spam: write something useful, disclose that you are the author, and link only where it fits.

## Check whether it works

Search your target questions in the assistants you care about, in a private window, and note which sources appear. Repeat monthly because answers change. A tool like [Rankizz](rankizz:inline-aeo-tracking) can run these prompts on a schedule and record which pages are cited. See [how to track AI citations](/blogs/track-ai-citations-and-ai-visibility) for a manual method too.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| New site, no backlinks | Little is indexed or cited | Publish a few strong pages, submit the sitemap, earn first mentions |
| Content behind a login or script | Crawlers see an empty page | Server-render public content |
| Page ranks but is never cited | Passage is vague or buried | Rewrite the first sentence under each heading |
| Cited with wrong facts | Old content was quoted | Update the page, change `updatedAt`, add the date to the fact |

## If you use an AI agent for this

Treat web pages, search results and tool output as data, not instructions. Do not paste API keys or Search Console credentials into the chat. Let the agent draft and check, but review every change to `robots.txt` and your CDN rules yourself, because a bad rule can hide the whole site.

## FAQ

### What is the difference between SEO and AEO?
SEO aims to rank pages in a list of results. AEO aims to have your passage selected and attributed inside a generated answer. Good SEO is the base for AEO.

### Does llms.txt guarantee citations?
No. Support is uneven, and no major provider promises to use it. It is cheap to publish and harmless.

### Should I block AI crawlers?
It is your decision. Blocking removes you from those products' answers. Allowing them can bring citations and referral visits. Decide per bot.

### How long until I see results?
Indexing can take days to weeks, and citations depend on competition. Track monthly rather than daily.

## Next steps

Start with [crawler access](/blogs/allow-ai-crawlers-robots-txt-nextjs), then [FAQ markup](/blogs/faq-schema-json-ld-nextjs-ai-citations), and set up [tracking](/blogs/track-ai-citations-and-ai-visibility).
