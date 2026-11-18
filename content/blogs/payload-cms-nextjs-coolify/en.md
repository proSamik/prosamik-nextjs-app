---
title: How to Deploy Payload CMS with Next.js on Coolify (Docker, Postgres)
seoTitle: How to Deploy Payload CMS with Next.js on Coolify
description: Deploy Payload CMS inside a Next.js app on Coolify: standalone Dockerfile, PAYLOAD_SECRET and DATABASE_URL, Postgres, uploads storage and a healthcheck.
category: Self-hosting
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 43
readTime: 10 min
primaryKeyword: deploy payload cms coolify
keywords: [deploy payload cms coolify, payload cms docker, payload nextjs standalone, payload cms postgres, payload cms self host]
related: [coolify-healthcheck-nextjs-docker-railpack, move-nextjs-from-vercel-to-coolify, postgres-backups-coolify, nextjs-cloudflare-r2-cdn-wrangler]
subclipBlurb: Subclip records and edits screen demos, useful for a short walkthrough of the Payload admin panel for editors who will use it.
rankizzBlurb: Rankizz tracks how the pages your CMS publishes rank and get cited in AI search, so editors can see which content performs.
---

Payload is a CMS that runs inside your Next.js app, so deploying it means deploying a Next.js app with a database and somewhere to keep uploads. On Coolify that is one application, one Postgres resource, and a few runtime variables. This guide follows Payload's deployment docs and shows where Coolify's Dockerfile build pack fits.

I did not deploy Payload for this post. The Payload facts come from its official deployment page. The Coolify and Docker details come from my own Next.js deployments on Coolify, described generically.

## Quick answer

Set `output: 'standalone'` in `next.config`, build with a multi-stage Dockerfile that runs as a non-root user and starts `node server.js` on `HOSTNAME=0.0.0.0`, and give the container `PAYLOAD_SECRET` and `DATABASE_URL` as runtime variables. Add a Postgres resource in Coolify, enable a healthcheck, and configure a cloud storage plugin if the filesystem is not persistent.

## Environment

| Item | Value |
| --- | --- |
| Payload | Runs inside a Next.js app (App Router) |
| Database | PostgreSQL (Payload also supports MongoDB-compatible databases) |
| Host | Coolify, Dockerfile build pack |
| Required variables | `PAYLOAD_SECRET`, `DATABASE_URL` (`PAYLOAD_CONFIG_PATH` per the docs) |
| Port | 3000 inside the container |
| Verified from | Payload's production deployment docs |

## Step 1: configure Next.js for standalone

The Payload docs say to set `output: 'standalone'` in your Next.js config and use a multi-stage Dockerfile. Standalone output produces a small server in `.next/standalone`.

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig
```

Payload's own templates wrap the config with `withPayload`. Keep whatever wrapper your template uses and add the output setting inside it. I could not verify the exact wrapper signature for your Payload version, so follow your template.

## Step 2: write the Dockerfile

Payload's docs describe the shape: install dependencies, build, then a slim runner that copies `public`, `.next/standalone` and `.next/static`, runs as a non-root `nextjs` user, exposes 3000, and starts with `HOSTNAME="0.0.0.0" node server.js`. Here is that pattern with generic names.

```dockerfile
FROM node:<LTS_VERSION>-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:<LTS_VERSION>-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Two lessons from my own Dockerfile apply. `HOSTNAME=0.0.0.0` makes the standalone server listen on all interfaces inside the container, which Coolify's proxy and healthcheck need. And `curl` is installed because Coolify's UI healthcheck runs inside the container and overrides the Dockerfile `HEALTHCHECK` when enabled.

If your build touches the database, the Payload docs say they describe a way to build without a database connection. Read that section for your version. If you can build without one, do, so no database URL ever sits in a build stage.

## Step 3: create Postgres in Coolify

Create a PostgreSQL database resource in the same Coolify project and environment as the app, so the two share a network. Copy its internal connection URL into the app's runtime variables as `DATABASE_URL`. Payload's templates pass `DATABASE_URL` to the database adapter. For project and environment layout, see [Coolify projects and environments](/blogs/coolify-projects-environments-nextjs).

Do not point `DATABASE_URL` at the public port of the database if the internal address works. Internal traffic stays off the internet.

## Step 4: create the Coolify application

Create a new application from your Git repository, choose the Dockerfile build pack, set the port to 3000, and attach your domain. Then add variables.

