import type { ReactNode } from 'react';
import HeroFlipArt from './HeroFlipArt';
import HeroGlow from './HeroGlow';

// Hero: on wide screens heading, buttons and image sit together in one framed card (see hero-art.css);
// on phones they simply stack.
export default function DeviceStory({ intro }: { intro: ReactNode }) {
    return <div className="device-story">
        <HeroGlow className="hero-glow-wall" />
        <section className="hero-section page-width">
            <div className="hero-frame">
                <HeroGlow className="hero-glow-card" />
                <div className="hero-copy">{intro}</div>
                <div className="hero-art-wrap"><HeroFlipArt /></div>
            </div>
        </section>
    </div>;
}
