import { siteMetadata } from '@/utils/siteMetadata';
import { localizePath } from '@/lib/i18n/config';
import type { BlogPost } from './content';
import { postUrl } from './render';
import { faqPlainText } from './faq';

const author = { '@type': 'Person', name: 'Samik Choudhury', url: siteMetadata.siteUrl };

/** BlogPosting + BreadcrumbList (+ FAQPage when the post has an FAQ section), as one JSON-LD graph. */
export function buildBlogJsonLd(post: BlogPost) {
    const url = postUrl(post);
    const graph: Record<string, unknown>[] = [
        {
            '@type': 'BlogPosting',
            '@id': `${url}#article`,
            headline: post.title,
            description: post.description,
            url,
            mainEntityOfPage: url,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            inLanguage: post.contentLocale,
            keywords: [post.primaryKeyword, ...post.keywords].join(', '),
            articleSection: post.category,
            isPartOf: { '@type': 'Blog', name: 'Blogs by Samik Choudhury', url: `${siteMetadata.siteUrl}${localizePath('/blogs', post.locale)}` },
            author,
            publisher: author,
            image: { '@type': 'ImageObject', url: `${url}/opengraph-image`, width: 1200, height: 630 },
        },
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteMetadata.siteUrl}${localizePath('/', post.locale)}` },
                { '@type': 'ListItem', position: 2, name: 'Blogs', item: `${siteMetadata.siteUrl}${localizePath('/blogs', post.locale)}` },
                { '@type': 'ListItem', position: 3, name: post.title, item: url },
            ],
        },
    ];
    if (post.faqs.length) {
        graph.push({
            '@type': 'FAQPage',
            mainEntity: post.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faqPlainText(faq.answer) },
            })),
        });
    }
    return { '@context': 'https://schema.org', '@graph': graph };
}
