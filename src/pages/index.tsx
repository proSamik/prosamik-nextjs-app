import Link from 'next/link';
import { repoMap } from '@/data/repos';

export default function Home() {
    return (
        <main className="max-w-[728px] mx-auto px-4 py-8">
            <h1 className="text-3xl font-serif mb-8">My Blog Posts</h1>
            <div className="space-y-4">
                {Object.entries(repoMap).map(([title, _]) => (
                    <Link
                        key={title}
                        href={`/blog/${encodeURIComponent(title)}`}
                        className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                    >
                        <h2 className="text-xl font-semibold">{title}</h2>
                    </Link>
                ))}
            </div>
        </main>
    );
}