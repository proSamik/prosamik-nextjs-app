'use client';

import type { ReactNode } from 'react';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const isMobile = useMediaQuery('(max-width: 1090px)');

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
                    {children}
                </main>

                {!isMobile && <div className={layoutClasses.rightSpacer}/>}
            </div>

            <Footer/>
        </div>
    );
}
