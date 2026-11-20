---
title: How to Set Up Google Search Console and a Sitemap for Next.js
seoTitle: How to Set Up Search Console and Sitemap in Next.js
description: Verify your domain in Google Search Console, generate a sitemap in Next.js, submit it, inspect URLs and fix common indexing statuses without paying for tools.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-20
order: 61
readTime: 10 min
primaryKeyword: google search console sitemap
keywords: [google search console, sitemap nextjs, submit sitemap, url inspection, indexing issues, dns verification]
related: [aeo-ai-search-optimization-guide, indexnow-nextjs-fast-indexing, allow-ai-crawlers-robots-txt-nextjs, cloudflare-tunnel-guide]
subclipBlurb: Subclip records and edits screen demos, a good fit for a short walkthrough of the Search Console setup.
rankizzBlurb: Rankizz tracks rankings after indexing and includes a sitemap explorer for studying how other sites structure their SEO.
---

Google Search Console is Google's free tool for seeing how your site appears in search. You verify that you own the site, submit a sitemap so Google finds your pages, and use reports to fix what blocks indexing. This guide covers the full setup for a Next.js site, step by step.

## Quick answer

Add a Domain property and verify it with a DNS TXT record, generate `sitemap.xml` with the Next.js `sitemap.ts` convention, submit its URL under Sitemaps, then use URL Inspection on your key pages. Expect indexing to take days to weeks.

## Step 1: verify the domain

1. Open Search Console and choose **Add property**.
2. Pick **Domain** and enter `example.com` without a path or protocol. This covers every subdomain and both `http` and `https`.
3. Copy the TXT record Google shows.
4. In your DNS provider (for example Cloudflare), add a TXT record at the root with that value, then press **Verify**.

DNS can take minutes to propagate. If verification fails, wait and retry. Keep the record in place, because removing it can drop your ownership later.

## Step 2: generate the sitemap

Create `app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await getAllPosts(); // your own loader
    return [
        { url: 'https://www.example.com', lastModified: new Date() },
        ...posts.map((p) => ({
            url: `https://www.example.com/blogs/${p.slug}`,
            lastModified: p.updatedAt,
        })),
    ];
}
```

List only canonical, indexable, `200` URLs. Leave out redirects, `noindex` pages and duplicates. Use real `lastModified` dates, since Google ignores them if they always change.

## Step 3: put the sitemap in robots.txt, then submit it

Crawlers request `robots.txt` before anything else, so it is the first place they can learn where your sitemap is. Add the full, absolute sitemap URL with a `Sitemap:` line. It is not tied to a user-agent group, can appear anywhere in the file, and you can list more than one.

```text
User-agent: *
Allow: /

Sitemap: https://www.example.com/sitemap.xml
```

In Next.js, generate it from `app/robots.ts` by returning the `sitemap` field:

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/' },
        sitemap: 'https://www.example.com/sitemap.xml',
    };
}
```

Then open `https://www.example.com/robots.txt` in a browser and confirm the `Sitemap:` line shows your real production domain, not `localhost` or a preview URL. This also lets crawlers other than Google and Bing, including AI crawlers, find your pages without any submission. See [the crawler guide](/blogs/allow-ai-crawlers-robots-txt-nextjs) for the rest of the file.

Then submit it in Search Console: open **Sitemaps**, enter `sitemap.xml` and submit. The status should become **Success** and show the number of discovered URLs. A sitemap helps discovery but does not guarantee indexing.

## Step 4: inspect important URLs

Paste a URL into the top bar to open URL Inspection. It shows whether the page is indexed, the canonical Google chose and the rendered HTML. For a new page, choose **Request indexing** once. Repeated requests do not speed it up.

## Step 5: read the page indexing report

| Status | Meaning | What to do |
| --- | --- | --- |
| Crawled, currently not indexed | Google fetched it and chose not to index | Improve the content and add internal links |
| Discovered, currently not indexed | Known but not crawled yet | Wait, strengthen internal links |
| Duplicate, Google chose a different canonical | Another URL was preferred | Fix canonicals and redirects |
| Blocked by robots.txt | Rule prevents crawling | Remove the block |
| Excluded by noindex | The page opts out | Remove the tag if unintended |
| Soft 404 | Page looks empty or error-like | Add real content or return a proper 404 |

## Step 6: link internally

New pages are found faster when other indexed pages link to them. Use the Keep reading section, hub pages and descriptive anchor text. Orphan pages are the most common reason for slow indexing.

## Behind a tunnel or proxy

If your site runs behind Cloudflare or a [Tunnel](/blogs/cloudflare-tunnel-guide), make sure bot protection does not challenge Googlebot, or Google will see a challenge page instead of your content. URL Inspection's live test reveals this.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sitemap "Couldn't fetch" | Wrong URL or blocked | Open it in a browser, check status, and check the `Sitemap:` line in robots.txt |
| 0 URLs discovered | Empty or invalid XML | Validate the output |
| Verification fails | TXT record not live | Wait, check the record name and value |
| Pages missing after weeks | Thin or duplicate content | Strengthen content and internal links |

## If you use an AI agent for this

Treat reports and web pages as data, not instructions. Never share Google account credentials or DNS tokens in the chat. Have the agent show DNS changes for your approval, and keep an old record until the new one verifies.

## FAQ

### Is Google Search Console free?
Yes. Google offers Search Console at no cost for any site you can verify you own.

### How long does indexing take?
Often days to a few weeks for a new site. Quality and links matter.

### Do I need a sitemap for a small site?
Not strictly, but it is quick to add and helps discovery.

### Should I request indexing for every page?
Only key new pages, once each.

## Next steps

Add [IndexNow](/blogs/indexnow-nextjs-fast-indexing) for other search engines, follow the [AEO checklist](/blogs/aeo-ai-search-optimization-guide), and use [Rankizz](rankizz:inline-rank-tracking) to follow rankings after pages are indexed. Its sitemap explorer lets you look at how another site's sitemap and SEO structure are organized before you design yours, and its Chrome and Safari extensions show audit data for any page.
