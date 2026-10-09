'use client';

import { Check, Image as ImageIcon, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Copies a private card locally; no public image URL is created. */
export default function ShareTracker({
    title,
    days,
}: {
    title: string;
    days?: { date: string; status: string }[];
    stats?: { label: string; value: number }[];
}) {
    const container = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [preview, setPreview] = useState('');
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);
    useEffect(() => {
        const outside = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node))
                setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', outside);
            document.removeEventListener('keydown', escape);
        };
    }, []);
    const copy = async () => {
        const card = container.current?.closest('section');
        if (!card || busy) return;
        setBusy(true);
        setMessage('');
        try {
            if (
                !navigator.clipboard?.write ||
                typeof ClipboardItem === 'undefined'
            )
                throw new Error(
                    'Image clipboard is unavailable in this browser.',
                );
            // Start the clipboard operation in the click handler, preserving the
            // browser's user gesture while the local PNG renders asynchronously.
            const png = import('html-to-image').then(async ({ toBlob }) => {
                const clone = card.cloneNode(true) as HTMLElement;
                const staging = document.createElement('div');
                staging.style.position = 'fixed';
                staging.style.left = '-100000px';
                staging.style.top = '0';
                clone.style.position = 'relative';
                clone.style.width = `${days ? Math.max(1000, card.clientWidth) : card.clientWidth}px`;
                staging.appendChild(clone);
                document.body.appendChild(staging);
                let blob: Blob | null;
                try {
                    blob = await toBlob(clone, {
                        pixelRatio: 2,
                        backgroundColor: '#ffffff',
                        // The staging clone is offscreen for layout. Reset its
                        // position inside the SVG capture so its pixels remain
                        // within the exported image instead of far outside it.
                        style: {
                            position: 'relative',
                            left: '0',
                            top: '0',
                            margin: '0',
                            transform: 'none',
                        },
                        filter: (node) =>
                            !(
                                node instanceof HTMLElement &&
                                node.dataset.cardExport === 'exclude'
                            ),
                    });
                } finally {
                    staging.remove();
                }
                if (!blob) throw new Error('Image export failed.');
                setPreview(URL.createObjectURL(blob));
                return blob;
            });
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': png }),
            ]);
            setMessage('Image copied');
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : 'Image could not be copied.',
            );
        } finally {
            setBusy(false);
        }
    };
    return (
        <div
            ref={container}
            data-card-export="exclude"
            className="absolute right-3 top-3 z-20"
        >
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-label={`Share ${title} card`}
                aria-expanded={open}
                aria-haspopup="menu"
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50"
            >
                <Share2 size={16} />
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-11 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
                >
                    <button
                        type="button"
                        role="menuitem"
                        disabled={busy}
                        onClick={() => void copy()}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                        {message === 'Image copied' ? (
                            <Check size={16} />
                        ) : (
                            <ImageIcon size={16} />
                        )}
                        {busy
                            ? 'Copying…'
                            : message === 'Image copied'
                              ? 'Image copied'
                              : 'Copy image'}
                    </button>
                    {message === 'Image copied' && preview && (
                        // This is the exact PNG written to the clipboard.
                        <img
                            src={preview}
                            alt={`Copied ${title} card preview`}
                            className="mt-2 max-h-32 w-full rounded border border-gray-200 object-contain"
                        />
                    )}
                    {message && message !== 'Image copied' && (
                        <p
                            role="status"
                            className="px-3 py-2 text-xs text-stone-600"
                        >
                            {message}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
