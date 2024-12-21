import Link from 'next/link';
import { useRepoList } from '@/hooks/useRepoList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
    const { data, error, loading } = useRepoList();

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return <div>No repos found</div>;

    return (
        <main className="max-w-[728px] mx-auto px-4 py-8">
            <h1 className="text-3xl font-serif mb-8">My Blog Posts</h1>
            <div className="space-y-4">
                {data.repos.map((repo) => (
                    <Link
                        key={repo.repoPath}
                        href={`/blog/${encodeURIComponent(repo.title)}`}
                        className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                    >
                        <h2 className="text-xl font-semibold mb-2">{repo.title}</h2>
                        {repo.description && (
                            <p className="text-gray-600">{repo.description}</p>
                        )}
                    </Link>
                ))}
            </div>
        </main>
    );
}