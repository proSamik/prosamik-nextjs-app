'use client';

import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Post page: a reading-progress bar scrubbed to the article, and the pinned hero receding at different rates
// while the article slides over it, so the page feels like one continuous scroll. Transform/opacity only.
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
            // The hero is pinned with CSS sticky and the article slides over it, so the hero text recedes
            // (smaller, higher, fainter) at different rates while the article rises: relative motion.
            const hero = document.querySelector<HTMLElement>('.blog-hero');
            const layers = document.querySelectorAll<HTMLElement>('.blog-hero > :not(.agent-card)');
            layers.forEach((layer, index) => {
                gsap.to(layer, {
                    y: -(10 + index * 12), scale: 0.94 - index * 0.01, opacity: 0.12 + index * 0.06, ease: 'none', transformOrigin: '50% 0%',
                    scrollTrigger: { start: 0, end: () => Math.max(320, (hero?.offsetHeight ?? 520) * 0.9), scrub: 0.6, invalidateOnRefresh: true },
                });
            });
        });
        return () => mm.revert();
    }, [articleId]);
    return <div ref={bar} className="blog-progress" aria-hidden="true" />;
}
