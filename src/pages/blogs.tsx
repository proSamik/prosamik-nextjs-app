import React from 'react';
import SEO from '@/components/layout/SEO'; // Import the SEO component
import ContentPage from '@/components/ContentPage';
import { siteMetadata } from '@/utils/siteMetadata'; // Import siteMetadata

export default function Blogs() {
    return (
        <>
            {/* Include the SEO component */}
            <SEO
                title="Latest Blogs" // Page title
                description="Explore the latest blogs on product development, DevOps, and more." // Page description
                ogImage={siteMetadata.defaultImage} // Default Open Graph image
                keywords={'prosamik, blogs, products, golang, nextjs, css, basic, easy implementation, product hacks'}
                openGraph={{
                    type: 'website', // Use 'website' for the blogs page
                    siteName: siteMetadata.title,
                    locale: 'en_US',
                }}
                twitter={{
                    cardType: 'summary_large_image',
                    site: siteMetadata.twitterUsername,
                    creator: siteMetadata.twitterUsername,
                    imageAlt: 'Blogs | proSamik',
                }}
            />

            {/* Render the ContentPage component */}
            <ContentPage type="blog" />
        </>
    );
}