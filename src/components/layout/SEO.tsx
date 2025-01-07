import Head from 'next/head';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { useRouter } from 'next/router';
import { siteMetadata } from '@/utils/siteMetadata';

export interface SEOProps {
    // Required props
    title: string;
    description: string;

    // Optional props with metadata enhancements
    keywords?: string;
    ogImage?: string;
    ogImageWidth?: number;
    ogImageHeight?: number;
    ogImageAlt?: string;
    ogImageType?: string;
    ogImageSecureUrl?: string;
    noindex?: boolean;
    children?: React.ReactNode;
    canonicalUrl?: string;
    structuredData?: object | object[]; // For custom JSON-LD data
    alternateUrls?: {
        [key: string]: string; // language code -> URL mapping
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
            title?: string;
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
        imageAlt?: string;
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
                                ogImageWidth = siteMetadata.ogImageWidth,
                                ogImageHeight = siteMetadata.ogImageHeight,
                                ogImageAlt = siteMetadata.ogImageAlt,
                                ogImageType = siteMetadata.ogImageType,
                                ogImageSecureUrl = siteMetadata.ogImageSecureUrl,
                                keywords = siteMetadata.skills.join(', '),
                                noindex = false,
                                children,
                                canonicalUrl,
                                structuredData,
                                alternateUrls,
                                openGraph,
                                twitter,
                                additionalMetaTags = [],
                            }: SEOProps) {
    const router = useRouter();

    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

    // Define theme color based on current theme
    const themeColor = useMemo(() => {
        return currentTheme === 'dark' ? '#000000' : '#ffffff';
    }, [currentTheme]);

    const handleThemeChange = useCallback((event: CustomEvent<{theme: 'light' | 'dark'}>) => {
        setCurrentTheme(event.detail.theme);
    }, []);

    useEffect(() => {
        window.addEventListener('themeChange', handleThemeChange as EventListener);

        return () => {
            window.removeEventListener('themeChange', handleThemeChange as EventListener);
        };
    }, [handleThemeChange]);

    // Process title and description
    const finalTitle = title === siteMetadata.title ? title : `${title}`;
    const truncatedDescription =
        description.length > MAX_DESCRIPTION_LENGTH
            ? `${description.slice(0, MAX_DESCRIPTION_LENGTH - 3)}...`
            : description;

    // Generate canonical URL (exclude query params and hash fragments)
    const cleanPath = router.asPath.split(/[?#]/)[0]; // Remove query params and hash fragments
    const pageCanonicalUrl = canonicalUrl || `${siteMetadata.siteUrl}${cleanPath}`;

    // Combine default and custom structured data
    const finalStructuredData = useMemo(() => {
        const defaultStructuredData = {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: siteMetadata.creator,
            url: siteMetadata.siteUrl,
            jobTitle: siteMetadata.jobTitle,
            knowsAbout: siteMetadata.skills,
            alumniOf: siteMetadata.alumniOf,
            sameAs: siteMetadata.socialProfiles,
        };
        return structuredData || defaultStructuredData;
    }, [structuredData]);

    const isClient = typeof window !== 'undefined';

    return (
        <Head>
            {/* Base Meta Tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={truncatedDescription}/>
            <meta charSet="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>

            {/* Robots Meta Tags */}
            <meta
                name="robots"
                content={noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'}
            />

            {/* Canonical and Alternate URLs */}
            <link rel="canonical" href={pageCanonicalUrl}/>
            {alternateUrls &&
                Object.entries(alternateUrls).map(([lang, url]) => (
                    <link key={lang} rel="alternate" hrefLang={lang} href={url}/>
                ))}

            {/* Author and Keywords */}
            <meta name="author" content={siteMetadata.creator}/>
            <meta name="keywords" content={keywords}/>

            { isClient && (

                <>
                    {/* Open Graph Tags */}
                    <meta property="og:type" content={openGraph?.type || 'website'}/>
                    <meta property="og:site_name" content={openGraph?.siteName || siteMetadata.title}/>
                    <meta property="og:title" content={finalTitle}/>
                    <meta property="og:description" content={truncatedDescription}/>
                    <meta property="og:image" content={ogImage}/>
                    <meta property="og:image:width" content={ogImageWidth.toString()}/>
                    <meta property="og:image:height" content={ogImageHeight.toString()}/>
                    <meta property="og:image:alt" content={ogImageAlt}/>
                    <meta property="og:image:type" content={ogImageType}/>
                    <meta property="og:image:secure_url" content={ogImageSecureUrl}/>
                    <meta property="og:url" content={pageCanonicalUrl}/>
                    <meta property="og:locale" content={openGraph?.locale || 'en_US'}/>

                    {/* Additional Open Graph Profile Tags */}
                    {openGraph?.profile && (
                        <>
                            {openGraph.profile.firstName &&
                                <meta property="profile:first_name" content={openGraph.profile.firstName}/>}
                            {openGraph.profile.lastName &&
                                <meta property="profile:last_name" content={openGraph.profile.lastName}/>}
                            {openGraph.profile.username &&
                                <meta property="profile:username" content={openGraph.profile.username}/>}
                            {openGraph.profile.gender && <meta property="profile:gender" content={openGraph.profile.gender}/>}
                        </>
                    )}

                    {/* Article-specific Open Graph Tags */}
                    {openGraph?.article && (
                        <>
                            {openGraph.article.publishedTime && (
                                <meta property="article:published_time" content={openGraph.article.publishedTime}/>
                            )}
                            {openGraph.article.modifiedTime && (
                                <meta property="article:modified_time" content={openGraph.article.modifiedTime}/>
                            )}
                            {openGraph.article.authors?.map((author) => (
                                <meta key={author} property="article:author" content={author}/>
                            ))}
                            {openGraph.article.tags?.map((tag) => (
                                <meta key={tag} property="article:tag" content={tag}/>
                            ))}
                        </>
                    )}

                    {/* Twitter Card Tags */}
                    <meta name="twitter:card" content={twitter?.cardType || 'summary_large_image'}/>
                    <meta name="twitter:site" content={twitter?.site || siteMetadata.twitterUsername}/>
                    <meta name="twitter:creator" content={twitter?.creator || siteMetadata.twitterUsername}/>
                    <meta name="twitter:title" content={finalTitle}/>
                    <meta name="twitter:description" content={truncatedDescription}/>
                    <meta name="twitter:image" content={ogImage}/>
                    <meta name="twitter:image:alt" content={twitter?.imageAlt || ogImageAlt}/>
                </>
            )}


            {/* Structured Data / JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(finalStructuredData),
                }}
            />

            {/* Additional Meta Tags */}
            {additionalMetaTags.map((tag) => (
                <meta
                    key={tag.name || tag.property}
                    {...(tag.name && {name: tag.name})}
                    {...(tag.property && {property: tag.property})}
                    content={tag.content}
                />
            ))}

            {/* Theme Color */}
            <meta name="theme-color" content={themeColor}/>

            <meta name="apple-mobile-web-app-title" content="proSamik"/>

            {/* Favicon */}
            <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>
            <link rel="icon" type="image/png" sizes="32x32" href="/icon.png"/>
            <link rel="icon" type="image/x-icon" href="/favicon.ico"/>
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png"/>
            <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-icon.png"/>

            <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5"/>

            <meta name="mobile-web-app-capable" content="yes"/>
            <meta name="apple-mobile-web-app-status-bar-style" content="black"/>

            {/* Additional Head Elements */}
            {children}
        </Head>
    );
}