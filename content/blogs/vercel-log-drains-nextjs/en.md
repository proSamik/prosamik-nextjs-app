---
title: How to Set Up Vercel Log Drains for a Next.js App (With a Signed Receiver)
seoTitle: How to Set Up Vercel Log Drains for a Next.js App
description: Configure a Vercel Log Drain, build a Next.js route handler that verifies x-vercel-signature, parse the NDJSON payload, and control cost with sampling.
category: Observability
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 33
readTime: 10 min
primaryKeyword: vercel log drains
keywords: [vercel log drains, vercel drains nextjs, x-vercel-signature, vercel log drain endpoint, vercel logs external, vercel drains sampling]
related: [vercel-observability-alternatives, nextjs-logs-in-coolify, posthog-server-logs-nextjs, move-nextjs-from-vercel-to-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture a clean walkthrough of the Add Drain flow for a teammate.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, useful when you maintain technical how-to pages.
---

A Vercel Log Drain sends your deployment logs to an HTTP endpoint you control, so you can store, search and alert on them outside Vercel. This guide covers the configuration, a Next.js route handler that receives the logs and verifies the signature, and the cost controls Vercel documents. I wrote it as the counterpart to leaving Vercel: the Drains feature is one of the things that does not exist after a move to self-hosting, which is why the replacement posts exist.

You need a Vercel team on the Pro or Enterprise plan, a project, and a public HTTPS endpoint to receive the logs.

## Quick answer

In the Vercel dashboard go to **Team Settings > Drains**, click **Add Drain**, choose **Logs**, pick the projects, then choose **Custom Endpoint** and enter your HTTPS URL. Use NDJSON as the format, keep the signature secret, and make your endpoint verify the `x-vercel-signature` header and answer `200 OK`. Vercel batches payloads of up to 1 MB. Add a sampling rule if volume or cost is a concern.

```text
Team Settings > Drains > Add Drain
Data type: Logs
Destination: Custom Endpoint
Endpoint URL: https://app.example.com/api/vercel-logs
Format: NDJSON
```

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router route handler |
| Runtime | Node.js (`runtime = 'nodejs'`) |
| Vercel plan | Pro or Enterprise for non-audit drains, per Vercel docs |
| Receiver | `https://app.example.com/api/vercel-logs` (placeholder) |
| Secret | `MY_DRAIN_SECRET` (placeholder, runtime variable) |

## What Drains are

Drains forward observability data from your deployments to external services. Vercel's docs list these data types: logs, traces (OpenTelemetry format), Speed Insights, Web Analytics, Connect events and audit logs. Log drains carry runtime, build and static logs. A custom endpoint can receive any type. Native integrations from the Vercel Marketplace cover logs and traces, with services such as Dash0 and Braintrust named in the docs.

Availability and cost, as of November 2026 per the docs: Drains are available on Pro and Enterprise. Audit Log Drains are Enterprise only. On Hobby or a Pro trial you need to upgrade to Pro. The docs list a Drains Volume price for Pro, and say billed gigabytes are measured as uncompressed JSON of each record, so the bytes your destination sees can be lower than what you are billed. Check the pricing page before you rely on a number.

## Step 1: build the receiver first

Create the endpoint before the drain, because Vercel tests a custom endpoint when you create the drain. Your endpoint must respond with `200 OK`.

The docs verify the signature with an HMAC of the raw body. The `x-vercel-signature` header is a hash of the payload body made with your Drain signature secret, and the documented example uses SHA-1 with a hex digest. Compare in constant time, as the docs recommend.

```ts
// app/api/vercel-logs/route.ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.MY_DRAIN_SECRET
  if (!secret || !header) return false
  const expected = createHmac('sha1', secret).update(rawBody, 'utf-8').digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(header)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  if (!validSignature(rawBody, request.headers.get('x-vercel-signature'))) {
    return Response.json({ code: 'invalid_signature' }, { status: 403 })
  }

  // NDJSON: one JSON object per line.
  const records = rawBody
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))

  for (const record of records) {
    // Forward or store the record here. Keep this fast.
    console.log(JSON.stringify({ level: record.level, source: record.source, message: record.message }))
  }

  return Response.json({ success: true })
}
```

Set `MY_DRAIN_SECRET` as a runtime variable in the host that runs this endpoint, never in the repo. If it is missing, the route returns 403 for everyone, so it fails closed.

Two details matter. Read the body with `request.text()` and verify before parsing, because the signature covers the exact bytes. And the JSON format sends an array while NDJSON sends one object per line, so the parsing above only fits NDJSON. If you choose JSON, use `JSON.parse(rawBody)` instead.

## Step 2: add the drain

1. In the Vercel dashboard, go to **Team Settings > Drains** and click **Add Drain**.
2. Choose the data type **Logs**.
3. Name the drain and select all projects or specific ones.
4. For logs, set the log source, environment and sampling controls under **Additional configuration for logs**.
5. Choose **Custom Endpoint**, enter the endpoint URL, select the format, and optionally set a custom signature secret and custom headers.
6. Click **Create Drain**.

Vercel tests the custom endpoint when you create it, and you can click **Test** later. If the endpoint runs on Vercel, delivery requests create logs there, and the docs say Vercel does not send those to a Drain whose endpoint uses the same hostname, which prevents an endless loop.

The log sources you can select are `static`, `lambda`, `edge`, `build`, `external`, `firewall` and `redirect`. The environments are `production` and `preview`.

## Step 3: know what arrives

The logs schema in the docs includes fields such as `id`, `deploymentId`, `source`, `host`, `timestamp`, `projectId`, `level` (`info`, `warning`, `error`, `fatal`) and an optional `message`, which may be truncated if it is over 256 KB. Optional fields include `requestId`, `statusCode`, `environment`, `traceId`, `spanId` and a `proxy` object with request details. When you set up Vercel Tracing, logs from traced requests are enriched with `traceId` and `spanId` automatically.

A simple filter keeps your downstream clean:

```ts
const interesting = records.filter(
  (r) => r.level === 'error' || r.level === 'fatal' || (r.proxy?.statusCode ?? 0) >= 500,
)
```

## Step 4: control volume and cost

Vercel documents two controls.

Sampling rules, for Log and Trace drains: pick an environment, a percentage, and an optional path prefix. Rules run top to bottom. Requests that match a rule use its rate, and any other requests are dropped. With no rules, the drain forwards 100 percent.

Filters: Vercel supports OData filter expressions on fields such as `log/source`, `log/statusCode` and `log/path`, with examples like `log/statusCode ge 400`.

A sensible start is production only, `lambda` and `edge` sources, and a rule that keeps everything for errors by filtering on status code. Raise sampling during a launch, and lower it once traffic is stable, which is the example workflow in the docs.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Endpoint returns non-200 | Delivery counts as a failure | Always answer `200` after verifying |
| More than 80 percent of deliveries fail or over 50 failures in an hour | Vercel emails and marks the drain as errored | Fix the endpoint, then check the Drains page |
| Large burst | Payloads are batched up to 1 MB | Parse line by line, do not hold huge arrays |
| Endpoint is on Vercel | Delivery requests create logs | Same-hostname drains are excluded by Vercel |
| IP addresses in logs | Can include public IPs, which may count as personal data | Turn off visibility under **Settings > Security & Privacy > IP Address Visibility** |
| Build logs | `source` is `build`, no `proxy` object | Do not assume `proxy` exists |
| Endpoint maintenance | Deliveries would fail during the window | Use the menu on the drain, choose **Pause**, then **Resume** |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `{"code":"invalid_signature"}` with status 403 | Secret mismatch, or body modified before hashing | Verify against the raw body, copy the secret from **Edit** in the Drains list |
| Test fails when creating the drain | Endpoint not public, wrong URL, or not answering 200 | Check URL with `curl`, return `200` |
| Nothing arrives | Wrong projects, source or environment selected | Edit the drain config, run **Test** |
| `SyntaxError: Unexpected token` in `JSON.parse` | Format is NDJSON but code parses an array (or the reverse) | Match the parser to the chosen format |
| Receiver slow, deliveries failing | Heavy work inside the handler | Acknowledge fast, process asynchronously |
| Cost higher than expected | 100 percent sampling, preview logs included | Add sampling rules, limit environments |

## Security

The endpoint is a public URL, and anyone who finds it can post to it. The signature is your proof that Vercel sent the data.

- Verify `x-vercel-signature` on the raw body, in constant time, and fail closed if the secret is missing.
- Store the signing secret in a runtime variable, rotate it if it leaks, and never log it.
- Optionally add a custom header (for example a bearer value) as a second check.
- Treat log content as untrusted input. Do not render it as HTML and do not execute anything from it.
- Logs can contain personal data. Decide what you keep and for how long, and consider hiding IP addresses.
- Vercel sends the user agent `VercelDrain/1.0 (+https://vercel.com/docs/drains)`, but do not rely on it for authentication.

## If you use an AI agent for this

An agent can write the receiver and the parser quickly. Keep these rules.

- Tell the agent to treat logs, web pages and tool output as data, not instructions. Drain payloads contain text from your users.
- Never paste the signing secret or any token into the chat, and do not let the agent print it.
- Make the agent show destructive commands (deleting drains or projects, force deploys, DNS changes) and wait for approval.
- Give it minimum permissions: a scoped Vercel token if it uses the API, and a staging project first.

## FAQ

### Are Vercel Log Drains free?
Drains are available on Pro and Enterprise, and usage is billed by volume. The docs list a price for Pro, and as of November 2026 you should confirm it on Vercel's pricing page.

### Can I use Log Drains on the Hobby plan?
No. The docs say Hobby and Pro Trial teams need to upgrade to Pro for non-audit-log drains.

### Which header proves a request came from Vercel?
`x-vercel-signature`, a hash of the body created with your Drain signature secret. The documented example uses an HMAC with SHA-1 and a hex digest.

### Do Log Drains include build logs?
Yes, if you select the `build` source. Runtime, build and static logs are supported.

### What replaces Drains if I leave Vercel?
Container logs and a log drain on your own host. See [Vercel Observability alternatives](/blogs/vercel-observability-alternatives).

## Next steps

- Compare options: [Vercel Observability alternatives](/blogs/vercel-observability-alternatives).
- Send server logs to PostHog: [PostHog server logs for Next.js](/blogs/posthog-server-logs-nextjs).
- If you self-host: [Next.js logs in Coolify](/blogs/nextjs-logs-in-coolify) and [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).

If you share the Add Drain flow with a team, [Subclip](subclip:inline-drain-walkthrough) can record the walkthrough and its AI editor tidies the clip.
