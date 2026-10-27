import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Mic, Video, Phone } from 'lucide-react';
import DeviceStory from './DeviceStory';
import SelectedWork from './SelectedWork';
import Reveal from './Reveal';
import SkoolText from './SkoolText';
import { Notebook } from './Visuals';
import { portfolioLinks } from '@/utils/portfolio';

export default function HomePage() {
    return <>
        <DeviceStory intro={<>
            <h1>Ideas don’t<br />ship themselves.</h1>
            <p className="hero-description">I make apps, extensions,<br className="desktop-break" /> and room for new ideas.</p>
            <div className="hero-actions"><a className="button button-primary" href={portfolioLinks.booking} target="_blank" rel="noopener noreferrer">Book a call <ArrowUpRight size={18} /></a><div><a className="button button-secondary" href={portfolioLinks.community} target="_blank" rel="noopener noreferrer">Join Zero to One <ArrowUpRight size={18} /></a><span className="button-caption">Beginner community on <SkoolText /></span></div></div>
            <div className="hero-platforms">Web <span>·</span> macOS <span>·</span> iOS <span>·</span> Chrome <span>·</span> Safari</div>
            <a className="scroll-cue" href="#capabilities">Scroll to explore <ArrowDown size={16} /></a>
        </>} capabilities={<>
            <h2 id="capabilities">One idea.<br />Many surfaces.</h2>
            <p>Web, Mac, iPhone —<br />and the browser.</p>
            <div className="capability-list"><span>Web apps</span><span>macOS & iOS</span><span>Chrome & Safari</span></div>
            <Link className="text-link" href="/projects">Explore the projects <ArrowUpRight size={19} /></Link>
        </>} />
        <Reveal><SelectedWork /></Reveal>
        <section className="journey-section page-width" aria-labelledby="journey-heading"><Reveal className="section-split"><div className="section-copy"><h2 id="journey-heading">Still figuring<br />it out.</h2><p className="section-description">What I tried. What worked.<br />What didn’t.</p><div className="mini-timeline"><div><strong>2020</strong><span>Started engineering</span></div><div><strong>2024</strong><span>Went independent</span></div><div><strong>Now</strong><span>Making the next thing</span></div></div><Link href="/about" className="text-link">Read my journey <ArrowUpRight size={19} /></Link></div><Notebook /></Reveal></section>
        <section className="community-section page-width" id="community" aria-labelledby="community-heading"><Reveal className="section-split"><div className="section-copy"><h2 id="community-heading">Start with<br />one idea.</h2><p className="section-description">Zero to One. A community<br />for first-time beginners.</p><a className="button button-primary" href={portfolioLinks.community} target="_blank" rel="noopener noreferrer">Join Zero to One <ArrowUpRight size={18} /></a><span className="under-button">On <SkoolText /></span></div><Image className="community-art" src="/images/portfolio/community.webp" alt="A white zero and one with a sheet of beginner questions between them" width={1536} height={1024} sizes="(max-width: 700px) 100vw, 60vw" /></Reveal></section>
        <section className="consultancy-section page-width" id="consultancy" aria-labelledby="consultancy-heading"><Reveal className="section-split"><div className="section-copy"><h2 id="consultancy-heading">Let’s think<br />it through.</h2><p className="section-description">An idea, a product,<br />or a question.</p><a className="button button-primary" href={portfolioLinks.booking} target="_blank" rel="noopener noreferrer">Book a call <ArrowUpRight size={18} /></a><p className="call-note">Talk with Samik.</p></div><div className="call-portrait"><Image src="/me-here.jpg" alt="Samik Choudhury" width={800} height={900} sizes="(max-width: 700px) 90vw, 42vw" /><span className="call-name">Samik</span><div className="call-controls" aria-hidden="true"><span><Mic size={20} /></span><span><Video size={20} /></span><span className="call-end"><Phone size={20} /></span></div></div></Reveal></section>
    </>;
}
