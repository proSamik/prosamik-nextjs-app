'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HabitPhone, Inspector, Laptop, MindMap } from './Visuals';

export default function DeviceStory({ intro, capabilities }: { intro: ReactNode; capabilities: ReactNode }) {
    const root = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        media.add({ desktop: '(min-width: 1000px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
            if (context.conditions?.reduced) return;
            const scope = root.current;
            if (!scope) return;
            gsap.from(scope.querySelectorAll('[data-device]'), { y: 26, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'power2.out' });
            if (!context.conditions?.desktop) return;
            const timeline = gsap.timeline({ scrollTrigger: { trigger: scope, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true } });
            timeline.to(scope.querySelector('.scene-laptop'), { xPercent: -5, yPercent: -9, scale: 0.91, ease: 'none' }, 0)
                .to(scope.querySelector('.scene-phone'), { xPercent: 9, yPercent: -10, rotation: 5, ease: 'none' }, 0)
                .to(scope.querySelector('.scene-chrome'), { xPercent: -10, yPercent: -32, rotation: -4, ease: 'none' }, 0)
                .to(scope.querySelector('.scene-safari'), { xPercent: 18, yPercent: 7, rotation: 3, ease: 'none' }, 0)
                .to(scope.querySelector('.scene-mindmap'), { yPercent: 10, rotation: -3, ease: 'none' }, 0);
        }, root);
        let active = true;
        const refresh = () => { if (active) ScrollTrigger.refresh(); };
        window.addEventListener('load', refresh);
        void document.fonts.ready.then(refresh);
        return () => { active = false; window.removeEventListener('load', refresh); media.revert(); };
    }, []);
    return <div className="device-story" ref={root}>
        <section className="hero-section page-width"><div className="hero-copy">{intro}</div></section>
        <div className="scene-track" aria-hidden="true"><div className="scene-sticky"><div className="device-scene">
            <div className="scene-laptop" data-device><Laptop eager /></div>
            <div className="scene-phone" data-device><HabitPhone /></div>
            <div className="scene-chrome" data-device><Inspector /></div>
            <div className="scene-safari" data-device><Inspector browser="Safari" compact /></div>
            <div className="scene-mindmap" data-device><MindMap /></div>
        </div></div></div>
        <section className="capabilities-section page-width"><div className="capabilities-copy">{capabilities}</div></section>
    </div>;
}
