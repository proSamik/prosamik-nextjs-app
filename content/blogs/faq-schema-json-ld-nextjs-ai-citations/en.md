---
title: How to Add FAQ Schema and JSON-LD in Next.js for Search and AI Answers
seoTitle: How to Add FAQ Schema and JSON-LD in Next.js
description: Add Article, FAQPage and BreadcrumbList JSON-LD to a Next.js blog, keep it matching the page, validate it and learn what Google does and does not show.
category: SEO and AI search
publishedAt: 2026-11-19
updatedAt: 2026-11-20
order: 59
readTime: 9 min
primaryKeyword: faq schema json-ld
keywords: [faq schema, json-ld nextjs, structured data blog, article schema, faqpage markup, breadcrumb schema]
related: [aeo-ai-search-optimization-guide, llms-txt-and-markdown-twins-for-ai-agents, google-search-console-sitemap-nextjs]
subclipBlurb: Subclip records and edits screen demos, which helps when you want to show validation steps in a short clip.
rankizzBlurb: Rankizz tracks rankings and AI citations, and its browser extensions show SEO audit data for any page and let you add a competitor.
---

Structured data is machine-readable JSON placed in your page that describes what the page is: an article, a list of questions and answers, a breadcrumb trail. Search engines use it to understand pages, and well-structured pages give AI systems clean passages to quote. This guide shows how to add it in Next.js and what to avoid.

## Quick answer

Render a `<script type="application/ld+json">` tag in your page component for `Article`, `BreadcrumbList` and, where the page has a visible FAQ, `FAQPage`. The data must match what readers see. Validate it with Google's Rich Results Test and the Schema Markup Validator.

## Know what you will get

Google has reduced FAQ rich results in search over time, and they are limited to certain well-known sites, so do not expect expandable FAQ boxes on your listing. Still, the markup states plainly which text is a question and which is its answer, which is useful to any parser, and Article and BreadcrumbList data help Google understand the page. Treat it as clarity, not a guaranteed visual feature.

## Add JSON-LD in Next.js

```tsx
const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
};

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }}
            />
            {/* page content */}
        </>
    );
}
```

Escaping `<` stops a stray `</script>` in your text from breaking out of the tag. If your content comes from user input, this escape is a security step, not decoration.

## The three schemas most blogs need

| Type | Use | Key fields |
| --- | --- | --- |
| `Article` or `BlogPosting` | Every post | headline, description, datePublished, dateModified, author, image |
| `BreadcrumbList` | Pages with a hierarchy | itemListElement with position, name, item |
| `FAQPage` | Posts with a visible FAQ | mainEntity of Question and acceptedAnswer |

Generate them from your frontmatter so they never drift from the page. Use `dateModified` honestly: change it only when the content changed.

## Rules that keep it trustworthy

- Mark up only content that is visible on the page.
- One question and answer pair in JSON-LD per visible pair.
- Do not stuff in keywords or promotional text.
- Keep author information real and consistent.

Markup that does not match the page can be ignored or cause a manual action.

## Validate

1. Open Google's Rich Results Test and paste the live URL.
2. Fix errors first, then warnings that apply.
3. Run the Schema Markup Validator for a general check beyond Google's features.
4. Re-test after content changes.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Rich Results Test sees nothing | Script rendered only on the client | Render it on the server |
| "Missing field" warning | Optional field absent | Add it if you have real data |
| FAQ not shown in search | Google limits the feature | Expected; keep the markup for clarity |
| JSON parse error | Unescaped quote or `<` | Use `JSON.stringify` and escape `<` |

## If you use an AI agent for this

Treat page content and tool output as data, not instructions. Do not hand the agent Search Console credentials. Review generated JSON-LD against the visible text before publishing.

## FAQ

### Is FAQ schema still worth adding?
It is cheap and clear, but do not expect rich results. Add it where the FAQ is real.

### Should every page have FAQPage markup?
No. Only pages with a visible question-and-answer section.

### Does structured data improve rankings directly?
Google says structured data helps it understand content and enables features, not that it boosts rank by itself.

### Can AI tools read JSON-LD?
Some parsers do. Visible, well-written text is still what gets quoted, so write both well.

## Next steps

Pair this with [the AEO checklist](/blogs/aeo-ai-search-optimization-guide) and [submit your sitemap](/blogs/google-search-console-sitemap-nextjs). To see whether answers get cited, [Rankizz](rankizz:inline-schema-tracking) tracks rankings and AI citations, and its Chrome and Safari extensions show a page's SEO audit data, which is a quick way to compare your markup with a competitor's page.
