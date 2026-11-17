'use client';

import { useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Continuous scroll motion for /blogs. Everything is scrubbed to the scroll position (no on/off toggles), and
// only transform and opacity are animated, so it stays on the compositor:
//  - the title is pinned with CSS sticky; as the list slides over it, it recedes (smaller, higher, fainter);
//  - category headings, rows and row descriptions move at slightly different speeds (relative motion).
// Without JavaScript or with reduced motion the page is just a normal static list.
export default function BlogsIndexMotion() {
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', () => {
            const root = document.querySelector<HTMLElement>('[data-blogs-root]');
            const body = root?.querySelector<HTMLElement>('[data-blogs-body]');
            if (!root || !body) return;
            const title = root.querySelector('[data-blogs-head] h1');
            const subtitle = root.querySelector('[data-blogs-head] p');

            if (title) {
                gsap.to(title, {
                    scale: 0.78, yPercent: -8, opacity: 0.12, ease: 'none', transformOrigin: '0% 50%',
                    scrollTrigger: { start: 0, end: 540, scrub: 0.6 },
                });
            }
            if (subtitle) {
                gsap.to(subtitle, {
                    y: -28, opacity: 0, ease: 'none',
                    scrollTrigger: { start: 0, end: 300, scrub: 0.6 },
                });
            }
            root.querySelectorAll<HTMLElement>('.blog-group').forEach((group) => {
                const heading = group.querySelector('h2');
                if (heading) {
                    gsap.from(heading, {
                        x: -28, opacity: 0, ease: 'none',
                        scrollTrigger: { trigger: group, start: 'top 94%', end: 'top 72%', scrub: 0.5 },
                    });
                }
                group.querySelectorAll<HTMLElement>('li').forEach((row) => {
                    gsap.from(row, {
                        y: 46, opacity: 0, ease: 'none',
                        scrollTrigger: { trigger: row, start: 'top 98%', end: 'top 80%', scrub: 0.5 },
                    });
                    const description = row.querySelector('.blog-row-desc');
                    if (description) {
                        gsap.fromTo(description, { y: 12 }, {
                            y: -12, ease: 'none',
                            scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true },
                        });
                    }
                });
            });
            // Fonts and layout settle after hydration; recompute trigger positions once they have.
            void document.fonts?.ready.then(() => ScrollTrigger.refresh());
        });
        return () => mm.revert();
    }, []);
    return null;
}
