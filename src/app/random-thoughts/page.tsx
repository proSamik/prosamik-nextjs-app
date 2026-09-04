import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { listRandomThoughtsPage } from '@/lib/random-thoughts';
import RandomThoughtStack from '@/components/RandomThoughtStack';

export const revalidate = 120;

type RandomThoughtsPageProps = {
    searchParams: Promise<{ page?: string | string[] }>;
};

function parsePage(value: string | string[] | undefined): number {
    const candidate = Array.isArray(value) ? value[0] : value;
    const parsed = Number(candidate);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function pageHref(page: number): string {
    return page <= 1 ? '/random-thoughts' : `/random-thoughts?page=${page}`;
}

function visiblePages(totalPages: number, currentPage: number): Array<number | 'start-gap' | 'end-gap'> {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const pages: Array<number | 'start-gap' | 'end-gap'> = [1];
    if (currentPage > 4) pages.push('start-gap');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let page = start; page <= end; page += 1) pages.push(page);

    if (currentPage < totalPages - 3) pages.push('end-gap');
    pages.push(totalPages);
    return pages;
}

export async function generateMetadata({ searchParams }: RandomThoughtsPageProps): Promise<Metadata> {
    const resolvedSearchParams = await searchParams;
    const page = parsePage(resolvedSearchParams.page);
    const suffix = page > 1 ? ` – Page ${page}` : '';
    const canonical = pageHref(page);
    const description = 'Read random, unfiltered thoughts and updates shared by Samik Choudhury across tech, life, and reflection.';

    return {
        title: `Random Thoughts by prosamik${suffix}`,
        description,
        openGraph: {
            title: `Random Thoughts by prosamik${suffix}`,
            description,
            type: 'website',
            url: canonical,
        },
        twitter: {
            card: 'summary',
            title: `Random Thoughts by prosamik${suffix}`,
            description,
        },
        alternates: { canonical },
        robots: {
            index: false,
            follow: true,
            googleBot: {
                index: false,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1,
            },
        },
    };
}

export default async function RandomThoughtsPage({ searchParams }: RandomThoughtsPageProps) {
    const resolvedSearchParams = await searchParams;
    const requestedPage = parsePage(resolvedSearchParams.page);
    const result = await listRandomThoughtsPage(requestedPage);

    if (requestedPage !== result.page) {
        redirect(pageHref(result.page));
    }

    const pages = visiblePages(result.totalPages, result.page);

    return (
        <main className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-4 py-10 sm:py-14">
            <header className="border-b border-stone-200 pb-6">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#d94722]">A quiet corner of the internet</p>
                        <h1 className="text-4xl font-black tracking-[-0.04em] text-stone-950 sm:text-5xl">Random Thoughts</h1>
                    </div>
                    {result.totalCount > 0 ? (
                        <span className="mb-1 shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-bold text-stone-500">
                            {result.totalCount}
                        </span>
                    ) : null}
                </div>
            </header>

            {result.thoughts.length > 0 ? (
                <RandomThoughtStack thoughts={result.thoughts} />
            ) : (
                <div className="rounded-3xl border border-dashed border-stone-300 px-6 py-16 text-center text-sm text-stone-400">
                    Nothing shared here yet.
                </div>
            )}

            {result.totalPages > 1 ? (
                <nav aria-label="Random thoughts pagination" className="flex flex-wrap items-center justify-center gap-2 border-t border-stone-200 pt-7">
                    <Link
                        href={pageHref(result.page - 1)}
                        aria-disabled={result.page === 1}
                        style={{
                            color: result.page === 1 ? '#d6d3d1' : '#44403c',
                            fontSize: '0.875rem',
                        }}
                        className={`inline-flex h-10 items-center gap-1 rounded-xl border px-3 text-sm font-bold transition ${
                            result.page === 1
                                ? 'pointer-events-none border-stone-100 text-stone-300'
                                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                        }`}
                    >
                        <ChevronLeft size={16} /> Previous
                    </Link>

                    {pages.map((page) => typeof page === 'number' ? (
                        <Link
                            key={page}
                            href={pageHref(page)}
                            aria-current={page === result.page ? 'page' : undefined}
                            style={{
                                color: page === result.page ? '#ffffff' : '#57534e',
                                fontSize: '0.875rem',
                            }}
                            className={`grid h-10 min-w-10 place-items-center rounded-xl px-2 text-sm font-bold transition ${
                                page === result.page
                                    ? 'bg-stone-950 text-white shadow-lg shadow-stone-950/15'
                                    : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                            }`}
                        >
                            {page}
                        </Link>
                    ) : (
                        <span key={page} className="px-1 text-stone-400" aria-hidden="true">…</span>
                    ))}

                    <Link
                        href={pageHref(result.page + 1)}
                        aria-disabled={result.page === result.totalPages}
                        style={{
                            color: result.page === result.totalPages ? '#d6d3d1' : '#44403c',
                            fontSize: '0.875rem',
                        }}
                        className={`inline-flex h-10 items-center gap-1 rounded-xl border px-3 text-sm font-bold transition ${
                            result.page === result.totalPages
                                ? 'pointer-events-none border-stone-100 text-stone-300'
                                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                        }`}
                    >
                        Next <ChevronRight size={16} />
                    </Link>
                </nav>
            ) : null}
        </main>
    );
}
