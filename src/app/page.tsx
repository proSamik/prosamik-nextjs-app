import type { Metadata } from 'next';
import HomePage from '@/components/portfolio/HomePage';
import { siteMetadata } from '@/utils/siteMetadata';

const title = "hi, I'm Samik 👋";

export const metadata: Metadata = {
    title,
    description: siteMetadata.defaultDescription,
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        siteName: siteMetadata.title,
        locale: 'en_US',
        url: '/',
        title,
        description: siteMetadata.defaultDescription,
        images: [{
            url: siteMetadata.defaultImage,
            width: siteMetadata.ogImageWidth,
            height: siteMetadata.ogImageHeight,
            alt: siteMetadata.ogImageAlt,
        }],
    },
    twitter: {
        card: 'summary_large_image',
        site: `@${siteMetadata.twitterUsername}`,
        creator: `@${siteMetadata.twitterUsername}`,
        title,
        description: siteMetadata.defaultDescription,
        images: [{ url: siteMetadata.defaultImage, alt: siteMetadata.ogImageAlt }],
    },
};

export default function Home() {
    return <HomePage />;
}
