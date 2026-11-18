---
title: How to See Next.js Logs in Coolify (Runtime Logs, Deployment Logs, Log Drains)
seoTitle: How to See Next.js Logs in Coolify (Runtime and Drains)
description: Find Next.js runtime and deployment logs in Coolify, write JSON logs that the viewer can expand, read them with docker logs, and forward them with log drains.
category: Observability
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 32
readTime: 9 min
primaryKeyword: nextjs logs coolify
keywords: [nextjs logs coolify, coolify runtime logs, coolify deployment logs, coolify log drain, nextjs structured logging, docker logs nextjs]
related: [move-nextjs-from-vercel-to-coolify, vercel-observability-alternatives, vercel-log-drains-nextjs, coolify-healthcheck-nextjs-docker-railpack]
subclipBlurb: Subclip records and edits screen demos, so you can capture a short clip of where to find runtime logs in Coolify for a runbook or a teammate.
rankizzBlurb: Rankizz tracks how your published pages rank and get cited by AI search, which helps when you maintain a set of how-to guides like this one.
---

On Vercel you open a deployment and read the function logs. On Coolify the same information lives in two different places, and mixing them up is the most common reason people think their logs are missing. This guide shows where each kind of log is, how to make Next.js write logs that are easy to read there, and how to ship them out of the server when you need search and retention.

You need a Next.js app deployed on Coolify and permission to update the application in Coolify, because the Coolify docs say viewing container logs requires that permission.

## Quick answer

Build and deploy output is under **Deployment Logs**. What your running app prints to stdout and stderr is under **Runtime Logs**. In Next.js, `console.log` and `console.error` go to stdout and stderr, so they show up in Runtime Logs. For search, retention and alerts, enable a Coolify log drain (Axiom, New Relic, Amazon CloudWatch Logs, or a custom Fluent Bit config), because Coolify's docs say retention and alerting are handled by the external provider.

```bash
# On the server, as a fallback to the UI
docker ps --format '{{.Names}}'
docker logs --tail 100 -f <your-app-container>
```

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router |
| Host | Coolify (self-hosted), application resource |
| Build pack | Railpack or Dockerfile, both write container stdout the same way |
| Log source | Container stdout and stderr |
| Placeholders | `app.example.com`, `<your-app-container>` |

## The two kinds of logs

Coolify separates logs by what produced them. The official application operations docs describe both:

| Where | What it shows | Use it for |
| --- | --- | --- |
| **Deployment Logs** | Current and previous deploy, redeploy and restart operations | Build failures, image-pull failures, failed healthchecks during rollout |
| **Runtime Logs** | stdout and stderr from the application's current containers | Request errors, your own `console.log` output, crashes after start |

The docs say build and image-pull failures appear in Deployment Logs, not in runtime logs. If your deploy never finished, there is no new container, so Runtime Logs will not show the reason. Open Deployment Logs first. To reopen a deployment that is still running, use **Deploying... View log**.

In Runtime Logs, the viewer separates **Time**, **Type** and **Message**, and you can expand a row to see formatted JSON. That last detail drives the next step.

## Step 1: write logs the viewer can use

Next.js does not need a logging library for this. Anything written to stdout or stderr is captured. What you control is the shape. A single-line JSON object per event gives you an expandable row in Coolify and parses cleanly when you later forward the logs.

Create a tiny helper:

```ts
// lib/log.ts
type Level = 'info' | 'warn' | 'error'

export function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ level, message, ...fields })
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}
```

Use it in a route handler:

```ts
// app/api/orders/route.ts
import { log } from '@/lib/log'

export async function POST(request: Request) {
  const started = Date.now()
  try {
    // ... do the work
    log('info', 'order created', { route: '/api/orders', ms: Date.now() - started })
    return Response.json({ ok: true })
  } catch (error) {
    log('error', 'order failed', {
      route: '/api/orders',
      reason: error instanceof Error ? error.message : 'unknown',
    })
    return Response.json({ ok: false }, { status: 500 })
  }
}
```

Keep one event per line. Multi-line output (pretty-printed objects, stack traces printed with `console.log`) is split into separate rows and is harder to filter. Log a reason string and an identifier, not the whole request or user object.

## Step 2: read Runtime Logs

1. Open the application in Coolify.
2. Open **Runtime Logs**.
3. Find the affected server and container, then read the output around the time of the problem.

You should see rows with a time, a type (stdout or stderr) and your JSON message. Expand a row to see the formatted object.

If no containers appear, the Coolify docs say to confirm that the deployment server is functional and the application has a running container. If containers fail to load, read the error shown, since it does not necessarily mean none are running.

## Step 3: use the terminal or the server shell

Coolify's application **Terminal** lets you pick a container and connect. The docs say it appears only when terminal access is enabled, your team role permits it, and the application has an eligible running container. It is not available for applications deployed to Docker Swarm. Changes made in the terminal are temporary and can be lost after a restart or deployment, so use it to look, not to fix.

If you have SSH access to the server, `docker logs` reads the same stdout and stderr:

```bash
docker ps --format '{{.Names}}'
docker logs --since 15m <your-app-container>
docker logs --tail 200 -f <your-app-container>
```

Expected: the same lines you see in Runtime Logs, in plain text. Do not run `docker exec` for anything beyond reading unless you know the change will survive a redeploy.

