'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';

export default function DeviceStory({ intro }: { intro: ReactNode }) {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const media = gsap.matchMedia();
        media.add({ reduced: '(prefers-reduced-motion: reduce)' }, context => {
            if (context.conditions?.reduced) return;
            const scope = root.current;
            if (!scope) return;
            gsap.from(scope.querySelectorAll('[data-device]'), { y: 26, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'power2.out' });
        }, root);
        return () => media.revert();
    }, []);
    return <div className="device-story" ref={root}>
        <section className="hero-section page-width"><div className="hero-copy">{intro}</div></section>
        <div className="scene-track"><div className="scene-sticky"><div className="device-scene">
            <Image className="scene-devices" data-device src="/images/portfolio/hero-devices-v3.webp" alt="Subclip editor on a MacBook Air, the Subclip caption styles on an iPhone, and the Rankizz Chrome and Safari extensions" width={1536} height={1024} sizes="(max-width: 700px) 100vw, 75vw" loading="eager" fetchPriority="high" />
        </div></div></div>
    </div>;
}
