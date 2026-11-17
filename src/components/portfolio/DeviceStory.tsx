import type { ReactNode } from 'react';
import HeroFlipArt from './HeroFlipArt';

// Hero: heading + image side by side on wide screens (see hero-art.css), stacked on phones.
export default function DeviceStory({ intro }: { intro: ReactNode }) {
    return <div className="device-story">
        <section className="hero-section page-width">
            <div className="hero-copy">{intro}</div>
            <div className="hero-art-wrap"><HeroFlipArt /></div>
        </section>
    </div>;
}
