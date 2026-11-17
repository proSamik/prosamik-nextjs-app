import { PROMO_PRODUCTS, utmUrl } from '@/lib/blogs/promo';
import { getPostPromos } from '@/lib/blogs/render';
import type { BlogPost } from '@/lib/blogs/content';

// End-of-article cards. The copy is written per post (frontmatter) so it reads as a relevant next
// step, not a banner. Links carry UTM parameters so each post's traffic is attributable.
export default function PromoCards({ post }: { post: BlogPost }) {
    return (
        <aside className="blog-promos" aria-label="Tools mentioned in this guide">
            <h2>Tools I use for this</h2>
            <div className="blog-promo-grid">
                {getPostPromos(post).map((promo) => {
                    const product = PROMO_PRODUCTS[promo.product];
                    return (
                        <a key={promo.product} className="blog-promo" href={utmUrl(promo.product, post.slug, promo.placement)} target="_blank" rel="noopener noreferrer">
                            <strong>{product.name} <span aria-hidden="true">↗</span></strong>
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
