import type { Metadata } from 'next';
import ProductsSection from '@/components/ProductsSection';
import { siteMetadata } from '@/utils/siteMetadata';

export const metadata: Metadata = {
    title: "Samik's Builder Toolkit",
    description: siteMetadata.defaultDescription,
    alternates: { canonical: '/' },
    openGraph: {
        type: 'website',
        siteName: siteMetadata.title,
        locale: 'en_US',
        url: '/',
        title: "Samik's Builder Toolkit",
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
        title: "Samik's Builder Toolkit",
        description: siteMetadata.defaultDescription,
        images: [{ url: siteMetadata.defaultImage, alt: siteMetadata.ogImageAlt }],
    },
};

export default function Home() {
    return <ProductsSection />;
}
