'use client';

import { useEffect } from 'react';

// Icon-only copy button on every code block (copy icon, then a check on success, an X if the browser
// refuses). Labels are for assistive tech and the tooltip. Runs after hydration; without JavaScript the
// code blocks simply render without the button.
const ICONS = {
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
} as const;

export default function CopyCodeButtons({ containerId }: { containerId: string }) {
    useEffect(() => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const cleanups: Array<() => void> = [];
        container.querySelectorAll<HTMLElement>('.blog-code').forEach((block) => {
            if (block.querySelector('.blog-copy')) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'blog-copy';
            const show = (kind: keyof typeof ICONS, label: string) => {
                button.innerHTML = ICONS[kind];
                button.setAttribute('aria-label', label);
                button.title = label;
                button.dataset.state = kind;
            };
            show('copy', 'Copy code');
            let timer: number | undefined;
            const onClick = async () => {
                const code = block.querySelector('code')?.textContent ?? '';
                try {
                    await navigator.clipboard.writeText(code);
                    show('check', 'Copied');
                } catch {
                    show('error', 'Copy failed');
                }
                window.clearTimeout(timer);
                timer = window.setTimeout(() => show('copy', 'Copy code'), 1800);
            };
            button.addEventListener('click', onClick);
            block.appendChild(button);
            cleanups.push(() => { button.removeEventListener('click', onClick); button.remove(); window.clearTimeout(timer); });
        });
        return () => cleanups.forEach((cleanup) => cleanup());
    }, [containerId]);
    return null;
}