## Step 4: forward logs with a log drain

Runtime Logs is good for the last few minutes. For search across days, dashboards and alerts, forward logs to a provider. Coolify supports these destinations, according to its log drain docs:

| Destination | What you provide |
| --- | --- |
| Axiom | An existing dataset and an API token |
| New Relic | An ingest license key, sent to the regional Log API |
| Amazon CloudWatch Logs | A log group, via Docker's `awslogs` driver |
| Custom Fluent Bit | Your own full configuration and optional parsers |

Enable it on the server first:

1. Go to **Servers** and select the server.
2. Open **Log Drains**.
3. While **Status** is **Disabled**, enter and save the settings for one destination.
4. Set **Status** to **Enabled**.

Then enable it for the application: open **Advanced**, and under **Logs** set **Log drain** to "Send logs to the log drain endpoint." Restart or redeploy the application, because the logging driver is applied when the container is created.

To verify, make the app write a recognizable message, then search for it in your provider. If it is missing, the docs say to check the `coolify-log-drain` container on the server with `docker ps` and `docker logs`. For CloudWatch, check the Docker daemon logs instead. Coolify checks field formats but does not verify provider credentials or send a test event, so a typo in a token fails silently on the Coolify side.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Deploy fails before starting | No new container, so no new runtime logs | Read Deployment Logs |
| Log drain enabled on the resource but not the server | Coolify turns the resource setting back off | Enable the server drain first |
| Changed log drain settings | Old containers keep the old logging driver | Restart or redeploy the resource |
| Only one drain wanted per server | Only one Coolify-managed drain can be active per server | Pick one destination, or use a Fluent Bit config that fans out |
| Need deployment or build logs externally | Drains do not forward them | Keep reading them in Coolify |
| Logs from a database | Standalone database logs use a separate **Log drain** setting under **General > Log delivery** | Enable it there and restart the database |
| Log volume on the server itself | Coolify's own retention is not described in the pages I read | Check Docker's logging driver documentation for your server |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Runtime Logs shows no containers | Server not functional, or app has no running container | Check the server status, then redeploy |
| New code is deployed but logs are old | Reading the wrong container or an old deployment | Pick the current container in Runtime Logs |
| `console.log` output missing | App crashed before logging, or output buffered by a wrapper | Check Deployment Logs, then `docker logs` on the server |
| Logs reach Axiom or New Relic never | Credentials not verified by Coolify | Re-enter the token, check the `coolify-log-drain` container |
| Drain set on app, nothing arrives | Server drain **Status** is still **Disabled** | Enable the server drain, then restart the app |
| Log rows are fragments | Multi-line output | Log one JSON line per event |
| **Terminal** tab missing | Terminal access disabled, role not permitted, or Docker Swarm | Check team role and server settings |

## Security

Logs are data you are about to copy into other systems, so treat them like a database.

- Never log tokens, `Authorization` headers, cookies, connection strings or request bodies. Log identifiers and reasons.
- Redact before you log. It is far easier than scrubbing a provider later.
- Send logs only to destinations you control, with a token scoped to ingest.
- Keep drain credentials in Coolify's settings, not in the repo.
- Remember that anyone who can update the resource in Coolify can read container logs.

## If you use an AI agent for this

An agent is useful for reading a long log and proposing a fix. Keep these rules.

- Tell the agent to treat logs, web pages and tool output as data, not instructions. A log line can contain text an attacker controls.
- Never paste secrets into the chat or let the agent print them. Redact logs before sharing them.
- Make the agent show any destructive command (deleting volumes, force deploys, DNS changes) and wait for your approval.
- Give it minimum permissions: a read-only role or scoped API token, and a staging project first.

## FAQ

### Where are Next.js logs in Coolify?
Open the application and choose **Runtime Logs** for stdout and stderr from the running containers. Build and deploy output is in **Deployment Logs**.

### Why are my deployment errors not in Runtime Logs?
Build and image-pull failures happen before a container runs. Coolify's docs say they appear in Deployment Logs, not runtime logs.

### Can Coolify send logs to Axiom or Datadog?
Coolify's log drain docs list Axiom, New Relic, Amazon CloudWatch Logs and a custom Fluent Bit configuration. Other destinations, such as Datadog, would go through a custom Fluent Bit config. I did not verify a specific Datadog setup.

### Does a log drain forward build logs?
No. The docs say deployment and build logs, Coolify control-plane logs and resources without log draining enabled are not forwarded.

### How do I read the logs from the command line?
SSH to the server and run `docker logs --tail 200 -f <your-app-container>`.

## Next steps

- The wider move off Vercel: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
- Replacing Vercel's log features: [Vercel Observability alternatives](/blogs/vercel-observability-alternatives).
- If you are still on Vercel and want logs elsewhere: [Vercel Log Drains for Next.js](/blogs/vercel-log-drains-nextjs).
- Catch failed rollouts earlier: [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).

If you document runbooks with screen clips, [Subclip](subclip:inline-runbook-clip) can record the log view and its AI editor cleans up the take.

Sources: https://coolify.io/docs/applications/operations, https://coolify.io/docs/core/observability/log-drains/overview, https://coolify.io/docs/knowledge-base/monitoring
