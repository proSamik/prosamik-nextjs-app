'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.from(root.current, { y: 32, opacity: 0, duration: 0.75, ease: 'power2.out', scrollTrigger: { trigger: root.current, start: 'top 95%', once: true } });
        }, root);
        return () => media.revert();
    }, []);
    return <div className={className} ref={root}>{children}</div>;
}
