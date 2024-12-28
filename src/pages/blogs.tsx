import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from "@/components/Footer";
import {useRepoList} from "@/hooks/useRepoList";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import BlogList from "@/components/BlogList";

export default function Blogs() {
    const { data, error, loading } = useRepoList();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if the screen is mobile or desktop
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090); // Adjust the breakpoint as needed
        };

        handleResize(); // Run initially
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;
    if (!data?.repos.length) return <div>No blogs found</div>;

    return (
        <div className="flex flex-col md:flex-row">
            {/* Navigation component */}
                <Navigation />


            {/* Main content area */}
            <main
                className={`max-w-[800px] mx-auto px-4 py-4`}
                style={{
                    width: isMobile ? '100%' : '100%',
                    marginTop: isMobile ? '60px' : '0',
                    marginBottom: isMobile ? '80px' : '0',}}
            >
                {/* About page components */}
                <div className="space-y-8">
                    <BlogList repos={data.repos} />
                </div>
            </main>
            {/* Footer component */}
            <Footer />
        </div>
    );
}
