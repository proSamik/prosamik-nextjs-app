import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';


export default function Home() {
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
            </main>

            {/* Footer component */}
            <Footer />
        </div>
    );
}
