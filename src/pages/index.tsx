import { useState, useEffect } from 'react';
import { useRepoList } from '@/hooks/useRepoList';
import Loading from '@/components/Loading';
import ErrorMessage from '@/components/ErrorMessage';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BlogList from "@/components/BlogList";

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
                <BlogList repos={data.repos} />
            </main>

            {/* Footer component */}
            <Footer />
        </div>
    );
}
