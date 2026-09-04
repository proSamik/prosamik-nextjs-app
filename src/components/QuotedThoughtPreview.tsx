import Link from 'next/link';
import { ArrowUpRight, Quote } from 'lucide-react';
import LocalizedDateTime from '@/components/LocalizedDateTime';
import type { RandomThoughtQuote } from '@/lib/random-thoughts';

type QuotedThoughtPreviewProps = {
    quote: RandomThoughtQuote;
    removable?: boolean;
    onRemove?: () => void;
};

export default function QuotedThoughtPreview({ quote, removable, onRemove }: QuotedThoughtPreviewProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 transition hover:border-stone-400 hover:bg-stone-100/80">
            <Link
                href={`/t/${quote.slug}`}
                className="block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d94722]"
            >
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#d94722]">
                        <Quote size={13} fill="currentColor" /> Quoted post
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-400">
                        Open original <ArrowUpRight size={12} />
                    </span>
                </div>

                <p className="text-xs font-bold text-stone-800">Samik</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                    <LocalizedDateTime dateIso={quote.createdAt} timeZone={quote.createdTimeZone} />
                </p>

                {quote.content ? (
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                        {quote.content}
                    </p>
                ) : null}

                {quote.media ? (
                    <div className="mt-3 h-32 overflow-hidden rounded-xl bg-stone-200 sm:h-40">
                        {quote.media.type === 'video' ? (
                            <video
                                src={quote.media.url}
                                muted
                                playsInline
                                preload="metadata"
                                className="h-full w-full bg-black object-cover"
                            />
                        ) : (
                            <img
                                src={quote.media.url}
                                alt="Quoted post attachment"
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        )}
                    </div>
                ) : null}
            </Link>

            {removable ? (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label="Remove quoted post"
                    className="absolute right-3 top-12 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-bold text-stone-500 shadow-sm hover:border-red-200 hover:text-red-600"
                >
                    Remove
                </button>
            ) : null}
        </div>
    );
}
