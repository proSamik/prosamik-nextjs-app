import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowUp } from 'lucide-react';
import { portfolioAsset, portfolioSocials } from '@/utils/portfolio';
import EmailLink from './EmailLink';

export default function Footer() {
    return (
        <footer className="portfolio-footer page-width">
            <div className="footer-top">
                <div className="footer-contact"><h2>Keep<br />in touch.</h2><EmailLink /></div>
                <nav aria-label="Footer navigation"><span>Explore</span><Link href="/projects">Work</Link><Link href="/blogs">Blogs</Link><Link href="/about">Journey</Link><Link href="/consistency">Efforts</Link></nav>
                <nav aria-label="Social profiles"><span>Find me</span>{portfolioSocials.map(s => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">{s.label}<ArrowUpRight size={14} /></a>)}</nav>
            </div>
            <div className="footer-bottom"><a href="#top">Back to top <ArrowUp size={14} /></a></div>
            <Image className="footer-peek" src={portfolioAsset('site/footer-peek-20261118.jpg')} alt="" width={1280} height={480} loading="eager" sizes="(max-width: 700px) 80vw, 520px" />
        </footer>
    );
}
