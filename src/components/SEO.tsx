// components/SEO.tsx
import Head from 'next/head'
import React from "react";
import { useRouter } from 'next/router';
import { siteMetadata } from '@/utils/siteMetadata';

interface SEOProps {
    title?: string;
    description?: string;
    ogImage?: string;
    noindex?: boolean;
    children?: React.ReactNode;
}

const MAX_DESCRIPTION_LENGTH = 160;

export default function SEO({
                                title = siteMetadata.title,
                                description = siteMetadata.defaultDescription,
                                ogImage = siteMetadata.defaultImage,
                                noindex = false,
                                children
                            }: SEOProps) {
    const router = useRouter();
    const finalTitle = title === siteMetadata.title ? title : `${title} | ${siteMetadata.creator}`;
    const truncatedDescription = description.length > MAX_DESCRIPTION_LENGTH
        ? `${description.slice(0, MAX_DESCRIPTION_LENGTH-3)}...`
        : description;
    const canonicalUrl = `${siteMetadata.siteUrl}${router.asPath}`;

    return (
        <Head>
            <title>{finalTitle}</title>
            <meta name="description" content={truncatedDescription} />

            {/* Basic SEO */}
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large"} />
            <link rel="canonical" href={canonicalUrl} />
            <meta name="author" content={siteMetadata.creator} />
            <meta name="keywords" content={siteMetadata.skills.join(', ')} />

            {/* Open Graph / Social Media */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={siteMetadata.title} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:locale" content="en_US" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={siteMetadata.twitterUsername} />
            <meta name="twitter:creator" content={siteMetadata.twitterUsername} />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={ogImage} />

            {/* JSON-LD for rich snippets */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Person",
                        "name": "Samik Choudhury",
                        "url": siteMetadata.siteUrl,
                        "jobTitle": "DevOps Engineer",
                        "knowsAbout": siteMetadata.skills,
                        "alumniOf": [
                            {
                                "@type": "Organization",
                                "name": "Army Institute of Technology, Pune",
                                "url": "https://www.aitpune.com",
                            },
                            {
                                "@type": "Organization",
                                "name": "rtCamp",
                                "url": "https://rtcamp.com"
                            },
                            {
                                "@type": "Organization",
                                "name": "Google Developer Student Clubs",
                                "url": "https://developers.google.com"
                            },
                            {
                                "@type": "Organization",
                                "name": "E-Cell AIT",
                                "url": "https://aitecell.in"
                            }
                        ],
                        "memberOf": [
                        ],
                        "sameAs": [
                            `https://github.com/${siteMetadata.creator}`,
                            `https://linkedin.com/in/${siteMetadata.creator}`,
                            `https://twitter.com/${siteMetadata.twitterUsername}`
                        ]
                    })
                }}
            />

            {/* Favicon */}
            <link rel="icon" href="/favicon.svg" />
            <link rel="apple-touch-icon" href="/image/og-Image.png" />

            {/* Additional meta tags */}
            {children}
        </Head>
    )
}