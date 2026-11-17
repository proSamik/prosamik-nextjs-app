import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { pageHref, pageWindow } from '@/lib/blogs/pagination';

// Server-rendered, crawlable pagination links. Renders nothing when everything fits on one page.
export default function Pagination({ current, total }: { current: number; total: number }) {
    if (total <= 1) return null;
    return (
        <nav className="blog-pagination" aria-label="Blog pages">
            {current > 1
                ? <Link className="blog-page-step" href={pageHref(current - 1)} rel="prev" aria-label="Previous page"><ArrowLeft size={16} aria-hidden="true" /><span>Newer</span></Link>
                : <span className="blog-page-step is-disabled" aria-hidden="true"><ArrowLeft size={16} /><span>Newer</span></span>}
            <ol>
                {pageWindow(current, total).map((item, index) =>
                    item === '…'
                        ? <li key={`gap-${index}`} className="blog-page-gap" aria-hidden="true">…</li>
                        : <li key={item}>
                            <Link href={pageHref(item)} aria-current={item === current ? 'page' : undefined} aria-label={`Page ${item}`} className={item === current ? 'is-current' : undefined}>{item}</Link>
                        </li>)}
            </ol>
            {current < total
                ? <Link className="blog-page-step" href={pageHref(current + 1)} rel="next" aria-label="Next page"><span>Older</span><ArrowRight size={16} aria-hidden="true" /></Link>
                : <span className="blog-page-step is-disabled" aria-hidden="true"><span>Older</span><ArrowRight size={16} /></span>}
        </nav>
    );
}
