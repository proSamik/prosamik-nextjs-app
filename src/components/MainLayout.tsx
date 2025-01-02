// components/layout/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import CustomBackButton from "@/components/layout/CustomBackButton";
import CustomNextButton from "@/components/layout/CustomNextButton";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 1090);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const layoutClasses = {
        container: `min-h-screen flex flex-col`,
        mainWrapper: `flex-grow flex flex-col md:flex-row`,
        main: `flex-grow w-full mx-auto px-4 py-4 ${isMobile ? 'mt-[60px] mb-[80px]' : ''}`,
        rightSpacer: `hidden md:block md:w-20 flex-shrink-0`,
    };

    return (
        <div className={layoutClasses.container}>
            <div className={layoutClasses.mainWrapper}>
                <div className="">
                    <Navigation />
                </div>

                <main className={layoutClasses.main}>
                    {isMobile && (
                        <div className="flex justify-between mb-6">
                            <CustomBackButton />
                            <CustomNextButton />
                        </div>
                    )}
                    {children}
                </main>

                {!isMobile && <div className={layoutClasses.rightSpacer}/>}
            </div>

            <Footer/>
        </div>
    );
}