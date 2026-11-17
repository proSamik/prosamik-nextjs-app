import type { Metadata } from 'next';
import BlogsListing from '@/components/blogs/BlogsListing';
import { getAllBlogPosts } from '@/lib/blogs/content';
import { pageHref, totalPages } from '@/lib/blogs/pagination';
import { blogsDescription, blogsTitle } from '@/lib/blogs/seo';
import { DEFAULT_LOCALE, languageAlternates } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

export function generateMetadata(): Metadata {
    const pages = totalPages(getAllBlogPosts(DEFAULT_LOCALE).length);
    return {
        title: { absolute: blogsTitle(1) },
        description: blogsDescription(1, pages),
        alternates: {
            canonical: '/blogs',
            languages: languageAlternates('/blogs', [DEFAULT_LOCALE], siteMetadata.siteUrl),
            types: { 'text/markdown': '/blogs.md' },
        },
        openGraph: { type: 'website', siteName: siteMetadata.title, url: '/blogs', title: blogsTitle(1), description: blogsDescription(1, pages) },
        twitter: { card: 'summary_large_image', title: blogsTitle(1), description: blogsDescription(1, pages) },
        // rel="next" on the first page of a paginated list.
        ...(pages > 1 ? { pagination: { next: `${siteMetadata.siteUrl}${pageHref(2)}` } } : {}),
    };
}

export default function BlogsPage() {
    return <BlogsListing page={1} />;
}
