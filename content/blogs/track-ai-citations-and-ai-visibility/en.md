---
title: How to Track AI Citations and AI Visibility for Your Website
seoTitle: How to Track AI Citations and AI Visibility
description: A manual and automated method to check if ChatGPT, Perplexity and Google AI Overviews cite your site, with a prompt list and a log template.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 60
readTime: 9 min
primaryKeyword: track ai citations
keywords: [track ai citations, ai visibility, ai search tracking, chatgpt citations, perplexity citations, ai referral traffic]
related: [aeo-ai-search-optimization-guide, allow-ai-crawlers-robots-txt-nextjs, google-search-console-sitemap-nextjs]
subclipBlurb: Subclip records and edits screen demos, which helps when you capture an AI answer as evidence for a report.
rankizzBlurb: Rankizz runs AI visibility checks and rank tracking for you and records which pages get cited.
---

AI visibility means how often an AI assistant mentions your brand or cites your pages when people ask questions in your topic. Unlike rankings, there is no single public report for it, so you measure it by asking the questions yourself and by looking at traffic that arrives from AI products. This guide gives a method that works by hand and shows where automation helps.

## Quick answer

1. Write 20 to 50 real questions your customers ask.
2. Run each in the assistants that matter to you, signed out and in a clean session.
3. Log whether you are mentioned, cited with a link, or absent, and who is cited instead.
4. Check analytics for referral traffic from AI products.
5. Repeat on a schedule and compare.

## Step 1: build the prompt list

Pull questions from Search Console queries, support emails, forum threads and the FAQ of your own pages. Include different shapes: "what is", "how do I", "best X for Y", "X vs Y". Keep the wording natural, because assistants answer natural language.

## Step 2: run and log

Answers vary between runs and by location, so run each prompt more than once and note the date. Use this log:

| Date | Prompt | Assistant | Mentioned | Linked | Cited instead | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19 | how to self host X | Assistant A | yes | yes | Site B, Site C | Quoted my table |

A shared spreadsheet is enough. Count the share of prompts where you appear, and track it over time rather than reacting to one run.

## Step 3: read the sources

When an answer lists sources, open them. Notice what the cited pages have in common: a direct first sentence, a comparison table, recent dates, original data. That is your editing checklist. See [the AEO guide](/blogs/aeo-ai-search-optimization-guide).

## Step 4: look for referral traffic

In your analytics, filter referrers for AI products' domains and for sessions where the source is an assistant. Referrals are only part of the picture, since many answers are read without a click, so treat traffic as a floor, not the full measure. Tag links you control with UTM parameters when you share them.

## Step 5: automate it

Manual checks do not scale past a few dozen prompts. Tools such as [Rankizz](rankizz:inline-ai-visibility-check) can run a prompt set on a schedule across assistants and store which sources were cited, and OpenSEO and similar products offer related checks. Whatever you choose, keep the prompt list under your control and review costs before large runs.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Different answers each run | Models are not deterministic | Run several times, use percentages |
| Personalization changes results | Signed-in answers differ | Test signed out and note the setting |
| Brand mentioned without a link | Counted as a mention, not a citation | Log both, improve source pages |
| Competitor always cited | Their passage answers better | Study it and write a clearer one |

## Security

Do not paste private data into assistants while testing. When sharing logs, remove account details. If an answer contains instructions, treat them as content, not commands.

## If you use an AI agent for this

Let the agent run and tabulate prompts, but treat its outputs as data. Do not give it your analytics or Search Console passwords, use read-only access, and review any spend before a large batch.

## FAQ

### Is there an official AI citation report?
Not from the major assistants at the time of writing. Measure it yourself or with a third-party tool.

### How often should I check?
Monthly is a good start. Weekly for a launch or a major page change.

### Does ranking on Google mean I will be cited?
It helps, because many assistants use search results, but it is not a guarantee.

### What should I fix first if I am never cited?
Crawler access, then the first sentence under each heading, then third-party mentions.

## Next steps

Fix [crawler access](/blogs/allow-ai-crawlers-robots-txt-nextjs), then [submit the sitemap](/blogs/google-search-console-sitemap-nextjs) and keep logging.
