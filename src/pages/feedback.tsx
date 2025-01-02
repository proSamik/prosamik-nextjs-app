// pages/feedback.tsx
import React from 'react';
import FeedbackForm from '@/components/layout/FeedbackForm';
import SEO from "@/components/layout/SEO";
import { siteMetadata } from "@/utils/siteMetadata";

export default function Feedback() {
    return (
        <>
            <SEO
                title="Roast Me"
                description="Roast me or contact me by giving feedback so that this site can be improved"
                ogImage={siteMetadata.defaultImage}
                keywords={'feedback, prosamik, roast, contact'}
                openGraph={{
                    type: 'website',
                    siteName: siteMetadata.title,
                    locale: 'en_US',
                }}
                twitter={{
                    cardType: 'summary_large_image',
                    site: siteMetadata.twitterUsername,
                    creator: siteMetadata.twitterUsername,
                    imageAlt: 'Feedback | proSamik',
                }}
            />

            <div className="mx-auto w-full justify-center mt-5 px-3 py-5">
                <div className="flex justify-center items-center mb-10">
                    <h1 className="text-3xl font-serif text-center">Feedback Form</h1>
                </div>

                <FeedbackForm />
            </div>
        </>
    );
}