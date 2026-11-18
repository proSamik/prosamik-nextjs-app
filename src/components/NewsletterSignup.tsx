'use client';

import { useId, useState, type FormEvent } from 'react';

type Status = 'idle' | 'sending' | 'done' | 'error';

// Name + email signup. Posts to /api/newsletter, which adds the contact to Plunk as subscribed.
// `source` records where the signup happened (for example `home` or `blog/<slug>`).
export default function NewsletterSignup({ source, variant = 'card' }: { source: string; variant?: 'card' | 'inline' }) {
    const id = useId();
    const [status, setStatus] = useState<Status>('idle');
    const [message, setMessage] = useState('');

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (status === 'sending') return;
        const form = new FormData(event.currentTarget);
        setStatus('sending');
        setMessage('');
        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.get('name'), email: form.get('email'), website: form.get('website'), source }),
            });
            const result = (await response.json().catch(() => ({}))) as { error?: string };
            if (!response.ok) {
                setStatus('error');
                setMessage(result.error ?? 'Something went wrong. Please try again.');
                return;
            }
            setStatus('done');
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    }

    return (
        <section className={`newsletter newsletter-${variant}`} aria-labelledby={`${id}-title`}>
            <div className="newsletter-copy">
                <h2 id={`${id}-title`} className="newsletter-title">Get the next guide by email</h2>
                <p>Self-hosting, MCP servers and AI agents, written from what I run. No spam, unsubscribe in one click.</p>
            </div>
            {status === 'done' ? (
                <p className="newsletter-done" role="status">Done, we&apos;ll be in touch :)</p>
            ) : (
                <form className="newsletter-form" onSubmit={onSubmit} noValidate={false}>
                    <label htmlFor={`${id}-name`}>Name</label>
                    <input id={`${id}-name`} name="name" type="text" autoComplete="given-name" maxLength={80} required placeholder="Your name" />
                    <label htmlFor={`${id}-email`}>Email</label>
                    <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@company.com" />
                    {/* Honeypot: hidden from people and assistive tech, bots fill it. */}
                    <input className="newsletter-hp" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                    <button type="submit" className="button button-primary" disabled={status === 'sending'}>{status === 'sending' ? 'Subscribing…' : 'Subscribe'}</button>
                    {status === 'error' && <p className="newsletter-error" role="alert">{message}</p>}
                </form>
            )}
        </section>
    );
}
