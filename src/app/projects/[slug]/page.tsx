import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
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
        title: `${project.title} — Project Story`,
        description: project.description,
        keywords: [project.title, project.type, 'Samik projects', 'product development'],
        alternates: { canonical: `/projects/${project.slug}` },
        openGraph: {
            type: 'article',
            url: `/projects/${project.slug}`,
            title: `${project.title} — Project Story`,
            description: project.description,
        },
        twitter: {
            card: 'summary_large_image',
            title: `${project.title} — Project Story`,
            description: project.description,
        },
    };
}

function ListSection({ title, items }: { title: string; items: string[] }) {
    if (items.length === 0) return null;

    return (
        <section className="space-y-3">
            <h2 className="text-2xl font-bold">{title}</h2>
            <ul className="list-disc space-y-2 pl-6 text-gray-700">
                {items.map((item) => <li key={item}>{item}</li>)}
            </ul>
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

            <Link href="/projects" className="text-sm text-indigo-600 hover:underline">
                ← All experiments
            </Link>

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
                <section className="space-y-3">
                    <h2 className="text-2xl font-bold">The Problem</h2>
                    <p className="leading-7 text-gray-700">{project.problem}</p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-2xl font-bold">The Motivation</h2>
                    <p className="leading-7 text-gray-700">{project.motivation}</p>
                </section>

                <ListSection title="Mistakes" items={project.mistakes} />
                <ListSection title="Learning" items={project.learnings} />
                <ListSection title="Achievements" items={project.achievements} />
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
