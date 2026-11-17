import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getAllBlogPosts } from '@/lib/blogs/content';
import { DEFAULT_LOCALE, languageAlternates, localizePath } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

export const metadata: Metadata = {
    title: 'Blogs — Samik Choudhury',
    description: 'Hands-on guides from Samik: MCP servers for Windows, Linux and macOS, VM test automation, SSH, RDP and VNC, with the exact commands and the errors I hit.',
    alternates: {
        canonical: '/blogs',
        languages: languageAlternates('/blogs', [DEFAULT_LOCALE], siteMetadata.siteUrl),
        types: { 'text/markdown': '/blogs.md' },
    },
};

export default function BlogsPage() {
    const posts = getAllBlogPosts(DEFAULT_LOCALE);
    const categories = Array.from(new Set(posts.map((post) => post.category)));
    const list = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: post.title,
            url: `${siteMetadata.siteUrl}${localizePath(`/blogs/${post.slug}`, post.locale)}`,
        })),
    };
    return (
        <div className="portfolio-page page-width blog-index">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} />
            <header className="page-heading">
                <h1>Notes from<br />my experiments.</h1>
                <p>Guides with the real commands,<br />and the errors I hit on the way.</p>
            </header>
            {categories.map((category) => (
                <section key={category} className="blog-group" aria-labelledby={`cat-${category.toLowerCase().replace(/\W+/g, '-')}`}>
                    <h2 id={`cat-${category.toLowerCase().replace(/\W+/g, '-')}`}>{category}</h2>
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
        </div>
    );
}
