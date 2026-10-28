import Image from 'next/image';
import { ArrowUpRight, Check, Plus, Globe, Monitor, GitBranch, Database, FileText, Copy, Sparkles } from 'lucide-react';

export function Laptop({ eager = false }: { eager?: boolean }) {
    return <Image src="/images/portfolio/laptop-air-subclip.webp" alt="Subclip AI editor on a MacBook Air" width={1536} height={1024} sizes="(max-width: 700px) 95vw, 65vw" loading="eager" fetchPriority={eager ? "high" : "auto"} className="laptop-asset" />;
}
export function HabitPhone() {
    return <div className="habit-phone" aria-hidden="true"><div className="phone-island" /><div className="phone-status"><span>9:41</span><span>● ▰</span></div><div className="phone-app"><div className="phone-app-top"><span className="habit-symbol">↗</span><Plus size={18} /></div><strong>Track Bad Habits</strong><span className="phone-today">Today</span><div className="habit-entry"><span className="habit-circle" /><div>Late-night scrolling<small>Trigger: boredom</small></div></div><span className="phone-log">Add a log <Plus size={13} /></span><div className="phone-calendar"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div className="phone-calendar dots">{Array.from({ length: 7 }, (_, i) => <span key={i} className={i === 3 ? 'today-dot' : ''} />)}</div></div><div className="phone-home" /></div>;
}
export function CaptionsPhone({ eager = false }: { eager?: boolean }) {
    return <Image className="captions-phone" src="/images/portfolio/subclip-captions-phone.webp" alt="Subclip mobile app with Bold Clean, Spotlight, Storyteller, and Authority caption styles" width={479} height={994} loading="eager" fetchPriority={eager ? 'high' : 'auto'} sizes="(max-width: 700px) 150px, 220px" />;
}
export function Inspector({ browser = 'Chrome' }: { browser?: 'Chrome' | 'Safari' }) {
    const chrome = browser === 'Chrome';
    return <div className={`inspector ${chrome ? 'chrome-inspector' : 'safari-inspector'}`} aria-hidden="true">
        <div className="window-dots"><i /><i /><i /><span>Rankizz</span></div>
        <div className="inspector-body">
            <div className="browser-name"><Image className="browser-logo" src={`/images/portfolio/${browser.toLowerCase()}-icon.webp`} alt="" width={40} height={40} />{browser} extension</div>
            <strong>{chrome ? 'Know every site.' : 'SEO, in Safari.'}</strong>
            {chrome ? <>
                <div className="domain-scores"><div className="domain-scores-heading"><span>Website</span><span>Ahrefs DA</span></div><div><span>example.com</span><b>42</b></div><div><span>example.org</span><b>68</b></div></div>
                <div className="traffic-heading"><span>Traffic Overview</span><b>↗</b></div>
                <svg className="inspector-chart" viewBox="0 0 240 55" fill="none"><path d="M2 48 28 30 57 37 85 12 112 21 139 7 164 16 193 3 214 8 238 1" stroke="#c47c32" strokeWidth="2" strokeLinecap="round" /></svg>
                <div className="backlink-summary"><span>Backlinks</span><b>1.2k</b></div><span className="inspector-demo">Example data</span>
            </> : <div className="inspector-rows">{['Title', 'Description', 'Headings'].map(label => <span key={label}><Check size={13} />{label}</span>)}</div>}
        </div>
    </div>;
}
export function MindMap() {
    return <div className="mindmap" aria-hidden="true"><svg viewBox="0 0 420 270" fill="none"><g stroke="#aaa" strokeWidth="1.3"><path d="M164 126 85 60M252 127 335 60M165 157 80 210M254 155 335 210M210 105V45M210 179v53" /><ellipse cx="210" cy="142" rx="62" ry="37" /></g><g fill="#333" fontFamily="Georgia,serif" fontStyle="italic" fontSize="19" textAnchor="middle"><text x="210" y="149">Ideas</text><text x="70" y="47">Learn</text><text x="345" y="47">Create</text><text x="62" y="236">Explore</text><text x="350" y="236">Build</text><text x="210" y="31">What if?</text><text x="210" y="259">Try</text></g></svg></div>;
}
export function Notebook({ eager = false }: { eager?: boolean }) {
    return <div className="notebook-scene"><Image src="/images/portfolio/notebook-v4.webp" alt="An open notebook with a pen: what I tried and what I learned" loading={eager ? "eager" : "lazy"} width={1290} height={1015} sizes="(max-width: 700px) 100vw, 55vw" /></div>;
}

const icons = { freescreenshot: Monitor, githubme: FileText, 'consistency-tracker': GitBranch, 'tweet-copier': Copy, onlinedb: Database, prosamik: Globe };
export function ProjectVisual({ slug, eager = false }: { slug: string; eager?: boolean }) {
    if (slug === 'subclip') return <div className="project-visual visual-laptop"><Laptop eager={eager} /></div>;
    if (slug === 'track-bad-habits') return <div className="project-visual visual-phone"><HabitPhone /></div>;
    if (slug === 'rankizz') return <div className="project-visual visual-inspector"><Inspector /></div>;
    if (slug === 'mapyourideas') return <div className="project-visual visual-mindmap"><MindMap /></div>;
    const Icon = icons[slug as keyof typeof icons] || Sparkles;
    return <div className="project-visual visual-object" aria-hidden="true"><div className={`app-object app-object-${slug}`}><Icon strokeWidth={1} size={78} /><ArrowUpRight className="app-corner" size={20} /></div></div>;
}
