import Image from 'next/image';
import { PROMO_PRODUCTS, utmUrl } from '@/lib/blogs/promo';
import { getPostPromos } from '@/lib/blogs/render';
import type { BlogPost } from '@/lib/blogs/content';
import { portfolioAsset } from '@/utils/portfolio';

// The real product logos, hosted on the CDN (trimmed to the artwork, 120px tall for sharp 2x display).
const LOGOS = {
    subclip: { src: portfolioAsset('brand/subclip-logo-20261118.png'), width: 432, height: 120 },
    rankizz: { src: portfolioAsset('brand/rankizz-logo-20261118.png'), width: 384, height: 120 },
} as const;

// End-of-article cards. The copy is written per post (frontmatter) so it reads as a relevant next
// step, not a banner. Links carry UTM parameters so each post's traffic is attributable.
export default function PromoCards({ post }: { post: BlogPost }) {
    return (
        <aside className="blog-promos" aria-label="Tools mentioned in this guide">
            <h2>Tools I use for this</h2>
            <div className="blog-promo-grid">
                {getPostPromos(post).map((promo) => {
                    const product = PROMO_PRODUCTS[promo.product];
                    const logo = LOGOS[promo.product];
                    return (
                        <a key={promo.product} className="blog-promo" href={utmUrl(promo.product, post.slug, promo.placement)} target="_blank" rel="noopener noreferrer" aria-label={`${product.name}: ${product.what}`}>
                            <span className="blog-promo-logo">
                                <Image src={logo.src} alt={`${product.name} logo`} width={logo.width} height={logo.height} sizes="160px" />
                                <span aria-hidden="true" className="blog-promo-arrow">↗</span>
                            </span>
                            <span className="blog-promo-what">{product.what}</span>
                            <span>{promo.blurb}</span>
                        </a>
                    );
                })}
            </div>
            <p className="blog-disclosure">I build Subclip and Rankizz, so I link them where they genuinely fit.</p>
        </aside>
    );
}
