import ContentPage from '@/components/ContentPage';
import SEO from "@/components/layout/SEO";
import {siteMetadata} from "@/utils/siteMetadata";
import React from "react";

export default function Projects() {
    return (
        <>
                {/* Include the SEO component */}
                <SEO
                    title="Top Projects" // Page title
                    description="Explore the latest projects on implementation that will make you ship your product faster" // Page description
                    ogImage={siteMetadata.defaultImage} // Default Open Graph image
                    keywords={'prosamik, projects, products, golang, nextjs, css, basic, easy implementation'}
                    openGraph={{
                        type: 'website',
                        siteName: siteMetadata.title,
                        locale: 'en_US',
                    }}
                    twitter={{
                        cardType: 'summary_large_image',
                        site: siteMetadata.twitterUsername,
                        creator: siteMetadata.twitterUsername,
                        imageAlt: 'Projects | proSamik',
                    }}
                />
            <ContentPage type="project" />
        </>
        );
}