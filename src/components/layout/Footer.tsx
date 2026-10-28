import Link from 'next/link';
import { ArrowUpRight, ArrowUp } from 'lucide-react';
import { portfolioSocials } from '@/utils/portfolio';

export default function Footer() {
    return (
        <footer className="portfolio-footer page-width">
            <div className="footer-top">
                <h2>Keep<br />in touch.</h2>
                <nav aria-label="Footer navigation"><span>Explore</span><Link href="/projects">Work</Link><Link href="/about">Journey</Link><Link href="/consistency">Efforts</Link></nav>
                <nav aria-label="Social profiles"><span>Find me</span>{portfolioSocials.map(s => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}<ArrowUpRight size={14} /></a>)}</nav>
            </div>
            <div className="footer-bottom"><a href="#top">Back to top <ArrowUp size={14} /></a></div>
        </footer>
    );
}
