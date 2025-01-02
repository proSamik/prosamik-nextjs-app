// components/SEO.tsx
import Head from 'next/head';
import React from "react";
import { useRouter } from 'next/router';
import { siteMetadata } from '@/utils/siteMetadata';

interface SEOProps {
    // Required props
    title: string;
    description: string;

    // Optional props with metadata enhancements
    ogImage?: string;
    noindex?: boolean;
    children?: React.ReactNode;
    canonicalUrl?: string;
    structuredData?: object | object[];  // For custom JSON-LD data
    alternateUrls?: {
        [key: string]: string;  // language code -> URL mapping
    };
    openGraph?: {
        type?: string;
        siteName?: string;
        locale?: string;
        profile?: {
            firstName?: string;
            lastName?: string;
            username?: string;
            gender?: string;
        };
        article?: {
            publishedTime?: string;
            modifiedTime?: string;
            authors?: string[];
            tags?: string[];
        };
    };
    twitter?: {
        cardType?: 'summary' | 'summary_large_image' | 'app' | 'player';
        site?: string;
        creator?: string;
    };
    additionalMetaTags?: Array<{
        name?: string;
        property?: string;
        content: string;
    }>;
}

const MAX_DESCRIPTION_LENGTH = 160;

export default function SEO({
                                // Initialize with defaults while allowing overrides
                                title = siteMetadata.title,
                                description = siteMetadata.defaultDescription,
                                ogImage = siteMetadata.defaultImage,
                                noindex = false,
                                children,
                                canonicalUrl,
                                structuredData,
                                alternateUrls,
                                openGraph,
                                twitter,
                                additionalMetaTags = []
                            }: SEOProps) {
    const router = useRouter();

    // Process title and description
    const finalTitle = title === siteMetadata.title ? title : `${title} | ${siteMetadata.creator}`;
    const truncatedDescription = description.length > MAX_DESCRIPTION_LENGTH
        ? `${description.slice(0, MAX_DESCRIPTION_LENGTH-3)}...`
        : description;

    // Generate canonical URL
    const pageCanonicalUrl = canonicalUrl || `${siteMetadata.siteUrl}${router.asPath}`;

    // Combine default and custom structured data
    const defaultStructuredData = {
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
        "memberOf": [],
        "sameAs": [
            `https://github.com/${siteMetadata.creator}`,
            `https://linkedin.com/in/${siteMetadata.creator}`,
            `https://twitter.com/${siteMetadata.twitterUsername}`
        ]
    };

    const finalStructuredData = structuredData || defaultStructuredData;

    return (
        <Head>
            {/* Base Meta Tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={truncatedDescription} />
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />

            {/* Robots Meta Tags */}
            <meta
                name="robots"
                content={noindex
                    ? "noindex, nofollow"
                    : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
                }
            />

            {/* Canonical and Alternate URLs */}
            <link rel="canonical" href={pageCanonicalUrl} />
            {alternateUrls && Object.entries(alternateUrls).map(([lang, url]) => (
                <link key={lang} rel="alternate" hrefLang={lang} href={url} />
            ))}

            {/* Author and Keywords */}
            <meta name="author" content={siteMetadata.creator} />
            <meta name="keywords" content={siteMetadata.skills.join(', ')} />

            {/* Open Graph Tags */}
            <meta property="og:type" content={openGraph?.type || 'website'} />
            <meta property="og:site_name" content={openGraph?.siteName || siteMetadata.title} />
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={truncatedDescription} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:url" content={pageCanonicalUrl} />
            <meta property="og:locale" content={openGraph?.locale || 'en_US'} />

            {/* Additional Open Graph Profile Tags */}
            {openGraph?.profile && (
                <>
                    {openGraph.profile.firstName && (
                        <meta property="profile:first_name" content={openGraph.profile.firstName} />
                    )}
                    {openGraph.profile.lastName && (
                        <meta property="profile:last_name" content={openGraph.profile.lastName} />
                    )}
                    {openGraph.profile.username && (
                        <meta property="profile:username" content={openGraph.profile.username} />
                    )}
                    {openGraph.profile.gender && (
                        <meta property="profile:gender" content={openGraph.profile.gender} />
                    )}
                </>
            )}

            {/* Article-specific Open Graph Tags */}
            {openGraph?.article && (
                <>
                    {openGraph.article.publishedTime && (
                        <meta property="article:published_time" content={openGraph.article.publishedTime} />
                    )}
                    {openGraph.article.modifiedTime && (
                        <meta property="article:modified_time" content={openGraph.article.modifiedTime} />
                    )}
                    {openGraph.article.authors?.map((author) => (
                        <meta key={author} property="article:author" content={author} />
                    ))}
                    {openGraph.article.tags?.map((tag) => (
                        <meta key={tag} property="article:tag" content={tag} />
                    ))}
                </>
            )}

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content={twitter?.cardType || 'summary_large_image'} />
            <meta name="twitter:site" content={twitter?.site || siteMetadata.twitterUsername} />
            <meta name="twitter:creator" content={twitter?.creator || siteMetadata.twitterUsername} />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={truncatedDescription} />
            <meta name="twitter:image" content={ogImage} />

            {/* Structured Data / JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(finalStructuredData)
                }}
            />

            {/* Additional Meta Tags */}
            {additionalMetaTags.map((tag, index) => (
                <meta
                    key={index}
                    {...(tag.name && { name: tag.name })}
                    {...(tag.property && { property: tag.property })}
                    content={tag.content}
                />
            ))}

            {/* Favicon */}
            <link rel="icon" href="/favicon.svg" />
            <link rel="apple-touch-icon" href="/favicon.svg" />

            {/* Additional Head Elements */}
            {children}
        </Head>
    );
}