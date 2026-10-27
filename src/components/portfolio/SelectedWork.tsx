'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { ProjectVisual } from './Visuals';
const featured = [
    { slug: 'rankizz', title: 'Rankizz', description: 'Search, made clearer.' },
    { slug: 'subclip', title: 'Subclip', description: 'Video tools for creators.' },
    { slug: 'track-bad-habits', title: 'Track Bad Habits', description: 'Notice the patterns.' },
];
export default function SelectedWork() {
    const gallery = useRef<HTMLDivElement>(null);
    const move = (direction: number) => gallery.current?.scrollBy({ left: direction * gallery.current.clientWidth * 0.86, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    return <section className="selected-work page-width" id="work" aria-labelledby="selected-work-heading">
        <div className="section-heading"><h2 id="selected-work-heading">A few things<br />I’ve made.</h2><Link className="text-link" href="/projects">All projects <ArrowUpRight size={19} /></Link></div>
        <div className="work-gallery" ref={gallery} aria-label="Selected projects" tabIndex={0}>
            {featured.map(item => <Link key={item.slug} href={`/projects/${item.slug}`} className={`work-exhibit exhibit-${item.slug}`}><ProjectVisual slug={item.slug} /><h3>{item.title}<ArrowUpRight size={19} /></h3><p>{item.description}</p><span className="exhibit-link">Read the story <ArrowUpRight size={16} /></span></Link>)}
        </div>
        <div className="gallery-controls"><span>Drag or swipe to explore</span><button type="button" aria-label="Previous project" onClick={() => move(-1)}><ArrowLeft size={19} /></button><button type="button" aria-label="Next project" onClick={() => move(1)}><ArrowRight size={19} /></button></div>
    </section>;
}
