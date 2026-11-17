import type { MetadataRoute } from 'next';
import { projects } from '@/data/projects';
import { listRandomThoughtSitemapEntries } from '@/lib/random-thoughts';
import { milestones, milestoneYears } from '@/utils/milestones';
import { siteMetadata } from '@/utils/siteMetadata';
import { getAllBlogPosts, getBlogLocales } from '@/lib/blogs/content';
import { DEFAULT_LOCALE, languageAlternates, localizePath } from '@/lib/i18n/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const randomThoughts = await listRandomThoughtSitemapEntries();
    // The index changes whenever any post does, so its lastmod is the newest post's updatedAt.
    const newestBlogUpdate = getAllBlogPosts(DEFAULT_LOCALE).map((post) => post.updatedAt).sort().at(-1);
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: siteMetadata.siteUrl, changeFrequency: 'weekly', priority: 1 },
        { url: `${siteMetadata.siteUrl}/about`, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/projects`, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/blogs`, lastModified: newestBlogUpdate, changeFrequency: 'weekly', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/consistency`, changeFrequency: 'daily', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/consistency/github`, changeFrequency: 'daily', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/consistency/youtube`, changeFrequency: 'daily', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/consistency/subclip`, changeFrequency: 'daily', priority: 0.8 },
    ];

    const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
        url: `${siteMetadata.siteUrl}/projects/${project.slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
    }));

    const blogRoutes: MetadataRoute.Sitemap = getAllBlogPosts(DEFAULT_LOCALE).map((post) => ({
        url: `${siteMetadata.siteUrl}${localizePath(`/blogs/${post.slug}`, DEFAULT_LOCALE)}`,
        lastModified: post.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
        alternates: { languages: languageAlternates(`/blogs/${post.slug}`, getBlogLocales(post.slug), siteMetadata.siteUrl) },
    }));

    const milestoneRoutes: MetadataRoute.Sitemap = milestones.map((item) => ({
        url: `${siteMetadata.siteUrl}/milestone/${item.year}/${item.slug}`,
        changeFrequency: 'yearly',
        priority: 0.7,
    }));

    const milestoneYearRoutes: MetadataRoute.Sitemap = milestoneYears.map((item) => ({
        url: `${siteMetadata.siteUrl}/milestone/${item.year}`,
        changeFrequency: 'yearly',
        priority: 0.8,
    }));

    const thoughtRoutes: MetadataRoute.Sitemap = randomThoughts.map((thought) => ({
        url: `${siteMetadata.siteUrl}/t/${thought.slug}`,
        lastModified: thought.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    return [
        ...staticRoutes,
        ...projectRoutes,
        ...blogRoutes,
        ...milestoneYearRoutes,
        ...milestoneRoutes,
        ...thoughtRoutes,
    ];
}
