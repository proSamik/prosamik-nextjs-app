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
import { projects, type ProjectIcon } from '@/data/projects';

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

export default function ProductsSection() {
    return (
        <section className="flex min-h-[calc(100vh-172px)] flex-col items-center justify-center px-4 py-4 sm:px-6 min-[1090px]:min-h-[calc(100vh-2rem)]">
            <h1 className="mb-8 w-full text-center text-3xl font-bold">My HONEST Experiments</h1>

            <div className="mx-auto grid w-full max-w-screen-xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => {
                    const Icon = icons[project.icon];

                    return (
                    <div key={project.slug} className="flex justify-center">
                        <Link
                            href={`/projects/${project.slug}`}
                            className="group relative flex min-h-[220px] w-full max-w-sm cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.2),0_10px_20px_-2px_rgba(0,0,0,0.05)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_2px_15px_-3px_rgba(79,70,229,0.15)] dark:hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.25)]"
                        >
                            <div className="mb-4 flex items-center">
                                <Icon className="mr-3 shrink-0 text-indigo-500" size={24}/>
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    {project.type}
                                </span>
                            </div>

                            <div className="mb-3 flex items-start justify-between">
                                <h2 className="pr-6 text-lg font-bold text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300 sm:text-xl">
                                    {project.title}
                                </h2>
                                <ArrowUpRight className="h-5 w-5 shrink-0 text-indigo-600 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 dark:text-indigo-400"/>
                            </div>

                            <p className="line-clamp-3 flex-grow text-sm text-gray-600 dark:text-gray-300">
                                {project.description}
                            </p>

                            <span className="mt-auto flex items-center gap-1 pt-2 text-sm text-indigo-600 group-hover:underline dark:text-indigo-400">
                                Read the project story <ArrowUpRight size={12}/>
                            </span>

                            <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-transform duration-300 group-hover:scale-x-100"/>
                        </Link>
                    </div>
                    );
                })}
            </div>
        </section>
    );
}
