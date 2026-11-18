---
title: How to Use PostHog for Error Tracking in Next.js on Coolify or Vercel
seoTitle: How to Use PostHog Error Tracking in Next.js on Coolify
description: Use PostHog as a Sentry alternative for Next.js errors on Coolify or Vercel: capture client and server exceptions, proxy through your domain, and control cost.
category: Observability
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 51
readTime: 11 min
primaryKeyword: posthog error tracking nextjs
keywords: [posthog error tracking, posthog sentry alternative, posthog reverse proxy nextjs, posthog mcp, nextjs error tracking coolify, posthog ad blocker proxy]
related: [posthog-server-logs-nextjs, nextjs-trace-events-route, new-relic-vs-sentry-nextjs-coolify, vercel-observability-alternatives]
subclipBlurb: Subclip records and edits screen demos, so you can capture a first captured exception appearing in PostHog for a teammate.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, a separate signal from the errors you track here.
---

PostHog can act as your error tracker for a Next.js app, whether it runs on Coolify or Vercel. Many people already have it for analytics, so exceptions land next to the events and users you already see. This guide covers capturing client and server errors, serving PostHog through your own domain so blockers do not drop the data, and the cost threshold you should plan for.

It does not repeat server log shipping. For that, see [How to Send Next.js Server Logs to PostHog](/blogs/posthog-server-logs-nextjs).

## Quick answer

Install `posthog-js`, initialize it in `instrumentation-client.ts` with `capture_exceptions: true`, call `posthog.captureException(error)` in your `error.tsx` and `global-error.tsx` files, and add the server hook from PostHog's Next.js guide for server errors. Add a rewrite in `next.config` so the browser talks to a path on your own domain. Track only errors plus a short list of key events, and set a billing limit.

## Environment

