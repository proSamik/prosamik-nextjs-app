'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy, Image as ImageIcon, Share2 } from 'lucide-react';
import type { ConsistencyCardKind, ConsistencyPlatform } from '@/lib/consistencyCardData';

interface ShareConsistencyCardProps {
    platform: ConsistencyPlatform;
    card: ConsistencyCardKind;
    className?: string;
}

export default function ShareConsistencyCard({ platform, card, className = '' }: ShareConsistencyCardProps) {
    const [open, setOpen] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const urls = () => {
        const origin = window.location.origin;
        return {
            image: `${origin}/api/embed/${platform}/${card}`,
            iframe: `${origin}/embed/${platform}/${card}`,
        };
    };

    const complete = (label: string) => {
        setDone(label);
        window.setTimeout(() => setDone(null), 1800);
    };

    const copyImage = async () => {
        const { image } = urls();
        try {
            const blob = await fetch(image).then((response) => response.blob());
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            complete('Image copied');
        } catch {
            await navigator.clipboard.writeText(image);
            complete('Image URL copied');
        }
    };

    const copyIframe = async () => {
        const { iframe } = urls();
        const size = card === 'graph' ? 'width="800" height="240"' : 'width="760" height="220"';
        await navigator.clipboard.writeText(
            `<iframe src="${iframe}" ${size} style="border:0" loading="lazy"></iframe>`
        );
        complete('Embed code copied');
    };

    const copyIframeUrl = async () => {
        await navigator.clipboard.writeText(urls().iframe);
        complete('Iframe URL copied');
    };

    return (
        <div ref={containerRef} className={`absolute right-3 top-3 z-20 ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="rounded-lg border border-gray-200 bg-white/95 p-2 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                aria-label={`Share ${platform} ${card} card`}
                aria-expanded={open}
            >
                <Share2 className="h-4 w-4" />
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white p-1.5 text-sm shadow-xl">
                    {done ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-green-700"><Check className="h-4 w-4" />{done}</div>
                    ) : (
                        <>
                            <button type="button" onClick={copyImage} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-gray-100"><ImageIcon className="h-4 w-4" />Copy image</button>
                            <button type="button" onClick={copyIframe} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-gray-100"><Code2 className="h-4 w-4" />Copy iframe code</button>
                            <button type="button" onClick={copyIframeUrl} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-gray-100"><Copy className="h-4 w-4" />Copy iframe URL</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
