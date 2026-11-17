import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import BlogsListing from '@/components/blogs/BlogsListing';
import { getAllBlogPosts } from '@/lib/blogs/content';
import { pageHref, parsePage, totalPages } from '@/lib/blogs/pagination';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

interface PageProps {
    params: Promise<{ page: string }>;
}

export const dynamicParams = false;

// Pages 1..N. Page 1 is only here so /blogs/page/1 can redirect to /blogs instead of returning 404.
export function generateStaticParams() {
    const pages = totalPages(getAllBlogPosts(DEFAULT_LOCALE).length);
    return Array.from({ length: pages }, (_, i) => ({ page: String(i + 1) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const page = parsePage((await params).page);
    const pages = totalPages(getAllBlogPosts(DEFAULT_LOCALE).length);
    if (!page || page < 2 || page > pages) return { title: 'Blogs — Samik Choudhury' };
    const abs = (n: number) => `${siteMetadata.siteUrl}${pageHref(n)}`;
    return {
        title: `Blogs, page ${page} of ${pages} — Samik Choudhury`,
        description: `Page ${page} of ${pages} of Samik's hands-on guides: the exact commands and the errors I hit.`,
        alternates: { canonical: pageHref(page), types: { 'text/markdown': `${pageHref(page)}.md` } },
        pagination: { previous: abs(page - 1), ...(page < pages ? { next: abs(page + 1) } : {}) },
    };
}

export default async function BlogsPaginatedPage({ params }: PageProps) {
    const page = parsePage((await params).page);
    const pages = totalPages(getAllBlogPosts(DEFAULT_LOCALE).length);
    if (!page || page > pages) notFound();
    if (page === 1) permanentRedirect('/blogs');
    return <BlogsListing page={page} />;
}
