import { getAllBlogPosts } from '@/lib/blogs/content';
import { parsePage, totalPages } from '@/lib/blogs/pagination';
import { renderOgCard } from '@/lib/blogs/og-card';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

// Social card for /blogs/page/<n>: same look as the index, with the page number.
export const alt = 'Notes from my experiments: guides by Samik Choudhury';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
    return Array.from({ length: totalPages(getAllBlogPosts(DEFAULT_LOCALE).length) }, (_, i) => ({ page: String(i + 1) }));
}

export default async function Image({ params }: { params: Promise<{ page: string }> }) {
    const page = parsePage((await params).page) ?? 1;
    const all = getAllBlogPosts(DEFAULT_LOCALE);
    return renderOgCard({ kicker: 'Blogs', title: 'Notes from my experiments.', meta: [`Page ${page} of ${totalPages(all.length)}`, `${all.length} guides`] });
}
