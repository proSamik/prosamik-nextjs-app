'use client';

import { useRef, useState } from 'react';
import { Check, Copy, LoaderCircle } from 'lucide-react';
import { buildAgentInstructions } from '@/lib/blogs/agent-prompt';
import AgentIconCycle from './AgentIconCycle';

type State = 'idle' | 'loading' | 'copied' | 'error';

async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Older browsers and non-secure contexts: fall back to a hidden textarea.
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        if (!ok) throw new Error('copy failed');
    }
}

/**
 * "AI Agent Instructions" button (modelled on subclip.app's download card). Copies this guide's Markdown,
 * the same file agents get at /blogs/<slug>.md, behind a short safety preamble, ready to paste into an agent.
 */
export default function AgentInstructionsButton({ slug, placement }: { slug: string; placement: 'top' | 'bottom' }) {
    const [state, setState] = useState<State>('idle');
    const cache = useRef<string | null>(null);
    const timer = useRef<number | undefined>(undefined);

    const onClick = async () => {
        window.clearTimeout(timer.current);
        setState('loading');
        try {
            if (!cache.current) {
                const response = await fetch(`/blogs/${slug}.md`, { headers: { Accept: 'text/markdown' } });
                if (!response.ok) throw new Error(`markdown ${response.status}`);
                cache.current = buildAgentInstructions(await response.text());
            }
            await copyText(cache.current);
            setState('copied');
        } catch {
            setState('error');
        }
        timer.current = window.setTimeout(() => setState('idle'), 2400);
    };

    return (
        <div className={`agent-card agent-card-${placement}`}>
            <AgentIconCycle className="agent-card-icon" />
            <div className="agent-card-text">
                <strong>AI Agent Instructions</strong>
                <span>Copy this guide as Markdown, paste it into your AI agent, and let it follow along.</span>
            </div>
            <button type="button" className="agent-card-button" onClick={onClick} disabled={state === 'loading'} data-state={state}>
                {state === 'loading' && <><LoaderCircle className="agent-spin" size={16} aria-hidden="true" /> Copying</>}
                {state === 'copied' && <><Check size={16} aria-hidden="true" /> Copied</>}
                {state === 'error' && <>Couldn&apos;t copy, try again</>}
                {state === 'idle' && <><Copy size={16} aria-hidden="true" /> Copy instructions</>}
            </button>
            <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Instructions copied to clipboard' : ''}</span>
        </div>
    );
}
