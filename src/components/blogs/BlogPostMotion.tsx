'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Post page: a reading-progress bar scrubbed to the article, and the hero text layers drifting up at slightly
// different speeds as you start reading, so the page feels like one continuous scroll. Transform/opacity only.
export default function BlogPostMotion({ articleId }: { articleId: string }) {
    const bar = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            const article = document.getElementById(articleId);
            if (bar.current && article) {
                gsap.fromTo(bar.current, { scaleX: 0 }, {
                    scaleX: 1, ease: 'none',
                    scrollTrigger: { trigger: article, start: 'top 30%', end: 'bottom 70%', scrub: true },
                });
            }
            const layers = document.querySelectorAll<HTMLElement>('.blog-hero > :not(.agent-card)');
            layers.forEach((layer, index) => {
                gsap.to(layer, {
                    y: -(26 + index * 14), opacity: index === 0 ? 0.2 : 0.45, ease: 'none',
                    scrollTrigger: { trigger: '.blog-hero', start: 'top 8%', end: 'bottom 5%', scrub: 0.6 },
                });
            });
        });
        return () => mm.revert();
    }, [articleId]);
    return <div ref={bar} className="blog-progress" aria-hidden="true" />;
}
