'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { portfolioLinks } from '@/utils/portfolio';

const links = [{ href: '/projects', label: 'Work' }, { href: '/about', label: 'Journey' }, { href: '/random-thoughts', label: 'Notes' }];
export default function Navigation() {
    const pathname = usePathname();
    const [openPath, setOpenPath] = useState<string | null>(null);
    const open = openPath === pathname;
    const toggle = useRef<HTMLButtonElement>(null);
    const header = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return;
        const dismiss = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpenPath(null); toggle.current?.focus(); } };
        const outside = (e: PointerEvent) => { if (!header.current?.contains(e.target as Node)) setOpenPath(null); };
        document.addEventListener('keydown', dismiss);
        document.addEventListener('pointerdown', outside);
        return () => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', outside); };
    }, [open]);
    return (
        <header className="site-header" ref={header}>
            <div className="site-header-inner">
                <Link className="site-wordmark" href="/" aria-label="prosamik home" onClick={() => setOpenPath(null)}><Image src="/icon.png" alt="" width={38} height={38} /><span>prosamik</span></Link>
                <nav id="primary-navigation" className={`site-navigation ${open ? 'is-open' : ''}`} aria-label="Main navigation">
                    {links.map(({ href, label }) => {
                        const active = href === '/about' ? pathname === href || pathname.startsWith('/milestone/') : href === '/random-thoughts' ? pathname.startsWith(href) || pathname.startsWith('/t/') : pathname.startsWith(href);
                        return <Link key={href} href={href} aria-current={active ? 'page' : undefined} onClick={() => setOpenPath(null)}>{label}</Link>;
                    })}
                    <a className="nav-community" href={portfolioLinks.community} target="_blank" rel="noopener noreferrer">Zero to One <ArrowUpRight size={15} /></a>
                    <a className="nav-mobile-call" href={portfolioLinks.booking} target="_blank" rel="noopener noreferrer">Book a call <ArrowUpRight size={16} /></a>
                </nav>
                <a className="nav-call" href={portfolioLinks.booking} target="_blank" rel="noopener noreferrer">Book a call <ArrowUpRight size={16} /></a>
                <button ref={toggle} className="nav-toggle" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpenPath(open ? null : pathname)}>{open ? <X size={25} /> : <Menu size={25} />}</button>
            </div>
        </header>
    );
}
