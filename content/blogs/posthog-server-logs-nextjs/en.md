---
title: How to Send Next.js Server Logs to PostHog (posthog-node and OpenTelemetry)
seoTitle: How to Send Next.js Server Logs to PostHog
description: Send Next.js server logs to PostHog with the native posthog-node logger or OpenTelemetry, start them from instrumentation.ts, and keep secrets out of logs.
category: Observability
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 36
readTime: 9 min
primaryKeyword: posthog logs nextjs
keywords: [posthog logs nextjs, posthog-node logger, posthog opentelemetry logs, nextjs instrumentation.ts, send server logs to posthog, otlp logs nextjs]
related: [vercel-observability-alternatives, nextjs-trace-events-route, nextjs-logs-in-coolify, vercel-log-drains-nextjs]
subclipBlurb: Subclip records and edits screen demos, so you can capture where your first server log appears in PostHog for a teammate.
rankizzBlurb: Rankizz tracks how your published how-to guides rank and get cited by AI search, a different signal from the server logs you collect here.
---

PostHog can store your Next.js server logs next to your analytics and errors. Its docs describe Logs as an OpenTelemetry-native log store, and give Node.js two paths: a native logger in `posthog-node`, or OpenTelemetry. This guide shows both, how to start them from `instrumentation.ts`, and what to keep out of logs.

I use PostHog for analytics on my own site. I have not run PostHog Logs on my own apps, so everything about it below comes from PostHog's documentation. Verify the details against the current docs before you rely on them.

## Quick answer

Install `posthog-node` 5.65.0 or later, create the client with `logs: { serviceName: 'my-app' }`, and call `posthog.logger.info('message', { attributes })`. If you prefer OpenTelemetry, install the OTLP log exporter and send to `https://us.i.posthog.com/i/v1/logs` (or the EU host) with `Authorization: Bearer <project token>`. Start either from `instrumentation.ts` under a Node.js runtime check. Use the project token, not a personal API key.

```bash
npm install posthog-node
```

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router |
| Runtime | Node.js (not edge) |
| `posthog-node` | 5.65.0 or later for the native logger |
| Project token | `MY_POSTHOG_TOKEN` (placeholder, runtime variable) |
| Host | `https://us.i.posthog.com` or `https://eu.i.posthog.com` |

## Native or OpenTelemetry

PostHog defines native as the SDK recording the signal with no OpenTelemetry packages. For Node.js the docs list logs as native in `posthog-node` 5.65.0 or later, traces in 5.52.0 or later (experimental), and metrics in 5.43.0 or later. Native log records include the active span's trace and span IDs.

| Path | Choose it if |
| --- | --- |
| Native `posthog.logger` | You already use `posthog-node` and want the least setup |
| OpenTelemetry | You already run an OTel SDK, or want logs and traces through one pipeline |

## Option A: native logger

Enable it with the `logs` option, as documented.

```ts
// lib/posthog.ts
import { PostHog } from 'posthog-node'

let client: PostHog | null = null

export function getPostHog(): PostHog {
  if (!client) {
    client = new PostHog(process.env.MY_POSTHOG_TOKEN as string, {
      host: 'https://us.i.posthog.com',
      logs: { serviceName: 'my-app' },
    })
  }
  return client
}
```

Emit logs with the documented methods:

```ts
// app/api/orders/route.ts
import { getPostHog } from '@/lib/posthog'

export async function POST() {
  const posthog = getPostHog()
  posthog.logger.info('order created', { route: '/api/orders' })
  return Response.json({ ok: true })
}
```

The docs also show `posthog.captureLog({ body, level, attributes })` as an alternative call.

Two cautions. PostHog's Next.js guide initializes a server client with `flushAt: 1` and `flushInterval: 0` for events, because Next.js server functions can be short-lived, and calls `await posthog.shutdown()` to flush queued events. The Node.js logs page I read did not describe flush or shutdown behavior for logs, so I cannot tell you whether logs need the same settings. Test with a short-lived route and check that the log arrives. Also, a module-level singleton is shared per server process, which suits a long-running Coolify container better than a short-lived function.

## Option B: OpenTelemetry

Install the packages listed in the docs:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/exporter-logs-otlp-http @opentelemetry/api-logs @opentelemetry/resources @opentelemetry/sdk-logs
```

Configure the SDK in a Node-only file:

```ts
// instrumentation.node.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { resourceFromAttributes } from '@opentelemetry/resources'

const sdk = new NodeSDK({
  resource: resourceFromAttributes({ 'service.name': 'my-app' }),
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: 'https://us.i.posthog.com/i/v1/logs',
        headers: { Authorization: `Bearer ${process.env.MY_POSTHOG_TOKEN}` },
      }),
    ),
  ],
})

