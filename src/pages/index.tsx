import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRepoList } from '@/hooks/useRepoList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import ThemeToggle from '@/components/ThemeToggle';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Home() {
    const { data, error, loading } = useRepoList();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if screen is mobile or desktop
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090); // Adjust the breakpoint as needed
        };

        handleResize(); // Run initially
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return <div>No repos found</div>;

    return (
        <div className="flex flex-col md:flex-row">
            {/* Navigation component */}
            <Navigation />

            {/* Main content area */}
            <main
                className={`max-w-[728px] mx-auto px-4 py-8`}
                style={{
                    width: isMobile ? '100%' : 'auto',
                    marginTop: isMobile ? '60px' : '0',
                    marginBottom: isMobile ? '60px' : '0',
                }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-serif">My Blog Posts</h1>
                    <ThemeToggle />
                </div>
                <div className="space-y-4">
                    {data.repos.map((repo) => (
                        <Link
                            key={repo.repoPath}
                            href={`/blog/${encodeURIComponent(repo.title)}`}
                            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md dark:hover:shadow-lg transition-shadow"
                        >
                            <h2 className="text-xl font-semibold mb-2 dark:text-white">{repo.title}</h2>
                            {repo.description && (
                                <p className="text-gray-600 dark:text-gray-300">{repo.description}</p>
                            )}
                        </Link>
                    ))}
                </div>
            </main>

            {/* Footer component */}
            <Footer />
        </div>
    );
}
