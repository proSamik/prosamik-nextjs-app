import Image from 'next/image';
import { portfolioAsset } from '@/utils/portfolio';

// One image per rotating hero word, shown inside a single rounded card. They share the word's 12s cycle (see hero-art.css), so
// the picture changes exactly when the word flips. Only the visible slide is clickable.
// Order must match the words in HomePage: SaaS, Desktop Apps, Extensions, Mobile Apps, MCP Servers (Rankizz and Subclip alternate).
const withUtm = (url: string, content: string) => {
    const target = new URL(url);
    target.searchParams.set('utm_source', 'prosamik.com');
    target.searchParams.set('utm_medium', 'home-hero');
    target.searchParams.set('utm_campaign', 'hero-flip');
    target.searchParams.set('utm_content', content);
    return target.toString();
};

// Images live in the R2 bucket behind cdn.prosamik.com (portfolio/hero/). Upload a new file under a new
// version (the `v` of that slide) to change an image; the files are cached for a year.

const slides = [
    {
        id: 'saas',
        v: '20261118e',
        href: withUtm('https://www.rankizz.com', 'saas'),
        label: 'Rankizz.com, SEO and AI visibility dashboard',
        alt: 'Rankizz.com web app: keyword research, AI citations, backlinks and analytics in one dashboard',
    },
    {
        id: 'desktop',
        v: '20261118f',
        href: withUtm('https://www.subclip.app', 'desktop'),
        label: 'Subclip desktop app, AI video editor',
        alt: 'Subclip desktop app, an AI video editor, open on a MacBook Air',
    },
    {
        id: 'extension',
        v: '20261118e',
        href: 'https://chromewebstore.google.com/detail/rankizz-seo-extension/gihmcajchokaobbcbpmdjoafbdlikcfe',
        label: 'Rankizz Chrome extension on the Chrome Web Store',
        alt: 'Rankizz SEO Inspector Chrome extension showing a page overview',
    },
    {
        id: 'mobile',
        v: '20261118e',
        href: 'https://apps.apple.com/in/app/viral-captions-by-subclip/id6784246348',
        label: 'Subclip mobile app on the App Store',
        alt: 'Viral Captions by Subclip on iPhone, choosing a caption style',
    },
    {
        id: 'mcp',
        v: '20261118e',
        href: withUtm('https://www.rankizz.com/docs/mcp', 'mcp'),
        label: 'Rankizz MCP server, use SEO and AI-search data from your AI agent',
        alt: 'An AI agent chat using the Rankizz MCP server to find the next SEO wins',
    },
];

export default function HeroFlipArt() {
    return (
        <div className="hero-art">
            {slides.map((slide, index) => (
                <a key={slide.id} className={`hero-art-slide hero-art-${slide.id}`} href={slide.href} target="_blank" rel="noopener noreferrer" aria-label={slide.label}>
                    <Image src={portfolioAsset(`hero/${slide.id}-${slide.v}.webp`)} alt={slide.alt} width={1280} height={1024} sizes="(max-width: 700px) 92vw, 46vw" loading="eager" fetchPriority={index === 0 ? 'high' : 'auto'} />
                </a>
            ))}
        </div>
    );
}
