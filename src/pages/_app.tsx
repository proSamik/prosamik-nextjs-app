// pages/_app.tsx
import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import MainLayout from '@/components/MainLayout'
import { usePageAnalytics } from "@/hooks/usePageAnalytics";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
    const { trackPageView } = usePageAnalytics();
    const router = useRouter();

    useEffect(() => {
        const handleRouteChange = (url: string) => {
            const pageName = url.split('/')[1] || 'home';
            void trackPageView(pageName);
        };

        router.events.on('routeChangeComplete', handleRouteChange);

        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router.events, trackPageView]);

    return (
        <>
            <Head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                {/* Add language meta tag */}
                <meta httpEquiv="content-language" content="en" />
            </Head>
            <MainLayout>
                <Component {...pageProps} />
            </MainLayout>
        </>
    );
}