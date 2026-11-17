'use client';

import { useEffect } from 'react';

// Adds a "Copy" button to every code block in the article. Runs after hydration; without
// JavaScript the code blocks simply render without the button.
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
            button.textContent = 'Copy';
            let timer: number | undefined;
            const onClick = async () => {
                const code = block.querySelector('code')?.textContent ?? '';
                try {
                    await navigator.clipboard.writeText(code);
                    button.textContent = 'Copied';
                } catch {
                    button.textContent = 'Press ⌘C';
                }
                window.clearTimeout(timer);
                timer = window.setTimeout(() => { button.textContent = 'Copy'; }, 1800);
            };
            button.addEventListener('click', onClick);
            block.appendChild(button);
            cleanups.push(() => { button.removeEventListener('click', onClick); button.remove(); window.clearTimeout(timer); });
        });
        return () => cleanups.forEach((cleanup) => cleanup());
    }, [containerId]);
    return null;
}
