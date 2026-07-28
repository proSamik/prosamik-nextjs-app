import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
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
                    className="font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-2 transition-colors hover:text-indigo-800 hover:decoration-indigo-500"
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
                className="font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-2 transition-colors hover:text-indigo-800 hover:decoration-indigo-500"
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
        <section className="space-y-4">
            <h2 className="text-2xl font-bold">{title}</h2>
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

    return (
        <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
            />

            <Breadcrumbs items={[
                { label: 'Projects', href: '/projects' },
                { label: project.title },
            ]} />

            <header className="mt-8 space-y-5 border-b border-gray-200 pb-8">
                <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700">
                    {project.type}
                </span>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{project.title}</h1>
                <p className="text-lg leading-8 text-gray-600">{project.description}</p>
                <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <ArrowDown className="h-4 w-4 shrink-0" />
                    Note: the project link is at the bottom of this page. Keep scrolling to reach it.
                </p>
            </header>

            <div className="space-y-12 py-10">
                <StorySection title="The Problem" paragraphs={project.problem} project={project} />
                <StorySection title="The Motivation" paragraphs={project.motivation} project={project} />
                <StorySection title="Mistakes" paragraphs={project.mistakes} project={project} />
                <StorySection title="Learning" paragraphs={project.learnings} project={project} />
                <StorySection title="Achievements" paragraphs={project.achievements} project={project} />
            </div>

            <section className="border-t border-gray-200 pt-10">
                <h2 className="mb-4 text-2xl font-bold">Project Link</h2>
                <a
                    href={project.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
                >
                    Visit {project.title}
                    <ArrowUpRight className="h-4 w-4" />
                </a>
            </section>
        </article>
    );
}
