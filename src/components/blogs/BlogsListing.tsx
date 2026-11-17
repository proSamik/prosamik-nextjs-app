import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import BlogsBrowser from '@/components/blogs/BlogsBrowser';
import BlogsIndexMotion from '@/components/blogs/BlogsIndexMotion';
import Pagination from '@/components/blogs/Pagination';
import { getAllBlogPosts } from '@/lib/blogs/content';
import { buildTags, type BlogListItem } from '@/lib/blogs/filter';
import { BLOGS_PER_PAGE, pageHref, paginate, totalPages } from '@/lib/blogs/pagination';
import { DEFAULT_LOCALE, localizePath } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

const slugify = (value: string) => value.toLowerCase().replace(/\W+/g, '-');

/** The /blogs index for one page of results. Page 1 is /blogs, later pages are /blogs/page/<n>. */
export default function BlogsListing({ page }: { page: number }) {
    const all = getAllBlogPosts(DEFAULT_LOCALE);
    const pages = totalPages(all.length);
    const posts = paginate(all, page);
    const categories = Array.from(new Set(posts.map((post) => post.category)));
    const offset = (page - 1) * BLOGS_PER_PAGE;
    // Light copy of every post (all pages) for the client-side search and topic badges.
    const items: BlogListItem[] = all.map((post) => ({
        slug: post.slug, href: localizePath(`/blogs/${post.slug}`, post.locale), title: post.title, description: post.description,
        category: post.category, readTime: post.readTime, keywords: [post.primaryKeyword, ...post.keywords],
    }));
    const tags = buildTags(items);
    const newestUpdate = all.map((post) => post.updatedAt).sort().at(-1);
    const list = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: page > 1 ? `Blogs by Samik Choudhury, page ${page}` : 'Blogs by Samik Choudhury',
        url: `${siteMetadata.siteUrl}${pageHref(page)}`,
        dateModified: newestUpdate,
        isPartOf: { '@type': 'Blog', name: 'Blogs by Samik Choudhury', url: `${siteMetadata.siteUrl}/blogs` },
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: posts.map((post, index) => ({
                '@type': 'ListItem',
                position: offset + index + 1,
                name: post.title,
                url: `${siteMetadata.siteUrl}${localizePath(`/blogs/${post.slug}`, post.locale)}`,
            })),
        },
    };
    return (
        <div className="portfolio-page page-width blog-index" data-blogs-root>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} />
            <header className="page-heading blog-index-head" data-blogs-head>
                <h1>Notes from<br />my experiments.</h1>
                <p>Guides with the real commands,<br />and the errors I hit on the way.{pages > 1 && <span className="blog-page-note">Page {page} of {pages}</span>}</p>
            </header>
            <div className="blog-index-body" data-blogs-body>
                <BlogsBrowser items={items} tags={tags}>
                    {categories.map((category) => (
                        <section key={category} className="blog-group" aria-labelledby={`cat-${slugify(category)}`}>
                            <h2 id={`cat-${slugify(category)}`}>{category}</h2>
                            <ul>
                                {posts.filter((post) => post.category === category).map((post) => (
                                    <li key={post.slug}>
                                        <Link href={localizePath(`/blogs/${post.slug}`, post.locale)}>
                                            <span className="blog-row-title">{post.title}<ArrowUpRight size={20} /></span>
                                            <span className="blog-row-desc">{post.description}</span>
                                            <span className="blog-row-meta">{post.readTime} read</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                    <Pagination current={page} total={pages} />
                </BlogsBrowser>
            </div>
            <BlogsIndexMotion />
        </div>
    );
}