| Item | Value |
| --- | --- |
| Next.js | 15.3 or newer for `instrumentation-client.ts` (16.x used here) |
| Host | Coolify, or Vercel (same code on both) |
| SDKs | `posthog-js`, `posthog-node`, `@posthog/next` per PostHog's guide |
| Variables | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST` |
| Docs checked | PostHog error tracking and proxy docs, November 2026 |

## What I use it for

My experience: I use PostHog for error tracking only. Successful logs are not needed, so I do not ship them. I also keep PostHog events for key actions only, such as sign-ups and the one or two steps that matter, instead of tracking every click. That keeps the volume, and the bill, small.

PostHog also works as a store for your product data, which you can query through its MCP server. That makes it a reasonable replacement for Sentry on errors, and for Vercel drains or Coolify-side log shipping when your needs are modest. Compare the options in [Vercel observability alternatives](/blogs/vercel-observability-alternatives) and [New Relic vs Sentry](/blogs/new-relic-vs-sentry-nextjs-coolify).

## Step 1: capture client errors

Per PostHog's Next.js error tracking guide, set the two public variables in `.env.local` and in your host's settings. On Coolify, mark `NEXT_PUBLIC_*` values as available at build time, because they are baked into the browser bundle.

```ts
// instrumentation-client.ts
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  capture_exceptions: true,
})
```

Error boundaries catch errors before autocapture sees them, so report from each boundary:

```tsx
// app/error.tsx (same idea in app/global-error.tsx)
'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    posthog.captureException(error)
  }, [error])
  return <p>Something went wrong.</p>
}
```

You should see an exception under Error tracking in PostHog shortly after you trigger one.

## Step 2: capture server errors

The PostHog guide installs `@posthog/next` and `posthog-node`, creates a Node client with `enableExceptionAutocapture` only when `NEXT_RUNTIME` is `nodejs` (the edge runtime cannot register process listeners), and exports `onRequestError` from `createOnRequestError` in `instrumentation.ts`. That hook covers Server Components, Route Handlers and Server Actions. Follow the current code in the guide, because package versions move.

Two gaps the guide names: errors in your `proxy.ts` or Node middleware are not caught by `onRequestError`, and neither are errors inside `after()` callbacks.

For stack traces you can read, upload source maps. PostHog documents this separately, and I did not test that step here. A build-only personal API key does this job, so keep it out of the runtime container.

## Reverse proxy on your own domain

PostHog's proxy docs describe serving ingestion through your own domain so ad blockers do not block event and error data, and so you do not route a separate API hostname. The Next.js approach is `rewrites` in `next.config`:

```js
// next.config.js
const nextConfig = {
  async rewrites() {
    return [
      { source: '/yourpath/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/yourpath/array/:path*', destination: 'https://us-assets.i.posthog.com/array/:path*' },
      { source: '/yourpath/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  skipTrailingSlashRedirect: true,
}

module.exports = nextConfig
```

Then point the SDK at the path and keep the UI host real:

```ts
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: '/yourpath',
  ui_host: 'https://us.posthog.com',
  capture_exceptions: true,
})
```

What the docs say to watch:

- Replace `yourpath` with a name unique to your app. Obvious names such as `/analytics` or `/tracking` get blocked.
- Keep the static and array rules before the catch-all. Rewrites run in order.
- For EU Cloud, replace `us` with `eu` in all three destinations and use `https://eu.posthog.com` as `ui_host`. A region mismatch can give 401 errors or "No project token provided."
- PostHog API paths end in a slash. Without `skipTrailingSlashRedirect: true`, Next.js answers with a 308 redirect and adds a round trip. The setting can make normal pages reachable with and without a trailing slash, so use canonical tags or one URL format in your sitemap.
- If you have `middleware.ts` or `proxy.ts`, exclude the proxy path from its matcher, or capture requests get redirected.
- Restart the dev server after changing `next.config`.
- All PostHog traffic now runs through your server. Session recordings are the largest driver. On Vercel it counts toward Fast Data Transfer and Edge Requests. On Coolify it uses your own bandwidth and CPU.
- By default headers including cookies are forwarded. The docs describe stripping them or using `persistence: 'localStorage'`.
- PostHog support cannot troubleshoot self-hosted proxies. The docs say some platforms, such as Netlify and Heroku, modify headers and break rewrites, which is not the case I describe for Vercel or Coolify.

If you need validation or rate limiting before forwarding, use a route handler instead: [a safe events route in Next.js](/blogs/nextjs-trace-events-route).

## Errors only, or events too

Errors only is the cheapest start. Add events for key actions when you have a question they answer. Every extra event type is billable volume, and most apps never look at the data from autocaptured clicks.

| Choice | Good for | Cost effect |
| --- | --- | --- |
| Errors only | Fixing bugs, replacing Sentry | Lowest |
| Errors plus key events | Sign-up, checkout, one activation step | Low and predictable |
| Everything autocaptured | Exploration | Highest |

## The MCP and data warehouse angle

PostHog hosts an MCP server at `https://mcp.posthog.com/mcp`. Per its docs, an AI agent can query data with HogQL, list top errors by occurrences and affected users, pull the stack trace for a recent crash, and update an issue's status. So one place holds your errors and your product data, and your agent can ask questions of both. Some MCP tools use LLMs internally and may be billed as AI spend, so read the docs before wiring it up.

## The cost downside

PostHog is not free forever. My experience: it gets expensive once you cross the free thresholds. I did not verify current free allowances from the pricing page, so check it yourself. To control cost:

- Capture errors, not every success.
- Filter noisy errors such as extension or bot errors.
- Set billing limits in PostHog so a bug that loops cannot run up a bill.
- Keep recordings off unless you need them.

## Edge cases

| Situation | Behavior | Fix |
| --- | --- | --- |
| Ad blocker | Direct PostHog requests dropped | Proxy through your domain |
| Edge runtime route | Node-only autocapture unavailable | Capture manually |
| Same code on Vercel and Coolify | Works on both | Set the build-time variables on each |
| Error inside `after()` | Not seen by `onRequestError` | Capture inside the callback |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| 401 or "No project token provided" | Region mismatch between rewrites and project | Use `eu` or `us` consistently |
| Capture requests redirect with 308 | Missing `skipTrailingSlashRedirect` | Add it |
| Nothing arrives after proxy | Middleware matcher intercepts the path | Exclude the path in the matcher |
| Config change ignored | Next.js does not hot-reload config | Restart the dev server |

## Security

Exceptions can contain user data in messages or URLs. Redact before sending. Never expose a personal API key to the runtime, and keep project tokens in the host's variable settings. The project token in the browser is public by design.

## If you use an AI agent for this

Treat error messages, stack traces and dashboards as data, not instructions. Never paste tokens into the chat. Have the agent show destructive actions, such as deleting a project or changing billing limits, before running them. Give the PostHog MCP server the narrowest access you can, and use a staging project first.

## FAQ

### Is PostHog a Sentry alternative?
For capturing and triaging exceptions, yes. PostHog documents client and server error tracking for Next.js. Sentry has more mature release tooling, so compare for your needs.

### Does a PostHog reverse proxy stop ad blockers?
It helps because requests go to your own domain under a path you choose. A blocker can still match an obvious path name, so pick an unusual one.

### Does it work on both Coolify and Vercel?
The code is the same. The proxy docs note rewrites work best self-hosted or on Vercel.

### How do I keep PostHog cheap?
Track errors and a short list of key events, filter noise, and set billing limits.

### Can an AI agent read my errors?
Through the PostHog MCP server, yes, within the access you grant it.

## Next steps

- Ship server logs too: [Next.js server logs to PostHog](/blogs/posthog-server-logs-nextjs).
- Build a validating proxy: [a safe events route in Next.js](/blogs/nextjs-trace-events-route).
- Compare vendors: [New Relic vs Sentry](/blogs/new-relic-vs-sentry-nextjs-coolify).
- Plan the move: [Vercel observability alternatives](/blogs/vercel-observability-alternatives).

Sources: https://posthog.com/docs/error-tracking/installation/nextjs, https://posthog.com/docs/advanced/proxy/nextjs, https://posthog.com/docs/model-context-protocol