| Variable | Scope | Notes |
| --- | --- | --- |
| `PAYLOAD_SECRET` | Runtime | A long, complex value, per the Payload docs |
| `DATABASE_URL` | Runtime | Internal Postgres URL |
| `PAYLOAD_CONFIG_PATH` | Runtime | The Payload docs list it; your template may set it already |
| `NEXT_PUBLIC_*` | Build time | Only values the browser bundle needs |

Keep secrets runtime-only unless the build truly needs them. In Coolify, marking a variable as available at build time turns it into a build argument. For the full scoping rules, see [move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).

## Step 5: add a healthcheck

Add a route such as `GET /api/health` that returns `200 {"status":"ok"}`, then enable Coolify's healthcheck with path `/api/health` and port 3000. The full settings are in [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).

## Step 6: handle uploads

Payload's docs warn that ephemeral filesystems can delete uploads when the server restarts. A Docker container's filesystem is replaced on every deploy, so media written to local disk will be lost unless you mount a persistent volume. The docs list official storage plugins for Azure Blob Storage, Google Cloud Storage, AWS S3, Uploadthing and Vercel Blob Storage.

Pick one. If you use S3-compatible storage, keep the access key in runtime variables only, never in client code or the image. For an R2 and CDN setup, see [Next.js with Cloudflare R2 and a CDN](/blogs/nextjs-cloudflare-r2-cdn-wrangler); I did not verify a Payload-specific R2 plugin configuration, so check the plugin's own docs.

## Step 7: deploy and create the first user

Deploy, watch the build log, then open `https://app.example.com/admin`. Payload prompts you to create the first admin user on a fresh database. Do that straight away, before the site is widely known.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Uploads on local disk | Lost on redeploy | Mount a volume or use a storage plugin |
| Build needs a database | Database URL must exist at build time | Prefer a build that does not; otherwise pass it as a build arg and accept the risk |
| `PAYLOAD_SECRET` changes | Existing auth tokens stop validating | Keep it stable; rotate deliberately |
| Migrations | Schema changes need applying before new code runs | Run your migrate command in the build or a release step |
| Public registration enabled | Strangers can sign up | The docs say to test access control, and loosen it carefully |
| Healthcheck fails but the site works | The image has no curl or wget | Install curl in the runner stage |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deploy goes Unhealthy | Healthcheck path wrong or no curl | Check the route and add curl |
| Container starts but proxy returns 502 | Server bound to localhost inside the container | Set `HOSTNAME=0.0.0.0` |
| Admin shows a database connection error | `DATABASE_URL` wrong or database not on the same network | Use the internal URL from the same environment |
| Images vanish after deploy | Local filesystem is ephemeral | Add a volume or storage plugin |
| Static assets 404 | `public` or `.next/static` not copied into the runner | Copy both beside `server.js` |
| Build fails for want of a database | The build queries Payload | Use the docs' no-database build approach |

## Security

- Set a long, complex `PAYLOAD_SECRET`, as Payload's docs require for production.
- The docs advise using SSL and enabling secure cookies on auth-enabled collections.
- Test every access control rule. By default operations require a logged-in user; loosen that carefully.
- Run as a non-root user and never copy `.env` files into the image.
- Keep the database on the internal network and back it up; see [Postgres backups in Coolify](/blogs/postgres-backups-coolify).

## If you use an AI agent for this

An agent can write the Dockerfile and config, with limits.

- Tell it to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them.
- Make it show destructive commands (volume deletes, database drops, DNS changes, force deploys) and wait for approval.
- Give it minimum permissions, and deploy to a staging project first.

## FAQ

### Can Payload run on Coolify?
Yes, because it runs inside a Next.js app, and Coolify can deploy a Next.js app with a Dockerfile or Railpack. I used the Dockerfile route above.

### Which database does Payload use?
Postgres or MongoDB-compatible databases, per its docs. Templates pass `DATABASE_URL` to the adapter.

### Which variables are required?
The docs say to set `PAYLOAD_SECRET`, `PAYLOAD_CONFIG_PATH` and `DATABASE_URL` (if needed) in your platform.

### Where should uploads go?
Not on the container filesystem. Use a persistent volume or a storage plugin (S3, Google Cloud Storage, Azure, Uploadthing or Vercel Blob).

### Do I need output standalone?
The Payload Docker guide uses it for a slim runner image. Without it you need the full `node_modules` in the image.

## Next steps

- [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack)
- [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify)
- [Postgres backups in Coolify](/blogs/postgres-backups-coolify)

Sources: https://payloadcms.com/docs/production/deployment, https://coolify.io/docs
