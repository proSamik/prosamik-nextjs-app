'use client';

import gsap from 'gsap';
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
            const cards = gsap.utils.toArray<HTMLElement>('[data-thought-stack-card]', container);
            const media = gsap.matchMedia();

            media.add('(prefers-reduced-motion: no-preference)', () => {
                cards.slice(0, -1).forEach((card, index) => {
                    gsap.to(card, {
                        scale: 0.965,
                        y: -10,
                        opacity: 0.72,
                        filter: 'brightness(0.96)',
                        transformOrigin: 'top center',
                        ease: 'none',
                        scrollTrigger: {
                            trigger: cards[index + 1],
                            start: 'top 92%',
                            end: 'top 14%',
                            scrub: 0.35,
                            invalidateOnRefresh: true,
                        },
                    });
                });
            });

            let refreshFrame = 0;
            const resizeObserver = new ResizeObserver(() => {
                cancelAnimationFrame(refreshFrame);
                refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
            });
            resizeObserver.observe(container);

            return () => {
                cancelAnimationFrame(refreshFrame);
                resizeObserver.disconnect();
                media.revert();
            };
        }, container);

        return () => context.revert();
    }, [thoughts]);

    return (
        <div ref={containerRef}>
            {thoughts.map((thought, index) => {
                const isLast = index === thoughts.length - 1;

                return (
                    <section
                        key={thought.id}
                        className={`relative ${isLast ? '' : 'min-h-[88svh] pb-[12svh]'}`}
                        style={{ zIndex: index + 1 }}
                    >
                        <div
                            data-thought-stack-card
                            className={`${isLast ? '' : 'sticky top-[clamp(1rem,8vh,5rem)]'} will-change-transform`}
                        >
                            <div className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_14px_45px_rgba(28,25,23,0.06)]">
                                <RandomThoughtCard thought={thought} />
                            </div>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
