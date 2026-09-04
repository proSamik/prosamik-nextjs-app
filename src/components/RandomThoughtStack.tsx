'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import RandomThoughtCard from '@/components/RandomThoughtCard';
import type { RandomThought } from '@/lib/random-thoughts';

type RandomThoughtStackProps = {
    thoughts: RandomThought[];
};

export default function RandomThoughtStack({ thoughts }: RandomThoughtStackProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container || thoughts.length < 2) return;

        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            const panels = Array.from(
                container.querySelectorAll<HTMLElement>(':scope > [data-gsap-stack-panel]'),
            );

            panels.slice(0, -1).forEach((panel, index) => {
                gsap.to(panel, {
                    scale: 0.95,
                    transformOrigin: 'center top',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: panels[index + 1],
                        start: 'top bottom',
                        end: 'top top',
                        scrub: 0.55,
                        invalidateOnRefresh: true,
                    },
                });
            });
        }, container);

        let frameId = 0;
        let active = true;
        const refresh = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => ScrollTrigger.refresh());
        };
        const resizeObserver = new ResizeObserver(refresh);
        resizeObserver.observe(container);
        window.addEventListener('load', refresh);
        void document.fonts.ready.then(() => {
            if (active) refresh();
        });
        refresh();

        return () => {
            active = false;
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            window.removeEventListener('load', refresh);
            context.revert();
        };
    }, [thoughts]);

    return (
        <div ref={containerRef} className="relative isolate">
            {thoughts.map((thought, index) => (
                <section
                    key={thought.id}
                    data-gsap-stack-panel
                    className="sticky top-0 bg-white pb-5 sm:pb-6"
                    style={{ zIndex: (index + 1) * 10 }}
                >
                    <div className="w-full will-change-transform">
                        <div className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_14px_45px_rgba(28,25,23,0.06)]">
                            <RandomThoughtCard thought={thought} />
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
