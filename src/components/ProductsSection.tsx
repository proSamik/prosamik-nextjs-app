import {
    ArrowUpRight,
    Brain,
    Chrome,
    Database,
    GitBranch,
    Globe,
    Monitor,
    type LucideIcon,
} from 'lucide-react';

interface ProductItem {
    icon: LucideIcon;
    title: string;
    description: string;
    type: string;
    url: string;
}

const products: ProductItem[] = [
    {
        icon: Brain,
        title: 'mapyourideas.com',
        type: 'Web App',
        description: 'AI powered brainstorming and mind mapping app',
        url: 'https://mapyourideas.com',
    },
    {
        icon: Monitor,
        title: 'FreeScreenshot',
        type: 'macOS App',
        description: 'Add beautiful colorful backgrounds to your Mac screenshots',
        url: 'https://githubme.com/proSamik/freescreenshot',
    },
    {
        icon: Globe,
        title: 'githubme.com',
        type: 'Web App',
        description: 'Convert any GitHub README into a readable article format',
        url: 'https://githubme.com',
    },
    {
        icon: GitBranch,
        title: 'Consistent Tracker',
        type: 'Web App',
        description: 'Track your consistency across GitHub, Twitter, Instagram, and YouTube',
        url: 'https://consistency.prosamik.com',
    },
    {
        icon: Chrome,
        title: 'Tweet Copier',
        type: 'Chrome Extension',
        description: 'Save tweets and threads with one click in text format for analysis and inspiration',
        url: 'https://githubme.com/proSamik/a-tweet-copier',
    },
    {
        icon: Database,
        title: 'OnlineDB',
        type: 'Web App',
        description: 'Connect localhost or serverless databases to view and edit data easily',
        url: 'https://githubme.com/proSamik/database-viewer-in-web',
    },
    {
        icon: Globe,
        title: 'prosamik.com',
        type: 'Web App',
        description: 'Personal site and product portfolio',
        url: 'https://prosamik.com',
    },
];

export default function ProductsSection() {
    return (
        <section className="px-4 py-4 sm:px-6">
            <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map(({ icon: Icon, title, description, type, url }) => (
                    <div key={title} className="flex justify-center">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative flex min-h-[220px] w-full max-w-sm cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.2),0_10px_20px_-2px_rgba(0,0,0,0.05)] dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_2px_15px_-3px_rgba(79,70,229,0.15)] dark:hover:shadow-[0_8px_20px_-4px_rgba(79,70,229,0.25)]"
                        >
                            <div className="mb-4 flex items-center">
                                <Icon className="mr-3 shrink-0 text-indigo-500" size={24}/>
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                    {type}
                                </span>
                            </div>

                            <div className="mb-3 flex items-start justify-between">
                                <h2 className="pr-6 text-lg font-bold text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300 sm:text-xl">
                                    {title}
                                </h2>
                                <ArrowUpRight className="h-5 w-5 shrink-0 text-indigo-600 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 dark:text-indigo-400"/>
                            </div>

                            <p className="line-clamp-3 flex-grow text-sm text-gray-600 dark:text-gray-300">
                                {description}
                            </p>

                            <span className="mt-auto flex items-center gap-1 pt-2 text-sm text-indigo-600 group-hover:underline dark:text-indigo-400">
                                Visit <Globe size={12}/>
                            </span>

                            <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-transform duration-300 group-hover:scale-x-100"/>
                        </a>
                    </div>
                ))}
            </div>
        </section>
    );
}
