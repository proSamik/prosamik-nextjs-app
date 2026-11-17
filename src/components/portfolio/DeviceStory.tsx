import type { ReactNode } from 'react';
import HeroFlipArt from './HeroFlipArt';

// Hero: on wide screens heading, buttons and image sit together in one framed card (see hero-art.css);
// on phones they simply stack.
export default function DeviceStory({ intro }: { intro: ReactNode }) {
    return <div className="device-story">
        <section className="hero-section page-width">
            <div className="hero-frame">
                <div className="hero-copy">{intro}</div>
                <div className="hero-art-wrap"><HeroFlipArt /></div>
            </div>
        </section>
    </div>;
}
