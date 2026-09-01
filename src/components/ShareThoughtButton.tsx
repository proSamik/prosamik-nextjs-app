'use client';

import { Check, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ShareThoughtButtonProps = {
    slug: string;
};

async function copyLink(url: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
}

export default function ShareThoughtButton({ slug }: ShareThoughtButtonProps) {
    const [copied, setCopied] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
    }, []);

    const share = async () => {
        const url = `${window.location.origin}/t/${encodeURIComponent(slug)}`;

        try {
            if (navigator.share) {
                await navigator.share({ url });
                return;
            }

            await copyLink(url);
            setCopied(true);
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => setCopied(false), 2200);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;

            try {
                await copyLink(url);
                setCopied(true);
                if (resetTimer.current) clearTimeout(resetTimer.current);
                resetTimer.current = setTimeout(() => setCopied(false), 2200);
            } catch {
                setCopied(false);
            }
        }
    };

    return (
        <button
            type="button"
            onClick={share}
            aria-label={copied ? 'Link copied' : 'Share this thought'}
            title={copied ? 'Link copied' : 'Share this thought'}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-xs font-bold text-stone-500 transition hover:border-stone-400 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d94722] focus-visible:ring-offset-2"
        >
            {copied ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
        </button>
    );
}
