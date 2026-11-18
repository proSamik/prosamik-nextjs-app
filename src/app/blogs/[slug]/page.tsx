import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import AgentInstructionsButton from '@/components/blogs/AgentInstructionsButton';
import BlogPostMotion from '@/components/blogs/BlogPostMotion';
import CopyCodeButtons from '@/components/blogs/CopyCodeButtons';
import PromoCards from '@/components/blogs/PromoCards';
import { getBlogLocales, getBlogPost, getBlogSlugs } from '@/lib/blogs/content';
import NewsletterSignup from '@/components/NewsletterSignup';
import { getToc, postUrl, renderPostHtml, splitHtmlAtMiddle } from '@/lib/blogs/render';
import { buildBlogJsonLd } from '@/lib/blogs/schema';
import { DEFAULT_LOCALE, OPEN_GRAPH_LOCALE, languageAlternates, localizePath } from '@/lib/i18n/config';
import { siteMetadata } from '@/utils/siteMetadata';

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
    return getBlogSlugs().map((slug) => ({ slug }));
}

const formatDate = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = getBlogPost(slug, DEFAULT_LOCALE);
    if (!post) return { title: 'Post not found' };
    const path = localizePath(`/blogs/${slug}`, post.locale);
    return {
        title: { absolute: post.seoTitle },
        description: post.description,
        keywords: [post.primaryKeyword, ...post.keywords],
        authors: [{ name: 'Samik Choudhury', url: siteMetadata.siteUrl }],
        alternates: {
            canonical: path,
            languages: languageAlternates(`/blogs/${slug}`, getBlogLocales(slug), siteMetadata.siteUrl),
            types: { 'text/markdown': `${path}.md` },
        },
        openGraph: {
            type: 'article',
            siteName: siteMetadata.title,
            url: path,
            title: post.title,
            description: post.description,
            locale: OPEN_GRAPH_LOCALE[post.locale],
            publishedTime: post.publishedAt,
            modifiedTime: post.updatedAt,
            authors: ['Samik Choudhury'],
            section: post.category,
            tags: [post.primaryKeyword, ...post.keywords],
        },
        twitter: { card: 'summary_large_image', title: post.title, description: post.description },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = getBlogPost(slug, DEFAULT_LOCALE);
    if (!post) notFound();

    const [firstHalf, secondHalf] = splitHtmlAtMiddle(renderPostHtml(post));
    const toc = getToc(post.body);
    const related = post.related.flatMap((relatedSlug) => getBlogPost(relatedSlug, post.locale) ?? []);
    const bodyId = 'blog-article-body';

    return (
        <article className="portfolio-page page-width blog-post">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBlogJsonLd(post)) }} />
            <BlogPostMotion articleId={bodyId} />
            <Breadcrumbs items={[{ label: 'Blogs', href: '/blogs' }, { label: post.title }]} />
            <header className="blog-hero">
                <p className="blog-kicker">{post.category}</p>
                <h1>{post.title}</h1>
                <p className="blog-lede">{post.description}</p>
                <p className="blog-meta">
                    <span>Samik Choudhury</span>
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    {post.updatedAt !== post.publishedAt && <span>Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></span>}
                    <span>{post.readTime} read</span>
                    <a href={`${localizePath(`/blogs/${slug}`, post.locale)}.md`} rel="alternate" type="text/markdown">Markdown for agents</a>
                </p>
                <AgentInstructionsButton slug={post.slug} placement="top" />
            </header>
            <div className="blog-layout">
                <nav className="blog-toc" aria-label="On this page">
                    <span>On this page</span>
                    {toc.map((item) => <a key={item.id} href={`#${item.id}`}>{item.title}</a>)}
                </nav>
                <div className="blog-body-column">
                    <div id={bodyId} className="blog-body">
                        <div dangerouslySetInnerHTML={{ __html: firstHalf }} />
                        {secondHalf && <NewsletterSignup source={`blog/${post.slug}`} variant="inline" />}
                        {secondHalf && <div dangerouslySetInnerHTML={{ __html: secondHalf }} />}
                    </div>
                    <CopyCodeButtons containerId={bodyId} />
                    <AgentInstructionsButton slug={post.slug} placement="bottom" />
                    <PromoCards post={post} />
                    {related.length > 0 && (
                        <nav className="blog-related" aria-label="Related guides">
                            <h2>Keep reading</h2>
                            <ul>
                                {related.map((item) => (
                                    <li key={item.slug}>
                                        <Link href={localizePath(`/blogs/${item.slug}`, item.locale)}>{item.title}</Link>
                                        <span>{item.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    )}
                    <nav className="story-next" aria-label="More posts"><Link href="/blogs">← All blogs</Link><a href={postUrl(post)} rel="canonical">Permalink</a></nav>
                </div>
            </div>
        </article>
    );
}
