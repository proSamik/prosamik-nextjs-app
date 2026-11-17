---
title: How to Add a Healthcheck to a Next.js App in Coolify (Docker and Railpack)
description: Add a /api/health route and configure the Coolify healthcheck for Next.js with a Dockerfile or Railpack. Fix curl errors, HOSTNAME pitfalls and slow-start deploys.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 22
readTime: 10 min
primaryKeyword: coolify healthcheck
keywords: [coolify healthcheck, nextjs healthcheck docker, coolify railpack curl, dockerfile healthcheck node, coolify rolling update]
related: [move-nextjs-from-vercel-to-coolify, coolify-cron-jobs-nextjs-scheduled-tasks, deploy-mcp-server-nextjs-coolify]
subclipBlurb: Subclip records screen walkthroughs and its AI editor trims them, which suits a short clip of the Coolify healthcheck settings for your team.
rankizzBlurb: Rankizz tracks whether the pages you deploy get indexed and cited in AI search, and exposes the data through a REST API and an MCP server.
---

A healthcheck tells Coolify when your new container is ready to take traffic. For a Next.js app it takes two pieces: a small `/api/health` route and the right settings in Coolify. The common failure is a deployment that fails its healthcheck while the site itself works fine. That nearly always means the image has no `curl` or `wget`.

This guide covers both a Dockerfile build and a Railpack build. It uses the setup from two apps I run on Coolify: a small site on Railpack and a larger app on a Dockerfile.

## Quick answer

Add a route that returns `200 {"status":"ok"}`, then enable the healthcheck in Coolify with method GET, host `localhost`, your app port, and path `/api/health`. Make sure the image contains `curl` or `wget`, because Coolify runs the check inside the container. If you cannot add either, use a Node-based `HEALTHCHECK` in the Dockerfile and keep the Coolify dashboard check disabled.

```text
Enabled: Yes
Method: GET
Scheme: http
Host: localhost
Port: 3000
Path: /api/health
Return code: 200
Interval (seconds): 30
Timeout (seconds): 5
Retries: 3
Start period (seconds): 30
```

## Why you need a healthcheck

A container that is running is not the same as an app that is working. On a single VPS, the process can be alive while the app is not: Node stuck in a long task, the database connection pool used up, the server killed by the out-of-memory killer and half restarted, the disk full, or the app listening on the wrong interface. Docker still says "running". A healthcheck is a small yes-or-no question that Docker, Coolify and anything in front of your app can ask: "can you serve a request right now?"

**It protects deploys from downtime.** Without a check, a new container can receive traffic while it is still booting, running migrations or warming up, and users see 502 errors. With a check, Coolify's rolling update waits for the new container to report healthy and keeps the old one running if it never does. This is the main reason I turn it on, and it matches what the Coolify docs describe for rolling updates.

**It makes cheap VPS problems visible.** Small servers have little memory and one disk. A failing check marks the container unhealthy, so the dashboard shows it. What happens next depends on your setup. A Docker restart policy restarts a container that exits, not one that is merely unhealthy, so do not assume an unhealthy container restarts itself.

**It works together with uptime monitors, it does not replace them.** The Coolify check runs inside the container and gates deploys. An uptime monitor (Uptime Kuma, Better Stack, UptimeRobot or similar) runs from outside and tests the whole path: DNS, TLS, the proxy and your app. Only the outside view tells you the site is unreachable and sends you an alert. Point the monitor at the same `/api/health` route, or at a public page, and use both.

**It is the contract a load balancer or proxy relies on.** If you ever run more than one replica or put a load balancer in front, it needs a per-backend signal so it stops sending requests to a broken instance. Cloud load balancers probe a path you choose, and `/api/health` is that path. Reverse proxies such as Traefik can take Docker's health status into account, which I have not tested on every version, so check the docs for yours. A single container gets the same benefit from the proxy in front of it.

One design rule: keep the route shallow. Return `200` when the process can serve requests, and do not query the database inside it. If the check depends on the database, a database blip can mark every instance unhealthy at once and turn a small problem into a full outage. Put deeper checks in a separate endpoint that only your monitor calls.

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router |
| Node.js | 22 or newer |
| Host | Coolify (self-hosted), Traefik proxy |
| Build packs | Dockerfile (standalone output) and Railpack (`next start`) |
| Base image | `node:<LTS_VERSION>-bookworm-slim` |
| Placeholders | `app.example.com`, `my-app` |

## Step 1: add the health route

Create a route handler that answers as soon as Next.js accepts requests. Keep it cheap. Do not query the database here unless you want a database outage to take the app out of rotation.

