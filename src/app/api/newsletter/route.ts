import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/accountability-origin';
import { isRateLimited, parseNewsletterInput, subscribeToNewsletter } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 2048;

export async function POST(request: Request) {
    // Browser-only endpoint: the form posts from our own origin.
    if (process.env.NODE_ENV === 'production' && !isSameOriginRequest(request, [process.env.NEXT_PUBLIC_SITE_URL, process.env.BETTER_AUTH_URL, process.env.NEXT_PUBLIC_APP_URL])) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }
    const ip = request.headers.get(process.env.MCP_TRUSTED_CLIENT_IP_HEADER?.trim() || 'cf-connecting-ip') ?? 'unknown';
    // Cheap rejections first, before reading a body: limit per IP, then cap the payload size.
    if (isRateLimited(ip)) {
        return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429, headers: { 'Retry-After': '600' } });
    }
    if (!request.headers.get('content-type')?.includes('application/json')) {
        return NextResponse.json({ error: 'Send JSON.' }, { status: 415 });
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
        return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });

    let body: unknown;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: 'Send a name and an email.' }, { status: 400 });
    }
    // Honeypot: real visitors never fill the hidden "website" field. Pretend success to bots.
    if (body && typeof body === 'object' && typeof (body as { website?: unknown }).website === 'string' && (body as { website: string }).website) {
        return NextResponse.json({ ok: true });
    }
    const parsed = parseNewsletterInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // Second check now that the email is known: three signups per address per hour.
    if (isRateLimited(`${ip}:email`, parsed.value.email)) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': '3600' } });
    }

    const result = await subscribeToNewsletter(parsed.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true });
}
