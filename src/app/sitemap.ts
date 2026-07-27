import type { MetadataRoute } from 'next';
import { projects } from '@/data/projects';
import { milestones } from '@/utils/milestones';
import { siteMetadata } from '@/utils/siteMetadata';

export default function sitemap(): MetadataRoute.Sitemap {
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: siteMetadata.siteUrl, changeFrequency: 'weekly', priority: 1 },
        { url: `${siteMetadata.siteUrl}/about`, changeFrequency: 'monthly', priority: 0.9 },
        { url: `${siteMetadata.siteUrl}/projects`, changeFrequency: 'weekly', priority: 0.9 },
    ];

    const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
        url: `${siteMetadata.siteUrl}/projects/${project.slug}`,
        changeFrequency: 'monthly',
        priority: 0.8,
    }));

    const milestoneRoutes: MetadataRoute.Sitemap = milestones.map((item) => ({
        url: `${siteMetadata.siteUrl}/milestone/${item.year}/${item.slug}`,
        changeFrequency: 'yearly',
        priority: 0.7,
    }));

    return [...staticRoutes, ...projectRoutes, ...milestoneRoutes];
}
