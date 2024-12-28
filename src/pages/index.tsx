import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProfileHeader from '@/components/ProfileHeader';
import BlogPreview from '@/components/BlogPreview';
import ProjectPreview from '@/components/ProjectPreview';
import CallToAction from '@/components/CallToAction';

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (isMobile) {
        return (
            <div className="flex flex-col md:flex-row">
                {/* Navigation component */}
                <Navigation />

                {/* Main content area */}
                <main
                    className={`max-w-[800px] mx-auto px-4 py-4`}
                    style={{
                        width: '100%',
                        marginTop: '60px',
                        marginBottom: '80px',
                    }}
                >
                    <div className="space-y-12">
                        <ProfileHeader />
                        <BlogPreview isMobile={true} />
                        <ProjectPreview isMobile={true} />
                        <CallToAction />
                    </div>
                </main>

                {/* Footer component */}
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-grow flex flex-col md:flex-row">
                {/* Navigation */}
                <div className="md:w-64 flex-shrink-0">
                    <Navigation />
                </div>

                {/* Main content */}
                <main className="flex-grow max-w-[800px] w-full mx-auto px-4 py-4">
                    <div className="space-y-12">
                        <ProfileHeader />

                        {/* Blog and Project previews side by side */}
                        <div className="flex flex-row space-x-4">
                            <BlogPreview isMobile={false} />
                            <ProjectPreview isMobile={false} />
                        </div>

                        {/* Additional components stacked below */}
                        <CallToAction />
                    </div>
                </main>

                {/* Right spacing div for desktop */}
                <div className="hidden md:block md:w-64 flex-shrink-0" />
            </div>

            {/* Footer */}
            <Footer />
        </div>
    );
}