import type { AppProps } from 'next/app'
import '@/styles/globals.css'
import SEO from "@/components/layout/SEO";
import {siteMetadata} from "@/utils/siteMetadata";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <SEO
                title={siteMetadata.title}
                description={siteMetadata.defaultDescription}
            />
            <Component {...pageProps} />
        </>
    );
}