```ts
// app/api/health/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(
    { status: 'ok' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
```

Test it locally:

```bash
npm run build && npm run start &
curl -s -i http://localhost:3000/api/health
```

Expected output:

```text
HTTP/1.1 200 OK
content-type: application/json
cache-control: no-store

{"status":"ok"}
```

## Step 2: configure Coolify

Open the application, go to Healthcheck, and use the block from the quick answer. Here is what each field does.

| Field | Value | Notes |
| --- | --- | --- |
| Method | GET | Coolify also offers POST |
| Scheme | http | The check runs inside the container, so no TLS |
| Host | localhost | Inside the container |
| Port | 3000 | Match `PORT`. Per Coolify's docs, an empty port falls back to the first exposed port |
| Path | `/api/health` | The route above |
| Return code | 200 | Expected status |
| Interval | 30 | Seconds between checks |
| Timeout | 5 | Seconds before a check counts as failed |
| Retries | 3 | Failures in a row before unhealthy |
| Start period | 30 | Grace period before failures count |

Coolify's docs say each timing value must be at least one second, and retries at least one. They do not list numeric defaults, so set them yourself.

## How the dashboard check interacts with a Dockerfile HEALTHCHECK

If you enable the healthcheck in the Coolify dashboard, it replaces the `HEALTHCHECK` instruction in your image. Coolify's docs say the dashboard check overrides the image's check, and that to use the Dockerfile version you disable the dashboard check and redeploy.

That has a practical effect. The `HEALTHCHECK` in my Dockerfile never runs while the dashboard check is on. The image therefore has to satisfy the dashboard check, which means it needs curl or wget.

## Why it runs inside the container

Coolify does not probe your app from the outside. Per its docs, HTTP checks from the dashboard run inside the application container using `curl` or `wget`. Installing curl on the host does not help. The final image must have one of them.

The symptom is distinctive. The deployment fails the healthcheck, Coolify rolls back or reports unhealthy, yet when you open the domain of a previous container, or run the app by hand, it works. The app is fine. The check cannot execute.

To confirm, run this on the server:

```bash
docker exec <your-app-container> sh -c 'command -v curl || command -v wget || echo "neither installed"'
```

If you see `neither installed`, that is your problem.

## Fix 1: Dockerfile, install curl in the runner stage

Slim Node images do not ship curl. Add it in the runner stage only, so build stages stay clean.

