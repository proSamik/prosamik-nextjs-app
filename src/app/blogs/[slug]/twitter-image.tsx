import { getBlogPost, getBlogSlugs } from '@/lib/blogs/content';
import { renderOgCard } from '@/lib/blogs/og-card';

// Same card for X / Twitter (the file conventions are separate, so it is declared here too).
export const alt = 'prosamik blog post cover';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
    return getBlogSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = getBlogPost(slug);
    if (!post) return new Response('Not found', { status: 404 });
    const updated = new Date(`${post.updatedAt}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    return renderOgCard({ kicker: post.category, title: post.title, meta: [`${post.readTime} read`, updated] });
}
