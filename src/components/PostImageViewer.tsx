'use client';

import { Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PostImageViewerProps = {
    src: string;
    alt: string;
    imageClassName?: string;
};

export default function PostImageViewer({ src, alt, imageClassName = '' }: PostImageViewerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        const frameId = requestAnimationFrame(() => closeRef.current?.focus());

        return () => {
            cancelAnimationFrame(frameId);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            requestAnimationFrame(() => triggerRef.current?.focus());
        };
    }, [isOpen]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label={`Open ${alt} full screen`}
                className="group relative block h-full w-full cursor-zoom-in overflow-hidden border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-950"
            >
                {/* Uploaded media has a dynamic CDN URL and must retain its original dimensions. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className={imageClassName}
                />
                <span className="pointer-events-none absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-md transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true">
                    <Maximize2 size={16} />
                </span>
            </button>

            {isOpen ? createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={alt}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setIsOpen(false);
                    }}
                    className="fixed inset-0 z-[1000] grid place-items-center bg-black/95 p-4 backdrop-blur-sm sm:p-8"
                >
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close full-screen image"
                        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-xl backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
                    >
                        <X size={22} />
                    </button>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={alt}
                        className="max-h-[calc(100svh-2rem)] max-w-full select-none object-contain sm:max-h-[calc(100svh-4rem)]"
                    />
                </div>,
                document.body,
            ) : null}
        </>
    );
}
