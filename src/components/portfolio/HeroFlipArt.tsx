import Image from 'next/image';
import { portfolioAsset } from '@/utils/portfolio';

// One image per rotating hero word, shown inside a single rounded card. They share the word's 12s cycle (see hero-art.css), so
// the picture changes exactly when the word flips. Only the visible slide is clickable.
// Order must match the words in HomePage: SaaS, Desktop Apps, Mobile Apps, Extensions.
const withUtm = (url: string, content: string) => {
    const target = new URL(url);
    target.searchParams.set('utm_source', 'prosamik.com');
    target.searchParams.set('utm_medium', 'home-hero');
    target.searchParams.set('utm_campaign', 'hero-flip');
    target.searchParams.set('utm_content', content);
    return target.toString();
};

// Images live in the R2 bucket behind cdn.prosamik.com (portfolio/hero/). Upload a new file under a new
// version and bump this to change an image; the files are cached for a year.
const HERO_IMAGE_VERSION = '20261118';

const slides = [
    {
        id: 'saas',
        href: withUtm('https://www.rankizz.com', 'saas'),
        label: 'Rankizz.com, SEO and AI visibility dashboard',
        alt: 'Rankizz.com web app: keyword research, AI citations, backlinks and analytics in one dashboard',
    },
    {
        id: 'desktop',
        href: withUtm('https://www.subclip.app', 'desktop'),
        label: 'Subclip desktop app, AI video editor',
        alt: 'Subclip desktop app, an AI video editor, open on a MacBook Air',
    },
    {
        id: 'mobile',
        href: 'https://apps.apple.com/in/app/viral-captions-by-subclip/id6784246348',
        label: 'Subclip mobile app on the App Store',
        alt: 'Viral Captions by Subclip on iPhone, choosing a caption style',
    },
    {
        id: 'extension',
        href: 'https://chromewebstore.google.com/detail/rankizz-seo-extension/gihmcajchokaobbcbpmdjoafbdlikcfe',
        label: 'Rankizz Chrome extension on the Chrome Web Store',
        alt: 'Rankizz SEO Inspector Chrome extension showing a page overview',
    },
];

export default function HeroFlipArt() {
    return (
        <div className="hero-art">
            {slides.map((slide, index) => (
                <a key={slide.id} className={`hero-art-slide hero-art-${slide.id}`} href={slide.href} target="_blank" rel="noopener noreferrer" aria-label={slide.label}>
                    <Image src={portfolioAsset(`hero/${slide.id}-${HERO_IMAGE_VERSION}.webp`)} alt={slide.alt} width={1280} height={1024} sizes="(max-width: 700px) 92vw, 46vw" loading="eager" fetchPriority={index === 0 ? 'high' : 'auto'} />
                </a>
            ))}
        </div>
    );
}
