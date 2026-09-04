'use client';

import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PostVideoPlayer from '@/components/PostVideoPlayer';
import type { RandomThoughtMedia } from '@/lib/random-thoughts';

type PostMediaCarouselProps = {
    media: RandomThoughtMedia[];
};

type MediaSlideProps = {
    item: RandomThoughtMedia;
    index: number;
    fullscreen?: boolean;
    onOpen?: () => void;
};

function MediaSlide({ item, index, fullscreen = false, onOpen }: MediaSlideProps) {
    if (item.type === 'video') {
        return <PostVideoPlayer src={item.url} className="h-full w-full" />;
    }

    const image = (
        // Uploaded media has a dynamic CDN URL and must retain its original dimensions.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={item.url}
            alt={`Random thought attachment ${index + 1}`}
            loading={fullscreen ? 'eager' : 'lazy'}
            className="h-full w-full select-none object-contain"
            draggable={false}
        />
    );

    if (!onOpen) return image;

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label={`Open attachment ${index + 1} full screen`}
            className="block h-full w-full cursor-zoom-in border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
            {image}
        </button>
    );
}

function CarouselButton({
    direction,
    onClick,
    className = '',
}: {
    direction: 'previous' | 'next';
    onClick: () => void;
    className?: string;
}) {
    const isPrevious = direction === 'previous';

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`${isPrevious ? 'Previous' : 'Next'} attachment`}
            className={`grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${className}`}
        >
            {isPrevious ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
        </button>
    );
}

export default function PostMediaCarousel({ media }: PostMediaCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    const expandRef = useRef<HTMLButtonElement>(null);
    const pointerStartX = useRef<number | null>(null);
    const total = media.length;

    const showPrevious = useCallback(() => {
        setActiveIndex((current) => (current - 1 + total) % total);
    }, [total]);

    const showNext = useCallback(() => {
        setActiveIndex((current) => (current + 1) % total);
    }, [total]);

    useEffect(() => {
        if (!isFullscreen) return;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsFullscreen(false);
            if (event.key === 'ArrowLeft') showPrevious();
            if (event.key === 'ArrowRight') showNext();
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        const frameId = requestAnimationFrame(() => closeRef.current?.focus());

        return () => {
            cancelAnimationFrame(frameId);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            requestAnimationFrame(() => expandRef.current?.focus());
        };
    }, [isFullscreen, showNext, showPrevious]);

    useEffect(() => {
        if (activeIndex >= total) setActiveIndex(Math.max(0, total - 1));
    }, [activeIndex, total]);

    if (total === 0) return null;

    const activeMedia = media[activeIndex];
    const beginSwipe = (clientX: number) => {
        pointerStartX.current = clientX;
    };
    const finishSwipe = (clientX: number) => {
        if (pointerStartX.current === null) return;
        const distance = clientX - pointerStartX.current;
        pointerStartX.current = null;
        if (Math.abs(distance) < 48) return;
        if (distance > 0) showPrevious();
        else showNext();
    };

    const navigationDots = (
        <div className="flex max-w-[min(70vw,420px)] items-center justify-center gap-1.5 overflow-x-auto px-2 py-1">
            {media.map((item, index) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show attachment ${index + 1}`}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    className={`h-1.5 shrink-0 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/75'
                    }`}
                />
            ))}
        </div>
    );

    return (
        <>
            <div
                className="relative h-[clamp(260px,58vw,460px)] overflow-hidden rounded-2xl bg-black"
                onPointerDown={(event) => {
                    if (event.pointerType !== 'mouse') beginSwipe(event.clientX);
                }}
                onPointerUp={(event) => {
                    if (event.pointerType !== 'mouse') finishSwipe(event.clientX);
                }}
                onPointerCancel={() => {
                    pointerStartX.current = null;
                }}
            >
                {!isFullscreen ? (
                    <MediaSlide
                        item={activeMedia}
                        index={activeIndex}
                        onOpen={activeMedia.type === 'image' ? () => setIsFullscreen(true) : undefined}
                    />
                ) : null}

                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent p-3 pb-10">
                    <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold tabular-nums text-white backdrop-blur-md">
                        {activeIndex + 1} / {total}
                    </span>
                    <button
                        ref={expandRef}
                        type="button"
                        onClick={() => setIsFullscreen(true)}
                        aria-label="Open media carousel full screen"
                        className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>

                <CarouselButton direction="previous" onClick={showPrevious} className="absolute left-3 top-1/2 -translate-y-1/2" />
                <CarouselButton direction="next" onClick={showNext} className="absolute right-3 top-1/2 -translate-y-1/2" />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-10">
                    <div className="pointer-events-auto">{navigationDots}</div>
                </div>
            </div>

            {isFullscreen ? createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Post media gallery, attachment ${activeIndex + 1} of ${total}`}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 px-2 py-16 backdrop-blur-sm sm:px-16 sm:py-20"
                    onPointerDown={(event) => {
                        if (event.pointerType !== 'mouse') beginSwipe(event.clientX);
                    }}
                    onPointerUp={(event) => {
                        if (event.pointerType !== 'mouse') finishSwipe(event.clientX);
                    }}
                    onPointerCancel={() => {
                        pointerStartX.current = null;
                    }}
                >
                    <div className="absolute inset-x-0 top-0 flex h-16 items-center justify-between border-b border-white/10 bg-black/45 px-4 text-white backdrop-blur-md sm:px-6">
                        <span className="text-sm font-bold tabular-nums">
                            {activeIndex + 1} / {total}
                        </span>
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={() => setIsFullscreen(false)}
                            aria-label="Close full-screen media carousel"
                            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <div className="h-full w-full max-w-[1600px] overflow-hidden rounded-xl bg-black shadow-2xl">
                        <MediaSlide item={activeMedia} index={activeIndex} fullscreen />
                    </div>

                    <CarouselButton direction="previous" onClick={showPrevious} className="absolute left-2 top-1/2 -translate-y-1/2 sm:left-5" />
                    <CarouselButton direction="next" onClick={showNext} className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-5" />

                    <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center border-t border-white/10 bg-black/45 backdrop-blur-md">
                        {navigationDots}
                    </div>
                </div>,
                document.body,
            ) : null}
        </>
    );
}
