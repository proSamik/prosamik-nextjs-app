import type { Metadata } from 'next';
import Link from 'next/link';
import { Caveat } from 'next/font/google';
import { ArrowUpRight } from 'lucide-react';

const hand = Caveat({ subsets: ['latin'], weight: ['700'], variable: '--font-hand', display: 'swap' });

export const metadata: Metadata = {
    title: 'Page not found',
    robots: { index: false, follow: true },
};

const suggestions = [
    { href: '/blogs', label: 'Blogs', note: 'Guides on self-hosting, MCP servers, SEO and shipping apps' },
    { href: '/projects', label: 'Work', note: 'What I have built and launched' },
    { href: '/about', label: 'Journey', note: 'How it got here, one chapter at a time' },
    { href: '/consistency', label: 'Efforts', note: 'The daily streaks behind it' },
];

export default function NotFound() {
    return (
        <section className={`not-found page-width ${hand.variable}`} aria-labelledby="not-found-title">
            <p className="not-found-code" aria-hidden="true">404</p>
            <div className="not-found-copy">
                <h1 id="not-found-title">This page<br />wandered <span className="not-found-hand">off.</span></h1>
                <p>The link may be old, mistyped or moved. Head back home, or pick up from one of these.</p>
                <div className="not-found-actions">
                    <Link className="button button-primary" href="/">Back to home <ArrowUpRight size={18} /></Link>
                    <Link className="button button-secondary" href="/blogs">Read the blogs</Link>
                </div>
            </div>
            <nav className="not-found-links" aria-label="Pages you might want">
                {suggestions.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <span><strong>{item.label}</strong><small>{item.note}</small></span>
                        <ArrowUpRight size={18} aria-hidden="true" />
                    </Link>
                ))}
            </nav>
        </section>
    );
}
