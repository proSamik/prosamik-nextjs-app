import type { Metadata, Viewport } from 'next';
import MainLayout from '@/components/MainLayout';
import { siteMetadata } from '@/utils/siteMetadata';
import '@/styles/globals.css';

export const metadata: Metadata = {
    metadataBase: new URL(siteMetadata.siteUrl),
    title: siteMetadata.title,
    description: siteMetadata.defaultDescription,
    authors: [{ name: siteMetadata.creator, url: siteMetadata.siteUrl }],
    creator: siteMetadata.creator,
    keywords: siteMetadata.skills,
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/icon.png', type: 'image/png', sizes: '32x32' },
        ],
        apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
    },
    manifest: '/site.webmanifest',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
    openGraph: {
        type: 'website',
        siteName: siteMetadata.title,
        locale: 'en_US',
        url: siteMetadata.siteUrl,
        title: siteMetadata.title,
        description: siteMetadata.defaultDescription,
        images: [{
            url: siteMetadata.defaultImage,
            width: siteMetadata.ogImageWidth,
            height: siteMetadata.ogImageHeight,
            alt: siteMetadata.ogImageAlt,
            type: siteMetadata.ogImageType,
        }],
    },
    twitter: {
        card: 'summary_large_image',
        site: `@${siteMetadata.twitterUsername}`,
        creator: `@${siteMetadata.twitterUsername}`,
        title: siteMetadata.title,
        description: siteMetadata.defaultDescription,
        images: [{ url: siteMetadata.defaultImage, alt: siteMetadata.ogImageAlt }],
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    colorScheme: 'light',
    themeColor: '#ffffff',
};

const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteMetadata.creator,
    url: siteMetadata.siteUrl,
    jobTitle: siteMetadata.jobTitle,
    knowsAbout: siteMetadata.skills,
    alumniOf: siteMetadata.alumniOf,
    sameAs: siteMetadata.socialProfiles,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
                />
                <MainLayout>{children}</MainLayout>
            </body>
        </html>
    );
}
