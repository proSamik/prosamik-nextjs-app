---
title: Vercel Observability Alternatives for Next.js: How to Choose Logs, Traces and Errors
seoTitle: Vercel Observability vs Alternatives: How to Choose
description: Compare Vercel Observability, Vercel Drains, Coolify log drains, OpenTelemetry and PostHog for Next.js logs, traces and errors, with a decision table.
category: Observability
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 34
readTime: 10 min
primaryKeyword: vercel observability alternatives
keywords: [vercel observability alternatives, nextjs observability, opentelemetry nextjs, coolify log drain, posthog logs, self-hosted nextjs monitoring]
related: [vercel-log-drains-nextjs, nextjs-logs-in-coolify, posthog-server-logs-nextjs, nextjs-trace-events-route]
subclipBlurb: Subclip records and edits screen demos, which helps when you want to show a teammate how to read logs or traces in the tool you picked.
rankizzBlurb: Rankizz tracks how your published comparison and how-to pages rank and get cited by AI search.
---

You have four jobs to cover for a Next.js app: read logs, follow a slow request through traces, catch errors, and see how users behave. Vercel Observability covers the first three on Vercel. If you leave Vercel, or want data in a tool you control, you pick a replacement for each job. This guide compares the real options and tells you which to choose based on where your app runs.

The comparison is limited to what the official docs say. I did not benchmark these tools, and I do not quote prices for third parties, because I did not verify them. Check each pricing page as of November 2026.

## Quick answer

If you stay on Vercel, start with built-in Observability and add Vercel Drains only when you need data in another tool. If you self-host on Coolify, read Runtime Logs for day-to-day work, add a Coolify log drain for retention, use OpenTelemetry through `instrumentation.ts` for traces, and use PostHog for product analytics and, optionally, server logs. Pick one place per job instead of sending everything everywhere.

## Environment

| Item | Value |
| --- | --- |
| Framework | Next.js 16.x, App Router |
| Hosts compared | Vercel, Coolify (self-hosted) |
| Signals | Logs, traces, errors, product analytics |
| My own setup | Small Next.js site on Coolify with PostHog for analytics, moved from Vercel |

My own experience is limited to that setup: after moving two Next.js apps from Vercel to Coolify, I replaced Vercel's logs with Coolify logs and my own analytics. Everything else below is from documentation.

## Decision table

| Need | Vercel (stay) | Coolify (self-host) | Tool that works on both |
| --- | --- | --- | --- |
| Read recent logs | Observability and runtime logs | **Runtime Logs** in the application | `docker logs` on the server |
| Keep logs for weeks | Log Drains to an endpoint or integration | Log drain to Axiom, New Relic, CloudWatch or Fluent Bit | Any OTLP-capable store |
| Traces | Vercel tracing and Trace Drains | Not built in | OpenTelemetry with a collector |
| Error alerts | Observability alerts | Not built in | Error tracking in a tool such as PostHog, or `onRequestError` to your own endpoint |
| Product analytics | Vercel Web Analytics | Not built in | PostHog |
| Server logs next to analytics | Drain to PostHog via an endpoint you write | Send from the app | PostHog logs (native or OpenTelemetry) |

## Option 1: Vercel Observability (and Observability Plus)

Vercel's docs say Observability is available on all plans at no additional cost, with limitations, and that Observability Plus is available on Pro and Enterprise for additional features, higher limits and longer retention. It shows Vercel Functions, External APIs, CDN requests, Middleware, Image Optimization, ISR and more, at team and project level. The CLI examples in the docs include `vercel logs requests --environment production --query 'httpStatus:500' --json`.

Choose it if you are on Vercel and the dashboard answers your questions. It does not work for an app you host somewhere else.

## Option 2: Vercel Drains

Drains forward logs, traces, Speed Insights, Web Analytics and audit logs to a custom HTTP endpoint or a Marketplace integration. They are for Pro and Enterprise and billed by volume. See [Vercel Log Drains for Next.js](/blogs/vercel-log-drains-nextjs) for the setup. Choose it if you stay on Vercel but want retention, alerting or analysis in a tool you control.

## Option 3: Coolify logs and log drains

Coolify gives you **Runtime Logs** and **Deployment Logs** per application, and a server-level log drain to Axiom, New Relic, Amazon CloudWatch Logs or a custom Fluent Bit config. Only one Coolify-managed log drain can be active per server, and deployment or build logs are not forwarded. Retention and alerting live in the external provider. Details are in [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify).

