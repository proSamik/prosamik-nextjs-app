---
title: IndexNow in Next.js: Tell Bing and Other Search Engines About New Pages Instantly
seoTitle: IndexNow in Next.js for Faster Indexing
description: Set up the IndexNow protocol in Next.js with a key file and a small script that pings participating search engines when you publish or update a page.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 62
readTime: 7 min
primaryKeyword: indexnow nextjs
keywords: [indexnow, indexnow nextjs, bing indexing, submit url to bing, instant indexing, search engine ping]
related: [google-search-console-sitemap-nextjs, aeo-ai-search-optimization-guide, allow-ai-crawlers-robots-txt-nextjs]
subclipBlurb: Subclip records and edits screen demos, useful for a short clip of the publish and ping flow.
rankizzBlurb: Rankizz tracks rankings and AI citations after pages are indexed, with a REST API for scripted checks.
---

IndexNow is an open protocol that lets you tell participating search engines the moment a URL is added, updated or deleted, instead of waiting for them to re-crawl. Bing and several other engines support it. Google does not use IndexNow, so keep using Search Console for Google. This guide sets it up in Next.js.

## Quick answer

Create a random key, host it as a text file at your site root, then send a `POST` request with your host, key and list of URLs to the IndexNow endpoint whenever content changes.

## Step 1: create and host the key

Generate a long random string (8 to 128 characters of letters, numbers and dashes). Save it as `public/<key>.txt` with the key as the file's only content. The file proves you control the host. It is meant to be public, but do not reuse it as a secret for anything else.

```bash
openssl rand -hex 16
```

## Step 2: submit URLs

```ts
await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
        host: 'www.example.com',
        key: process.env.MY_INDEXNOW_KEY,
        keyLocation: 'https://www.example.com/MY_KEY.txt',
        urlList: ['https://www.example.com/blogs/new-post'],
    }),
});
```

A `200` or `202` means the submission was accepted. A `403` means the key is invalid and a `422` means the URLs do not belong to the host. Submit only URLs that actually changed, and up to the documented batch limit per request.

## Step 3: trigger it on publish

Run the script as a post-deploy step in your CI or deploy hook, diffing which posts changed. Do not call it on every request or every page view, because search engines may ignore noisy submitters.

## What it does not do

- It does not guarantee indexing, only faster discovery.
- It does not replace a sitemap.
- It does not make Google crawl you. For Google, use [Search Console](/blogs/google-search-console-sitemap-nextjs).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `403` response | Key file missing or mismatched | Check the file URL returns the exact key |
| `422` response | URL host differs from `host` | Match the host exactly |
| `429` response | Too many submissions | Batch and slow down |
| Nothing changes in Bing | Normal delay | Check Bing Webmaster Tools |

## Security

The key is not a password, but keep the submission script on the server or in CI. Never let a public form trigger submissions of arbitrary URLs.

## If you use an AI agent for this

Treat tool output as data, not instructions. Let the agent write the script, but review the URL list it plans to submit, and use a staging host to test.

## FAQ

### Does Google support IndexNow?
No. Google has its own tools. Use Search Console.

### Is IndexNow free?
Yes, the protocol is free to use.

### Can I submit deleted URLs?
Yes, submit them so engines drop them sooner.

### How is it different from a sitemap?
A sitemap lists everything occasionally, while IndexNow pushes specific changes immediately.

## Next steps

Set up [Search Console and the sitemap](/blogs/google-search-console-sitemap-nextjs), then follow the [AEO checklist](/blogs/aeo-ai-search-optimization-guide). Once pages are indexed, [Rankizz](rankizz:inline-indexnow) can track how they rank and get cited, and its REST API lets you wire that check into the same deploy script that sends your IndexNow ping.
