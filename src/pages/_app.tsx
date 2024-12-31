import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import SEO from "@/components/SEO";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <SEO />
            <Component {...pageProps} />
        </>
    );
}