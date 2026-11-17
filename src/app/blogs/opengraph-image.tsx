import { getAllBlogPosts } from '@/lib/blogs/content';
import { renderOgCard } from '@/lib/blogs/og-card';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';

// Social card for /blogs and its paginated pages.
export const alt = 'Notes from my experiments: guides by Samik Choudhury';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
    const count = getAllBlogPosts(DEFAULT_LOCALE).length;
    return renderOgCard({ kicker: 'Blogs', title: 'Notes from my experiments.', meta: [`${count} guides`, 'MCP, VM testing and deployment'] });
}
