'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import RandomThoughtCard from '@/components/RandomThoughtCard';
import type { RandomThought } from '@/lib/random-thoughts';

type RandomThoughtStackProps = {
    thoughts: RandomThought[];
    timeline?: boolean;
};

export default function RandomThoughtStack({ thoughts, timeline = false }: RandomThoughtStackProps) {
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
                const card = panel.querySelector<HTMLElement>('[data-gsap-stack-card]') ?? panel;
                const transition = gsap.timeline({
                    scrollTrigger: {
                        trigger: panels[index + 1],
                        start: 'top bottom',
                        end: 'top top',
                        scrub: 0.55,
                        invalidateOnRefresh: true,
                    },
                });

                transition.to(card, {
                    scale: 0.95,
                    transformOrigin: 'center top',
                    ease: 'none',
                }, 0);

                if (timeline) {
                    const currentMarker = panel.querySelector<HTMLElement>('[data-timeline-marker]');
                    const nextMarker = panels[index + 1].querySelector<HTMLElement>('[data-timeline-marker]');

                    if (currentMarker) {
                        transition.fromTo(currentMarker, {
                            backgroundColor: '#0c0a09',
                            borderColor: '#0c0a09',
                            scale: 1,
                        }, {
                            backgroundColor: '#ffffff',
                            borderColor: '#a8a29e',
                            scale: 0.82,
                            ease: 'none',
                            immediateRender: false,
                        }, 0);
                    }

                    if (nextMarker) {
                        transition.fromTo(nextMarker, {
                            backgroundColor: '#ffffff',
                            borderColor: '#a8a29e',
                            scale: 0.82,
                        }, {
                            backgroundColor: '#0c0a09',
                            borderColor: '#0c0a09',
                            scale: 1,
                            ease: 'none',
                            immediateRender: false,
                        }, 0);
                    }
                }
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
    }, [thoughts, timeline]);

    return (
        <div ref={containerRef} className="relative isolate">
            {timeline && thoughts.length > 1 ? (
                <span
                    aria-hidden="true"
                    className="absolute bottom-8 left-[11px] top-8 w-0.5 bg-gradient-to-b from-stone-950 via-stone-400 to-stone-200 sm:left-[15px]"
                />
            ) : null}

            {thoughts.map((thought, index) => (
                <section
                    key={thought.id}
                    data-gsap-stack-panel
                    className="sticky top-0 pb-5 sm:pb-6"
                    style={{ zIndex: (index + 1) * 10 }}
                >
                    <div className={timeline && thoughts.length > 1 ? 'relative pl-8 sm:pl-11' : undefined}>
                        {timeline && thoughts.length > 1 ? (
                            <span
                                data-timeline-marker
                                aria-hidden="true"
                                className={`absolute left-1 top-8 z-10 h-4 w-4 rounded-full border-2 ring-4 ring-white sm:left-2 ${
                                    index === 0
                                        ? 'border-stone-950 bg-stone-950'
                                        : 'border-stone-400 bg-white'
                                }`}
                            />
                        ) : null}

                        <div data-gsap-stack-card className="w-full will-change-transform">
                            <div className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_14px_45px_rgba(28,25,23,0.06)]">
                                <RandomThoughtCard thought={thought} showQuotedPreview={!timeline} />
                            </div>
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
