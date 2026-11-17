import type { Metadata } from 'next';
import BlogsListing from '@/components/blogs/BlogsListing';
import { getAllBlogPosts } from '@/lib/blogs/content';
import { pageHref, totalPages } from '@/lib/blogs/pagination';
import { DEFAULT_LOCALE, languageAlternates } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

export function generateMetadata(): Metadata {
    const pages = totalPages(getAllBlogPosts(DEFAULT_LOCALE).length);
    return {
        title: 'Blogs — Samik Choudhury',
        description: 'Hands-on guides from Samik: MCP servers for Windows, Linux and macOS, VM test automation, SSH, RDP and VNC, and deploying Next.js on Coolify, with the exact commands and the errors I hit.',
        alternates: {
            canonical: '/blogs',
            languages: languageAlternates('/blogs', [DEFAULT_LOCALE], siteMetadata.siteUrl),
            types: { 'text/markdown': '/blogs.md' },
        },
        // rel="next" on the first page of a paginated list.
        ...(pages > 1 ? { pagination: { next: `${siteMetadata.siteUrl}${pageHref(2)}` } } : {}),
    };
}

export default function BlogsPage() {
    return <BlogsListing page={1} />;
}
