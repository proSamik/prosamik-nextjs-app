'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import PostHogPublicPageView from '@/components/analytics/PostHogPublicPageView';

export default function MainLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname() || '';
    if (pathname === '/samik-admin' || pathname.startsWith('/samik-admin/') || pathname === '/oauth-consent' || pathname === '/sign-in') {
        return <><PostHogPublicPageView />{children}</>;
    }
    return (
        <div className="portfolio-site" id="top">
            <PostHogPublicPageView />
            <a className="site-skip" href="#main-content">Skip to content</a>
            <Navigation />
            <main id="main-content" className="site-content" tabIndex={-1}>{children}</main>
            <Footer />
        </div>
    );
}
