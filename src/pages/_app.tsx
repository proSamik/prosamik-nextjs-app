import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <link rel="icon" href="/favicon.svg" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}