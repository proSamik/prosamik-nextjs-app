import 'server-only';
import { SlidingWindowLimiter } from './sliding-window';

// Newsletter signup through a (self-hosted) Plunk instance. Plunk's /v1/track endpoint creates the
// contact when it does not exist yet and applies `subscribed`, so one call adds the contact and
// subscribes it. A Plunk workflow listening for the event below can send the welcome email.
// Keys stay on the server: the browser only talks to /api/newsletter.

export const NEWSLETTER_EVENT = process.env.PLUNK_NEWSLETTER_EVENT?.trim() || 'newsletter-signup';

export interface NewsletterInput {
    name: string;
    email: string;
    source: string;
}

export type NewsletterResult = { ok: true } | { ok: false; status: number; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseNewsletterInput(body: unknown): { ok: true; value: NewsletterInput } | { ok: false; error: string } {
    if (!body || typeof body !== 'object') return { ok: false, error: 'Send a name and an email.' };
    const raw = body as Record<string, unknown>;
    const name = typeof raw.name === 'string' ? raw.name.trim().replace(/\s+/g, ' ') : '';
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    const source = typeof raw.source === 'string' ? raw.source.trim().slice(0, 120) : 'site';
    if (name.length < 1 || name.length > 80) return { ok: false, error: 'Add your name (up to 80 characters).' };
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { ok: false, error: 'That email address does not look right.' };
    return { ok: true, value: { name, email, source: /^[a-z0-9/_:.-]+$/i.test(source) ? source : 'site' } };
}

const limiter = new SlidingWindowLimiter();
/** Layered limits: per IP, per email address (stops mail-bombing one inbox), and a global ceiling. */
export function isRateLimited(ip: string, email?: string): boolean {
    const checks: boolean[] = [
        limiter.hit(`ip:${ip}`, { limit: 5, windowMs: 10 * 60 * 1000 }),
        limiter.hit('global', { limit: 120, windowMs: 60 * 1000 }),
    ];
    if (email) checks.push(limiter.hit(`email:${email}`, { limit: 3, windowMs: 60 * 60 * 1000 }));
    return checks.some(Boolean);
}

function plunkConfig() {
    const base = process.env.PLUNK_API_URL?.trim().replace(/\/+$/, '');
    const publicKey = process.env.PLUNK_PUBLIC_API_KEY?.trim();
    if (!base || !publicKey) return null;
    return { base, publicKey, secretKey: process.env.PLUNK_SECRET_API_KEY?.trim() };
}

export async function subscribeToNewsletter(input: NewsletterInput): Promise<NewsletterResult> {
    const config = plunkConfig();
    if (!config) return { ok: false, status: 503, error: 'The newsletter is not set up yet.' };

    // Optional: reject disposable and mistyped addresses when a secret key is configured.
    if (config.secretKey) {
        try {
            const check = await fetch(`${config.base}/v1/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.secretKey}` },
                body: JSON.stringify({ email: input.email }),
                signal: AbortSignal.timeout(6000),
            });
            if (check.ok) {
                const { data } = (await check.json()) as { data?: { valid?: boolean; isDisposable?: boolean; suggestedEmail?: string } };
                if (data?.isDisposable) return { ok: false, status: 422, error: 'Please use a permanent email address.' };
                if (data && data.valid === false) {
                    return { ok: false, status: 422, error: data.suggestedEmail ? `Did you mean ${data.suggestedEmail}?` : 'That email address does not look right.' };
                }
            }
        } catch {
            // Verification is a convenience: never block a signup because it timed out.
        }
    }

    try {
        const response = await fetch(`${config.base}/v1/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.publicKey}` },
            body: JSON.stringify({
                email: input.email,
                event: NEWSLETTER_EVENT,
                subscribed: true,
                data: { name: input.name, source: input.source, signedUpAt: new Date().toISOString() },
            }),
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
            console.error(`[newsletter] Plunk track failed: ${response.status}`);
            return { ok: false, status: 502, error: 'Could not subscribe right now. Please try again.' };
        }
        return { ok: true };
    } catch (error) {
        console.error('[newsletter] Plunk request failed:', error instanceof Error ? error.message : 'unknown error');
        return { ok: false, status: 502, error: 'Could not subscribe right now. Please try again.' };
    }
}
