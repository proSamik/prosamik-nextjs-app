import type { Metadata } from 'next';
import { projects } from '@/data/projects';
import ProjectsGallery from '@/components/portfolio/ProjectsGallery';

export const metadata: Metadata = {
    title: 'Projects — Samik Choudhury',
    description: 'Products and experiments built by Samik, including the problems, motivation, mistakes, learnings, and achievements behind each project.',
    alternates: { canonical: '/projects' },
};
export default function ProjectsPage() {
    const previews = projects.map(({ slug, title, type, description }) => ({ slug, title, type, description }));
    const list = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: `https://www.prosamik.com/projects/${p.slug}` })) };
    return <div className="portfolio-page page-width"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(list) }} /><header className="page-heading"><h1>The things<br />I’m making.</h1><p>Apps, extensions, and experiments.<br />Every one has a story.</p></header><ProjectsGallery projects={previews} /></div>;
}