sdk.start()
```

PostHog's own example passes an options object to `BatchLogRecordProcessor` with an `exporter` key. Constructor signatures have changed across OpenTelemetry releases, so follow your installed version's types and the PostHog page if TypeScript complains.

Emit logs with the OpenTelemetry logs API:

```ts
import { logs } from '@opentelemetry/api-logs'

const logger = logs.getLogger('my-app')
logger.emit({ severityText: 'warn', body: 'slow query', attributes: { ms: 1200 } })
```

PostHog says you can authenticate with `Authorization: Bearer <project token>` or by appending `?token=<project token>` to the URL. Prefer the header, because URLs end up in proxy logs. For EU Cloud, swap the host to `eu.i.posthog.com`, and the docs page implies the path stays the same.

## Step: start it from instrumentation.ts

Next.js calls `register` once when a server instance starts, and it runs in all runtimes. The docs say to import runtime-specific code conditionally using `NEXT_RUNTIME`. The OpenTelemetry SDK is Node-only.

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}
```

The file goes in the project root, or inside `src` if you use one, not inside `app` or `pages`. For the native logger there is nothing to start: the client is created lazily on first use.

## Step: verify

1. Deploy, with `MY_POSTHOG_TOKEN` set as a runtime variable in your host (in Coolify, a runtime environment variable on the application).
2. Hit a route that logs.
3. Open the Logs product in your PostHog project and look for your service name.

If nothing arrives, check the token type, the host region, and your container logs for exporter errors. Keep your host's own logs as a fallback; see [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify).

## What to log, and what not to

Log events that explain behavior: what happened, which route, how long, which reason. Do not log request bodies, cookies, authorization headers, tokens, connection strings or personal data. Everything you log is copied to a third-party store, and a log line is hard to delete once ingested.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Edge runtime route | Node-only SDK is not loaded | Keep logging in Node routes, or use `@vercel/otel` |
| Short-lived process | Batched logs may not flush | Test; flush behavior for logs is not documented on the page I read |
| Two PostHog projects | Wrong token sends logs to the wrong place | Use one token per environment |
| EU project | US host rejects or misroutes | Use `eu.i.posthog.com` |
| Client logs | Server logger does not cover the browser | Use the browser SDK |
| Duplicate logs | Native logger and OTel both enabled | Pick one path |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No logs in PostHog | Wrong host region or wrong token | Match host and project region, use the project token |
| 401 or 403 from the exporter | Personal API key used instead of project token | Use the project token, not a personal key |
| `posthog.logger` is undefined | Older `posthog-node` or `logs` option missing | Upgrade to 5.65.0 or later, set `logs` |
| `Module not found` for OpenTelemetry packages in edge | Node-only import in edge runtime | Guard with `NEXT_RUNTIME === 'nodejs'` |
| Build fails importing `instrumentation.node` | File missing or wrong extension | Create it next to `instrumentation.ts` |
| TypeScript error on `BatchLogRecordProcessor` | Constructor signature differs by version | Follow your installed package types |

## Security

- Use the project token for ingest. Never use a personal API key in the app.
- Keep the token in a runtime variable in your host, not in the repo or image.
- Do not log secrets, headers or personal data, and redact at the call site.
- Prefer the `Authorization` header over a `?token=` URL parameter.
- Review who can read logs in your PostHog project, since logs may reveal internals.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them. Use `<YOUR_TOKEN>` placeholders.
- Make it show destructive commands (deleting resources, DNS changes, force deploys) and wait for approval.
- Give it minimum permissions: a scoped token, and a staging PostHog project first.

## FAQ

### Can PostHog store server logs?
Yes. PostHog describes Logs as an OpenTelemetry-native log store, and Node.js can send through a native logger or OpenTelemetry.

### Which posthog-node version has the logger?
5.65.0 or later, per PostHog's Node.js docs.

### What is the OTLP logs endpoint?
`https://us.i.posthog.com/i/v1/logs` for US Cloud. For EU, use the `eu` host.

### Do I use a project token or a personal API key?
The project token. PostHog says not to use a personal API key (`phx_`).

### Do I still need container logs?
Keep them as a fallback. See [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify).

## Next steps

- [Vercel Observability alternatives](/blogs/vercel-observability-alternatives)
- [A safe events route in Next.js](/blogs/nextjs-trace-events-route)
- [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify)
- [Vercel Log Drains for Next.js](/blogs/vercel-log-drains-nextjs)

Sources: https://posthog.com/docs/logs, https://posthog.com/docs/logs/installation, https://posthog.com/docs/logs/installation/nodejs, https://posthog.com/docs/libraries/next-js, https://nextjs.org/docs/app/guides/instrumentation
