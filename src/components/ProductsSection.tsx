import {
    ArrowUpRight,
    Ban,
    Brain,
    Chrome,
    Clapperboard,
    Database,
    GitBranch,
    Globe,
    Monitor,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { projects, type Project, type ProjectIcon } from '@/data/projects';

const icons: Record<ProjectIcon, LucideIcon> = {
    ban: Ban,
    brain: Brain,
    chrome: Chrome,
    clapperboard: Clapperboard,
    database: Database,
    'git-branch': GitBranch,
    globe: Globe,
    monitor: Monitor,
};

function ProjectCard({ project, timeline = false }: { project: Project; timeline?: boolean }) {
    const Icon = icons[project.icon];

    return (
        <Link
            href={`/projects/${project.slug}`}
            className={`group relative flex w-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.2),0_10px_20px_-2px_rgba(0,0,0,0.05)] ${
                timeline ? 'min-h-[190px]' : 'min-h-[220px] max-w-sm'
            }`}
        >
            <div className="mb-4 flex items-center">
                <Icon className="mr-3 shrink-0 text-indigo-500" size={24} />
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                    {project.type}
                </span>
            </div>

            <div className="mb-3 flex items-start justify-between">
                <h2 className="pr-6 text-lg font-bold text-indigo-600 transition-colors group-hover:text-indigo-700 sm:text-xl">
                    {project.title}
                </h2>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-indigo-600 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </div>

            <p className="line-clamp-3 flex-grow text-sm text-gray-600">
                {project.description}
            </p>

            <span className="mt-auto flex items-center gap-1 pt-2 text-sm text-indigo-600 group-hover:underline">
                Read the project story <ArrowUpRight size={12} />
            </span>

            <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-transform duration-300 group-hover:scale-x-100" />
        </Link>
    );
}

function ProjectTimeline() {
    return (
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
            <h1 className="mb-12 text-center text-3xl font-bold">My Top Projects</h1>

            <div className="relative mx-auto max-w-5xl">
                <div
                    aria-hidden="true"
                    className="project-timeline-line absolute bottom-0 left-[15px] top-0 w-0.5 bg-gradient-to-b from-indigo-600 to-purple-300 md:left-1/2 md:-translate-x-1/2"
                />

                <div className="space-y-8">
                    {projects.map((project, index) => {
                        const isLeft = index % 2 === 0;

                        return (
                            <article
                                key={project.slug}
                                className="project-timeline-item relative pl-12 md:grid md:grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] md:items-center md:pl-0"
                                style={{ animationDelay: `${index * 130 + 220}ms` }}
                            >
                                <span
                                    aria-hidden="true"
                                    className="absolute left-2 top-7 z-10 h-4 w-4 rounded-full border-2 border-indigo-600 bg-indigo-600 ring-4 ring-white md:hidden"
                                />
                                <span
                                    aria-hidden="true"
                                    className="absolute left-6 top-[35px] h-0.5 w-6 bg-indigo-500 md:hidden"
                                />

                                <div className={isLeft ? 'md:col-start-1' : 'md:col-start-3'}>
                                    <ProjectCard project={project} timeline />
                                </div>

                                <div className="relative hidden h-full min-h-[190px] md:col-start-2 md:row-start-1 md:block">
                                    <span
                                        aria-hidden="true"
                                        className="absolute left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-600 bg-indigo-600 ring-4 ring-white"
                                    />
                                    <span
                                        aria-hidden="true"
                                        className={`absolute top-1/2 h-0.5 -translate-y-1/2 bg-indigo-500 ${
                                            isLeft ? 'left-0 right-1/2' : 'left-1/2 right-0'
                                        }`}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default function ProductsSection({ variant = 'grid' }: { variant?: 'grid' | 'timeline' }) {
    if (variant === 'timeline') return <ProjectTimeline />;

    return (
        <section className="flex min-h-[calc(100vh-172px)] flex-col items-center justify-center px-4 py-4 sm:px-6 min-[1090px]:min-h-[calc(100vh-2rem)]">
            <h1 className="mb-8 w-full text-center text-3xl font-bold">My HONEST Experiments</h1>

            <div className="mx-auto grid w-full max-w-screen-xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <div key={project.slug} className="flex justify-center">
                        <ProjectCard project={project} />
                    </div>
                ))}
            </div>
        </section>
    );
}