Choose it if you self-host on Coolify and your main need is "what did the app print".

## Option 4: OpenTelemetry in Next.js

Next.js documents OpenTelemetry as the recommended way to instrument an app, and it instruments Next.js itself. You add an `instrumentation.ts` with `registerOTel` from `@vercel/otel`, or configure `NodeSDK` manually for the Node.js runtime. The docs say `@vercel/otel` works both on Vercel and when self-hosted, and that self-hosting means running your own OpenTelemetry Collector. Set `NEXT_OTEL_VERBOSE=1` to see more spans.

```ts
// instrumentation.ts
import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({ serviceName: 'my-app' })
}
```

Choose it if you need request traces and are willing to run or pay for a collector and a backend. It is more setup than the others.

## Option 5: PostHog

PostHog covers product analytics and error tracking, and its Logs product is described as an OpenTelemetry-native log store. For Node.js, its docs describe a native logger in `posthog-node` 5.65.0 or later, or OpenTelemetry. See [PostHog server logs for Next.js](/blogs/posthog-server-logs-nextjs). Choose it if you already use PostHog for analytics and want server logs, errors and user behavior in one place.

I use PostHog for analytics on my site. I have not verified its logs product on my own apps, so the logs part here is from its docs.

## Choose X if / choose Y if

| Choose | If |
| --- | --- |
| Vercel Observability | You are on Vercel and the dashboards answer your questions |
| Vercel Drains | You are on Vercel and need retention or alerts in another tool |
| Coolify Runtime Logs only | You self-host and a small app needs recent logs and nothing else |
| Coolify log drain | You self-host and need search, retention and alerts |
| OpenTelemetry | You need traces across routes, fetches and database calls |
| PostHog | You want analytics, errors and logs under one project |

A reasonable minimum for a small self-hosted app: Runtime Logs, one log drain, PostHog for analytics and errors, and no tracing until a real slow request forces it.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Edge runtime routes | Node-only OpenTelemetry setup does not run there | Use `@vercel/otel`, which supports edge |
| Two tools receive the same logs | Duplicate cost and duplicate alerts | Pick one destination per signal |
| Moving off Vercel | Drains and Observability stop | Replace each job before cutting over |
| Personal data in logs | It gets copied to every destination | Redact at the source |
| Client-side errors | Server logs do not cover them | Use client error tracking |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No spans appear | `register` ran but no exporter or collector is reachable | Check the exporter URL and collector |
| Spans created in `register` are separate traces | Docs note spans in `register` do not join request traces | Create spans inside request handling code |
| Log drain shows nothing | Server drain disabled or app not restarted | Enable the server drain, restart the app |
| Duplicate events in analytics | Client and server both capture the same event | Capture each event in one place |

## Security

Observability data is a copy of your production data.

- Do not log secrets, tokens, cookies or request bodies.
- Use ingest-only tokens for log and trace destinations.
- Keep exporter credentials in the host's runtime variables.
- Verify signatures on any endpoint that receives drained data.
- Decide retention per destination and delete what you do not need.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them.
- Make it show destructive commands (deleting drains, volumes, DNS changes, force deploys) and wait for approval.
- Give it minimum permissions: scoped tokens, read-only roles where possible, and a staging project first.

## FAQ

### Is Vercel Observability free?
The docs say Observability is available on all plans at no additional cost with limitations, and Observability Plus is available on Pro and Enterprise. As of November 2026, check the Observability Plus pricing page.

### What replaces Vercel Observability on Coolify?
Coolify's Runtime Logs and log drains cover logs. Traces need OpenTelemetry plus a backend, and errors and analytics need a separate tool.

### Does Next.js support OpenTelemetry outside Vercel?
Yes. The Next.js docs say `@vercel/otel` works both on Vercel and when self-hosted, with your own OpenTelemetry Collector.

### Can PostHog replace Vercel logs?
It can store logs sent through its native Node logger or OpenTelemetry. It does not replace Vercel's build and deployment views.

### Do I need all of these?
No. Most small apps need recent logs, one retained destination and analytics.

## Next steps

- [Vercel Log Drains for Next.js](/blogs/vercel-log-drains-nextjs)
- [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify)
- [PostHog server logs for Next.js](/blogs/posthog-server-logs-nextjs)
- [A first-party events route in Next.js](/blogs/nextjs-trace-events-route)

If you publish comparisons like this, [Rankizz](rankizz:inline-guide-tracking) is an SEO and AI-search workspace that tracks how a published guide ranks and whether AI search cites it.
