import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/accountability-origin';
import { isRateLimited, parseNewsletterInput, subscribeToNewsletter } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    // Browser-only endpoint: the form posts from our own origin.
    if (process.env.NODE_ENV === 'production' && !isSameOriginRequest(request, [process.env.NEXT_PUBLIC_SITE_URL, process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL])) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    const ip = request.headers.get(process.env.MCP_TRUSTED_CLIENT_IP_HEADER?.trim() || 'cf-connecting-ip') ?? 'unknown';
    if (isRateLimited(`newsletter:${ip}`)) {
        return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Send a name and an email.' }, { status: 400 });
    }
    // Honeypot: real visitors never fill the hidden "website" field. Pretend success to bots.
    if (body && typeof body === 'object' && typeof (body as { website?: unknown }).website === 'string' && (body as { website: string }).website) {
        return NextResponse.json({ ok: true });
    }
    const parsed = parseNewsletterInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const result = await subscribeToNewsletter(parsed.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
}