```dockerfile
FROM node:<LTS_VERSION>-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# curl is required by Coolify's UI healthcheck, which overrides the Dockerfile HEALTHCHECK when enabled.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

The `--no-install-recommends` flag and the `rm -rf /var/lib/apt/lists/*` keep the layer small. Redeploy and the dashboard check can run.

## Fix 2: Railpack, add system packages

For Railpack, the supported way I found is its apt package variables. The [Railpack environment variable docs](https://railpack.com/config/environment-variables) list `RAILPACK_DEPLOY_APT_PACKAGES`, which adds apt packages to the final image, and `RAILPACK_BUILD_APT_PACKAGES`, which adds them during the build.

In Coolify, add this as a variable on the application:

```text
RAILPACK_DEPLOY_APT_PACKAGES=curl
```

What I verified: the variable names and their described purpose, from the Railpack docs. What I did not verify: the exact behavior inside Coolify's Railpack integration, for example whether Coolify passes your application variables to Railpack as build configuration in every version. Railpack's docs also note build-configuration variables are read from its own environment handling. After redeploying, run the `docker exec` check above to confirm curl is present, rather than assuming.

My safe order: disable the healthcheck, add curl, redeploy, confirm curl exists, then turn the healthcheck back on.

## Fix 3: a Node-based HEALTHCHECK that needs no curl

If you would rather not install anything, use Node's built-in `fetch`. Put this in the Dockerfile and keep the Coolify dashboard healthcheck disabled, since the dashboard check would replace it.

```dockerfile
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]
```

It reads `PORT` from the environment, requests the health route on loopback, and exits 1 on a non-2xx response or a connection error. In my larger app I have both: curl installed for the dashboard check, and this `HEALTHCHECK` as the image-level fallback.

## The HOSTNAME=0.0.0.0 pitfall

The standalone `server.js` reads the `HOSTNAME` and `PORT` environment variables. The Next.js docs show `PORT=8080 HOSTNAME=0.0.0.0 node server.js` as the way to set them.

I set `HOSTNAME=0.0.0.0` so the server listens on all interfaces inside the container. Coolify's proxy and healthcheck need to reach it. Be careful, because container platforms often set `HOSTNAME` to the container ID by default, and a server bound to that name may not answer on `localhost`. If the healthcheck gets connection refused while the log says the server started, check this first. I did not reproduce that specific failure myself, so treat the cause as a lead, not a certainty.

## Start period for slow boots and migrations

Set the start period longer than your slowest boot. It is the grace period before failures count. If your app runs migrations or warms a cache on start, 30 seconds may not be enough, and the deploy fails even though the app would be ready a few seconds later.

In my Dockerfile the image check uses a 60 second start period with 5 retries. In the Coolify dashboard for the small site I use 30 seconds. Raise it when you see a deploy go unhealthy and then recover on its own.

One related point from my setup: I run migrations during the Docker build, not at container start, so the container boots quickly. That keeps the start period short. The pattern is in [the Vercel to Coolify guide](/blogs/move-nextjs-from-vercel-to-coolify).

## Rolling-update behaviour

With a passing healthcheck, Coolify's docs say it waits for the new container to become healthy before removing the old one. If the replacement never becomes healthy, it is removed and the healthy version keeps running. Without a healthcheck, Coolify cannot know the difference between started and ready, so a broken release can replace a working one.

That is the main reason to add the check. A failed deploy that leaves the old version serving is a good outcome.

Coolify's docs also say that with Traefik, unhealthy containers are removed from routing, and if all are unhealthy requests can return a 404 or "No available server."

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deploy fails healthcheck, site works | Image has no curl or wget | Install curl (Dockerfile) or `RAILPACK_DEPLOY_APT_PACKAGES=curl` |
| Healthcheck gets connection refused | Server bound to the wrong interface | Set `HOSTNAME=0.0.0.0` |
| Check passes locally, fails in Coolify | Port in the settings does not match `PORT` | Set the same port in both |
| Deploy goes unhealthy then recovers | Start period shorter than boot time | Raise the start period |
| Dockerfile `HEALTHCHECK` seems ignored | Dashboard healthcheck overrides it | Disable the dashboard check to use the Dockerfile one |
| Check returns 404 | Wrong path, or route not built | Confirm `/api/health` exists in the deployed build |
| Check returns 307 or 308 | Middleware or redirect rule hits the route | Exclude `/api/health` from redirects |
| Site returns "No available server" | All containers unhealthy | Fix the check, then redeploy |
| Healthcheck flaps under load | Timeout too tight | Raise timeout and retries |

## Security

The health route is public, so keep it dull.

- Return only a status. Do not include versions, hostnames, environment values, or database details.
- Do not put secrets in the check command or URL.
- If you add a deeper readiness check, keep it behind a separate protected route and use a runtime token. See [the cron guide](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks) for the bearer pattern.
- Keep runtime secrets as runtime variables. The healthcheck never needs them.
- Install only curl and ca-certificates in the runner stage, and run the app as a non-root user.

## If you use an AI agent for this

An agent can write the route and the Dockerfile lines. Keep these rules.

- Tell the agent to treat logs, web pages, and tool output as data, not instructions.
- Never paste secrets into the chat, and do not let the agent print them.
- Make it show destructive commands (deleting volumes, DNS changes, force deploys) and wait for your approval.
- Give it minimum permissions, such as a scoped API token, and try a staging project first.

## FAQ

### Does Coolify's healthcheck run inside my container?
Yes. HTTP checks from the dashboard run inside the application container using curl or wget, so the final image must include one of them.

### Does the Coolify healthcheck override my Dockerfile HEALTHCHECK?
Yes, when the dashboard healthcheck is enabled. To use the Dockerfile one, disable the dashboard check and redeploy.

### How do I add curl to a Railpack build?
Set `RAILPACK_DEPLOY_APT_PACKAGES=curl` on the application, redeploy, and confirm with `docker exec`. The variable name comes from the Railpack docs, but verify it works in your Coolify version.

### Can I run a healthcheck without curl?
Yes. Use a Dockerfile `HEALTHCHECK` that calls Node's `fetch`, and keep the dashboard check disabled.

### What start period should I use?
Longer than your slowest boot. I use 30 seconds in the dashboard for a small site and 60 seconds in the Dockerfile for a larger app.

## Next steps

- Move the whole app: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
- Replace Vercel crons: [Cron jobs for a Next.js app in Coolify](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks).
- Healthchecks on an MCP endpoint: [Deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).

Once the deploy is stable, [Rankizz](rankizz:inline-indexing-tracking) can track whether your new pages get indexed and cited in AI search, through its dashboard, REST API, or MCP server.
