---
title: How to Build a Safe Events Route in Next.js (First-Party Trace and Analytics Proxy)
seoTitle: How to Build a Safe Events Route in Next.js
description: Build a Next.js route handler that receives client events, validates and rate limits them, then forwards to your backend. Includes the PostHog rewrite option.
category: Observability
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 35
readTime: 10 min
primaryKeyword: nextjs events route handler
keywords: [nextjs events route, nextjs analytics proxy, first-party analytics nextjs, nextjs route handler rate limit, posthog reverse proxy nextjs, onRequestError]
related: [posthog-server-logs-nextjs, vercel-observability-alternatives, nextjs-logs-in-coolify, deploy-mcp-server-nextjs-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can show a teammate the events flowing from browser to route to backend.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which pairs with the page-level events you collect.
---

An events route is a Next.js route handler on your own domain that receives trace or analytics events from the browser or from your server, checks them, and forwards them to a backend. It keeps your ingest keys off the client, gives you one place to validate and rate limit, and makes the traffic first-party. This guide builds a small, safe version and shows the documented alternative for PostHog, which is a rewrite instead of code.

You need a Next.js app (App Router) and a destination that accepts events over HTTP.

## Quick answer

Create `app/api/events/route.ts` that accepts POST only, limits the body size, validates the JSON against an allowlist of event names and fields, applies a rate limit per client, and forwards the cleaned event to your backend using a server-side secret. Return `204` with no body. Never forward raw headers, cookies or free-form text. If the destination is PostHog and you only need a proxy, use `rewrites` in `next.config` instead, with `skipTrailingSlashRedirect: true`.

```bash
curl -i -X POST https://app.example.com/api/events \
  -H "content-type: application/json" \
  -d '{"name":"page_view","path":"/blogs"}'
```

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router route handler |
| Runtime | Node.js (`runtime = 'nodejs'`) |
| Destination | `MY_INGEST_URL` (placeholder, runtime variable) |
| Destination secret | `MY_INGEST_TOKEN` (placeholder, runtime variable) |
| Public host | `app.example.com` |

## Step 1: define what an event may contain

An open endpoint accepts whatever anyone sends. Decide the shape first and reject the rest. Allowlist event names, cap string lengths, and do not accept arbitrary properties.

```ts
// lib/events.ts
const ALLOWED = new Set(['page_view', 'cta_click', 'search'])

export type CleanEvent = { name: string; path: string; ts: number }

export function parseEvent(input: unknown): CleanEvent | null {
  if (typeof input !== 'object' || input === null) return null
  const { name, path } = input as Record<string, unknown>
  if (typeof name !== 'string' || !ALLOWED.has(name)) return null
  if (typeof path !== 'string' || path.length > 200 || !path.startsWith('/')) return null
  return { name, path, ts: Date.now() }
}
```

Note that the server sets the timestamp. Do not trust a client clock for anything that matters, and do not copy query strings or user identifiers unless you have decided you need them.

## Step 2: add a rate limit

A fixed-window counter per client key is enough to stop casual abuse. This version keeps counts in memory.

```ts
// lib/rate-limit.ts
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 60
const hits = new Map<string, { count: number; reset: number }>()

export function allow(key: string): boolean {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS })
    return true
  }
  entry.count += 1
  return entry.count <= MAX_PER_WINDOW
}
```

In-memory counters are per process. If you run more than one instance, each has its own counts, and a restart clears them. For a shared limit, store the counters in a database or cache that all instances use. Also prune old keys periodically, or the map grows.

How you derive the key matters. Do not trust arbitrary `X-Forwarded-For` values from clients. Only use a forwarded header if your own proxy sets it and strips client-supplied values. If you cannot identify a client reliably, apply a global limit instead.

## Step 3: write the route

```ts
// app/api/events/route.ts
import { parseEvent } from '@/lib/events'
import { allow } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 2_000

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== process.env.MY_PUBLIC_APP_URL) {
    return new Response(null, { status: 403 })
  }

  const key = request.headers.get('x-real-ip') ?? 'global'
  if (!allow(key)) {
    return new Response(null, { status: 429 })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return new Response(null, { status: 400 })
  }

  const event = parseEvent(parsed)
  if (!event) {
    return new Response(null, { status: 422 })
  }

  const target = process.env.MY_INGEST_URL
  const token = process.env.MY_INGEST_TOKEN
  if (!target || !token) {
    return new Response(null, { status: 503 })
  }

  try {
    await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Dropping an analytics event is better than failing the page.
  }

  return new Response(null, { status: 204 })
}
```

What this does: checks the `Origin` against your configured public URL (not against the request's own host), rate limits, bounds the body, validates, forwards with a secret that only exists on the server, and times out after three seconds. `MY_PUBLIC_APP_URL` should be the exact origin such as `https://app.example.com`. The `x-real-ip` line is a placeholder: use whatever header your own reverse proxy sets and overwrites, and see the caveat above.

## Step 4: send an event from the browser

```ts
// lib/track.ts
export function track(name: string, path = window.location.pathname) {
  const body = JSON.stringify({ name, path })
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))
  } else {
    void fetch('/api/events', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } })
  }
}
```

`sendBeacon` is designed for sending small data as the page unloads. The fallback uses `fetch` with `keepalive`.

## Step 5: report server errors with `onRequestError`

For server-side errors, Next.js has a documented hook. Export `onRequestError` from `instrumentation.ts` to send errors to your own observability provider. The docs say async work inside it must be awaited, and that the error may not be the original instance, so use `digest` to identify it.

```ts
// instrumentation.ts
import { type Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err)
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err ? String(err.digest) : undefined

  await fetch(process.env.MY_ERROR_URL ?? '', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      digest,
      path: request.path.split('?')[0],
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
    }),
  }).catch(() => {})
}
```

Notice what is left out: the request headers and the query string. The docs pass headers to this hook, and they can contain cookies and tokens, so do not forward them. `onRequestError` was introduced in Next.js 15.0.0, per the version history.

## Alternative: PostHog proxy with rewrites

If the destination is PostHog and you only need to proxy the browser SDK, PostHog documents rewrites in `next.config`:

```js
// next.config.js
const nextConfig = {
  async rewrites() {
    return [
      { source: '/my-events/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/my-events/array/:path*', destination: 'https://us-assets.i.posthog.com/array/:path*' },
      { source: '/my-events/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
```

Per the docs: replace `us` with `eu` for EU Cloud, keep the static and array rewrites before the catch-all, and pick a path name unique to your app, because blockers catch obvious names like `/analytics` or `/posthog`. If you have a `middleware.ts` or `proxy.ts`, make sure its matcher does not intercept the proxy path. Point the browser SDK's `api_host` at your path.

Use a rewrite when you just need a proxy. Use a route handler when you need validation, rate limits, redaction or fan-out.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Ad blocker blocks the path | Events never arrive | Use an app-specific path name |
| Multiple instances | In-memory limits differ per instance | Use a shared store for counters |
| Destination is down | Forward fails | Time out and drop, or queue |
| Large or malformed body | Memory and CPU waste | Cap bytes, return 413 or 400 |
| Cross-site POST | Another site can send events | Check `Origin`, keep the allowlist strict |
| `sendBeacon` blocked | No beacon sent | Fall back to `fetch` with `keepalive` |
| Edge runtime | Node-only code fails | Keep this route on `nodejs` |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `403` from the route | `Origin` does not match `MY_PUBLIC_APP_URL` | Set the exact origin, no trailing slash |
| `422` for valid-looking events | Name not in the allowlist | Add the name to `ALLOWED` |
| `429` for normal users | Shared key, such as all behind one proxy | Fix the client key derivation |
| `503` | `MY_INGEST_URL` or token missing | Set runtime variables, redeploy |
| `308` redirects on proxied PostHog paths | Trailing-slash redirect | Set `skipTrailingSlashRedirect: true` |
| Proxy path returns the app's 404 page | Middleware matcher intercepts it | Exclude the path in the matcher |
| Nothing logged for errors | `onRequestError` not awaited or file in wrong place | Put `instrumentation.ts` in the project root or `src` |

## Security

A public ingest route is an open door unless you close it.

- Keep the destination token on the server only. Never send it to the browser.
- Allowlist event names and fields. Reject unknown shapes.
- Do not accept or forward PII. No emails, names, IP addresses or free text unless you have a reason.
- Cap body size, time out upstream calls, and rate limit.
- Check `Origin` against your configured public URL, and do not trust arbitrary `Host` or forwarded headers.
- Do not forward request headers from `onRequestError`.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them.
- Make it show destructive commands (deleting resources, DNS changes, force deploys) and wait for approval.
- Give it minimum permissions: scoped ingest tokens, and a staging project first.

## FAQ

### What is a first-party events route?
A route on your own domain that receives events and forwards them to your analytics or logging backend, so the browser talks only to your origin.

### Should I use a rewrite or a route handler?
A rewrite is enough to proxy PostHog. A route handler lets you validate, redact and rate limit.

### Does an in-memory rate limit work in production?
It works per process. With several instances or restarts, use a shared store.

### How do I capture server errors in Next.js?
Export `onRequestError` from `instrumentation.ts`, available since Next.js 15.0.0. Await any async work inside it.

### Can ad blockers still block this?
Possibly, if the path name looks like tracking. PostHog's docs recommend an app-specific path.

## Next steps

- [PostHog server logs for Next.js](/blogs/posthog-server-logs-nextjs)
- [Vercel Observability alternatives](/blogs/vercel-observability-alternatives)
- [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify)
- Another protected route: [Deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify)

If you want to see how a guide performs after you publish it, [Rankizz](rankizz:inline-guide-tracking) tracks rankings and AI-search citations.
