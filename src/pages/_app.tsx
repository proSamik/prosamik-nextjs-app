import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import MainLayout from '@/components/MainLayout'
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
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
