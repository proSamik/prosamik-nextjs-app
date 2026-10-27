import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ProjectVisual } from '@/components/portfolio/Visuals';
import { getProjectBySlug, projects } from '@/data/projects';
import { siteMetadata } from '@/utils/siteMetadata';

interface ProjectPageProps {
    params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
    return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const { slug } = await params;
    const project = getProjectBySlug(slug);

    if (!project) {
        return { title: 'Project Not Found' };
    }

    return {
        title: `${project.title} | Project Story`,
        description: project.description,
        keywords: [project.title, project.type, 'Samik projects', 'product development'],
        alternates: { canonical: `/projects/${project.slug}` },
        openGraph: {
            type: 'article',
            url: `/projects/${project.slug}`,
            title: `${project.title} | Project Story`,
            description: project.description,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${project.title} | Project Story`,
            description: project.description,
        },
    };
}

function escapeRegularExpression(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ProjectStoryText({ text, project }: { text: string; project: (typeof projects)[number] }) {
    const linkableProjects = projects.filter((candidate) => candidate.slug !== project.slug);
    const linkableText = [
        ...linkableProjects.map((candidate) => candidate.title),
        ...(project.storyLinks || []).map((link) => link.label),
    ];
    const titlePattern = linkableText
        .map(escapeRegularExpression)
        .sort((first, second) => second.length - first.length)
        .join('|');

    if (!titlePattern) return text;

    const titleMatcher = new RegExp(`(${titlePattern})`, 'gi');

    return text.split(titleMatcher).map((part, index) => {
        const externalLink = project.storyLinks?.find(
            (link) => link.label.toLowerCase() === part.toLowerCase()
        );

        if (externalLink) {
            return (
                <a
                    key={`${externalLink.url}-${index}`}
                    href={externalLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="story-inline-link"
                >
                    {part}
                </a>
            );
        }

        const linkedProject = linkableProjects.find(
            (candidate) => candidate.title.toLowerCase() === part.toLowerCase()
        );

        if (!linkedProject) return part;

        return (
            <Link
                key={`${linkedProject.slug}-${index}`}
                href={`/projects/${linkedProject.slug}`}
                className="story-inline-link"
            >
                {part}
            </Link>
        );
    });
}

function StorySection({ title, paragraphs, project }: {
    title: string;
    paragraphs: string[];
    project: (typeof projects)[number];
}) {
    return (
        <section id={title.toLowerCase().replace(/\s+/g, '-')}>
            <h2>{title}</h2>
            {paragraphs.map((paragraph, index) => (
                <p key={index} className="leading-7 text-gray-700">
                    <ProjectStoryText text={paragraph} project={project} />
                </p>
            ))}
        </section>
    );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { slug } = await params;
    const project = getProjectBySlug(slug);

    if (!project) notFound();

    const projectJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: project.title,
        description: project.description,
        applicationCategory: project.type,
        url: project.projectUrl,
        author: {
            '@type': 'Person',
            name: siteMetadata.creator,
            url: siteMetadata.siteUrl,
        },
    };

    const headlines: Record<string, string> = { subclip: 'Making room for the edit.', rankizz: 'Search, made clearer.', 'track-bad-habits': 'Notice the patterns.' };
    const sections = [
        { title: 'The problem', paragraphs: project.problem },
        { title: 'The motivation', paragraphs: project.motivation },
        { title: 'Mistakes', paragraphs: project.mistakes },
        { title: 'Learning', paragraphs: project.learnings },
        { title: 'Achievements', paragraphs: project.achievements },
    ];
    const next = projects[(projects.findIndex(p => p.slug === project.slug) + 1) % projects.length];
    return (
        <article className="portfolio-page page-width">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }} />
            <Breadcrumbs items={[{ label: 'Work', href: '/projects' }, { label: project.title }]} />
            <header className="story-hero">
                <div><h1>{headlines[project.slug] || project.title}</h1><p className="story-type">{project.title} · {project.type}</p><p className="story-description">{project.description}</p><a className="button button-primary" href={project.projectUrl} target="_blank" rel="noopener noreferrer">Visit {project.title} <ArrowUpRight size={18} /></a></div>
                <ProjectVisual slug={project.slug} eager />
            </header>
            <div className="story-layout">
                <nav className="story-toc" aria-label="Story contents">{sections.map(section => <a key={section.title} href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}>{section.title}</a>)}</nav>
                <div className="story-body">{sections.map(section => <StorySection key={section.title} title={section.title} paragraphs={section.paragraphs} project={project} />)}</div>
            </div>
            <nav className="story-next" aria-label="More projects"><Link href="/projects">← All projects</Link><Link href={`/projects/${next.slug}`}>Next project: {next.title} →</Link></nav>
        </article>
    );
}
