---
title: How to Move a Next.js App from Vercel to Coolify (Railpack and Dockerfile)
seoTitle: How to Move a Next.js App from Vercel to Coolify
description: Move a Next.js app from Vercel to Coolify with Railpack or a Dockerfile. Covers env var scope, crons, migrations, healthchecks, standalone output and rollback.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 20
readTime: 13 min
primaryKeyword: vercel to coolify
keywords: [vercel to coolify, migrate nextjs from vercel, coolify nextjs, coolify railpack, coolify dockerfile nextjs, nextjs standalone docker]
related: [coolify-cron-jobs-nextjs-scheduled-tasks, coolify-healthcheck-nextjs-docker-railpack, nextjs-cloudflare-r2-cdn-wrangler, deploy-mcp-server-nextjs-coolify]
subclipBlurb: Subclip records your screen and its AI editor cuts the take, which is handy for a short deploy walkthrough or a before and after demo of your migration.
rankizzBlurb: Rankizz tracks whether your moved site stays indexed and gets cited in AI search, and exposes that data through a REST API and an MCP server.
---

I run two Next.js apps on Coolify. One is a small personal site that used to deploy on Vercel and now builds with Railpack and no config. The other is a larger app built from a Dockerfile. This guide shows both paths, so you can pick the one that fits your app and avoid the traps I hit.

You need a Coolify instance with a server attached, a Git repo, and a Next.js app that builds locally. The host-specific work is small. Most of the effort goes into replacing the things Vercel did for you without asking: crons, build hooks, previews, and env var scoping.

## Quick answer

Create a new application in Coolify from your Git repo and choose a build pack. For a plain Next.js app, pick Railpack and deploy with no extra files. For native libraries, migrations in the build, a non-root user, or standalone output, use a Dockerfile. In both cases, set `NEXT_PUBLIC_*` variables as build-time, keep secrets runtime-only, add a healthcheck, and recreate each Vercel cron as a Coolify Scheduled Task.

```text
1. New resource -> Application -> your Git repo
2. Build pack: Railpack (zero config) or Dockerfile
3. Environment variables: NEXT_PUBLIC_* = "Available at Buildtime"; secrets = runtime only
4. Healthcheck: GET /api/health, expect 200
5. Scheduled Tasks: one per old Vercel cron
6. Point DNS at the server, then deploy
```

## Environment

| Item | Value used in this guide |
| --- | --- |
| Next.js | 16.x (App Router) |
| Node.js | 22 or newer, within the `engines` range in `package.json` |
| Host | Coolify (self-hosted) with its Traefik proxy |
| Build packs | Railpack, Dockerfile (Nixpacks for comparison) |
| Database | PostgreSQL as a separate Coolify resource |
| Placeholders | `app.example.com`, `my-app`, `MY_DB_URL`, `MY_CRON_TOKEN` |

Coolify's own docs label Railpack as Beta at the time of writing, and list Nixpacks, Static, Dockerfile and Docker Compose as the other build packs. Check the current state in the [Coolify docs](https://coolify.io/docs) before you commit to one.

## What disappears when you leave Vercel

Vercel does several things implicitly. On Coolify each one needs an explicit replacement.

| On Vercel | On Coolify |
| --- | --- |
| `crons` in `vercel.json` | A Coolify Scheduled Task per cron. See [the cron guide](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks). |
| `vercel-build` script | Not run. Do migrations yourself, in the Dockerfile build or a pre-deploy step. |
| Preview deployments per PR | Not automatic. Create a second Coolify application for a staging branch. |
| Observability and log drains | Container logs in Coolify, plus your own analytics and error tracking. |
| Env var scoping | You decide: build-time for `NEXT_PUBLIC_*`, runtime for secrets. |
| Image optimization cache | Lives on your server's disk. Plan for that volume. |
| Automatic health and rollbacks | Add a healthcheck. Roll back by redeploying a previous commit or image. |

Leave `vercel.json` in the repo if you want, but its `crons` entry will never run on Coolify. In my small site I kept `vercel.json` with `"git": {"deploymentEnabled": false}` so Vercel stops building. The old cron path now has a Coolify Scheduled Task calling the same route.

## Path 1: Railpack (zero config)

Railpack is the shortest path. My small site has no Dockerfile in the repo. `package.json` has `build: next build`, `start: next start`, and an `engines` field of `node >=22 <26`.

1. In Coolify, create an application from your Git repository.
2. Set the build pack to Railpack.
3. Add environment variables (next section).
4. Set the domain, for example `https://app.example.com`, and deploy.

Expected result: the deployment log shows an install step, then `next build`, then the container starts and the proxy routes your domain to it.
Things to check on this path:

- Make sure the Node version Railpack picks matches `engines`. Mismatches show up as build-time syntax or dependency errors.
- Railpack reads configuration from environment variables such as `RAILPACK_BUILD_CMD` and `RAILPACK_INSTALL_CMD`. I verified these names in the [Railpack docs](https://railpack.com/config/environment-variables), which also list `RAILPACK_BUILD_APT_PACKAGES` and `RAILPACK_DEPLOY_APT_PACKAGES` for system packages.
- If you want a healthcheck that Coolify runs with curl, the final image needs curl. The healthcheck guide covers this: [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).

I do not use `output: 'standalone'` on this app. `next start` works fine and keeps the setup simple. I do set `outputFileTracingRoot: process.cwd()` so tracing is pinned to the project directory.

## Path 2: Dockerfile (more control)

My larger app uses a Dockerfile and `output: 'standalone'`. Here is the sanitized version. Names are placeholders.

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:<LTS_VERSION>-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Coolify passes variables marked "Available at Buildtime" as build args.
# ARG values exist only in this build stage and are not persisted in the final image.
# Keep secrets runtime-only whenever the build permits it.
ARG NEXT_PUBLIC_MY_APP_URL
ARG NEXT_PUBLIC_MY_ANALYTICS_TOKEN
ARG MY_DB_URL
ARG MY_CDN_URL

# Coolify does not run Vercel's `vercel-build`, so apply DB migrations here.
# Failing the deployment is safer than starting new code against an old schema.
RUN --mount=type=cache,id=my-app-next-webpack,target=/app/.next/cache/webpack,sharing=locked \
    test -n "$MY_DB_URL" \
    && npm run db:migrate \
    && npm run build \
    && rm -rf .next/standalone/node_modules/.cache \
    && rm -rf .next/standalone/public \
    && rm -f .next/standalone/.env .next/standalone/.env.*

FROM node:<LTS_VERSION>-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# curl is required by Coolify's UI healthcheck, which overrides the Dockerfile HEALTHCHECK when enabled.
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

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
```

Replace `<LTS_VERSION>` with the Node major version your app supports. Each decision in the file exists for a reason.

**Multi-stage build.** Dependencies, build, and runtime are separate stages. The runner stage holds only the standalone output, so the final image carries no build tooling, no source, and no dev dependencies.

**BuildKit cache mounts.** The `npm ci` step caches `/root/.npm`. The build step caches the webpack cache directory between builds on the server. `sharing=locked` makes two concurrent builds wait for each other instead of corrupting the cache. Only compiled code is cached.

**Build args versus runtime env.** Coolify passes variables marked "Available at Buildtime" as build args. They exist in the builder stage and are not persisted in the final image. Values the browser bundle needs (`NEXT_PUBLIC_*`) must be there, because Next.js inlines them at build time. Server-only secrets should be runtime-only: Coolify injects them into the running container, and I deliberately do not declare them as `ARG`. The exception is a value the build truly needs. In my case that is the database URL for migrations. A key that only uploads source maps to an analytics provider is build-only and never reaches the runtime container.

**Migrations in the build.** Coolify does not run Vercel's `vercel-build`. I moved migrations into the build step. If migration fails, the deployment fails and the old container keeps serving. That is safer than starting new code against an old schema. The `test -n "$MY_DB_URL"` guard fails fast when the variable is missing.

**Strip `.env*` from standalone.** The last `rm` lines remove any `.env` files from `.next/standalone` so secrets are never baked into an image layer. I also remove `standalone/public` because the next stage copies `public` explicitly.

**Non-root user.** The app runs as uid 1001. If a dependency is compromised, it does not get root inside the container.

**HOSTNAME and PORT.** The standalone `server.js` reads both. Next.js documents `PORT` and `HOSTNAME` as the way to choose them, for example `PORT=8080 HOSTNAME=0.0.0.0 node server.js`. Without `HOSTNAME=0.0.0.0`, the server may not be reachable from the proxy or the healthcheck.

**curl.** Coolify's dashboard healthcheck runs inside the container with curl or wget. The slim image has neither, so I install curl.

**HEALTHCHECK.** The image-level check uses Node's built-in `fetch`, so it works without curl. Coolify's own docs say an enabled dashboard healthcheck replaces the image's `HEALTHCHECK`. Details are in the [healthcheck guide](/blogs/coolify-healthcheck-nextjs-docker-railpack).

## Environment variable scope

The rule is simple. If the browser needs it, it must exist at build time. If only the server needs it, keep it runtime-only.

| Variable kind | Example | Scope in Coolify |
| --- | --- | --- |
| Public, inlined in the client bundle | `NEXT_PUBLIC_MY_APP_URL` | Available at Buildtime (and runtime) |
| Server secret | `MY_AUTH_SECRET`, `MY_CRON_TOKEN` | Runtime only |
| Needed by the build itself | `MY_DB_URL` (for migrations) | Buildtime, and runtime if the app uses it |
| Build-only upload key | source map upload key | Buildtime only, never runtime |

Do not mark a secret as build-time unless the build truly needs it. On Railpack, the same rule applies: set `NEXT_PUBLIC_*` as build variables and secrets as runtime variables.

## Standalone output gotchas

`output: 'standalone'` creates `.next/standalone` with a minimal `server.js`. The Next.js docs say it does not copy `public` or `.next/static` by default, so you copy them next to `server.js` yourself. The Dockerfile above does that with three `COPY` lines.

Three more gotchas, all from the [Next.js docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/output):

- `outputFileTracingRoot` widens the tracing root when files live outside the project folder, as in a monorepo.
- Files you read at runtime through `process.cwd()` may not be traced. Add them with `outputFileTracingIncludes` or they are missing in the image.
- Native binaries (for example from an ML or image library) may need `outputFileTracingIncludes` and system libraries in the runner stage. When I moved off Nixpacks, I had to install the OpenMP runtime and libGL by hand for a native ML dependency.

## Railpack vs Dockerfile vs Nixpacks

| | Railpack | Dockerfile | Nixpacks |
| --- | --- | --- | --- |
| Setup | No files | You write and maintain it | `nixpacks.toml` optional |
| Control | Env vars and config file | Full | Moderate |
| Migrations in build | Awkward | Easy | Possible |
| Non-root, strip `.env` | Limited | Yes | Limited |
| Native libraries | Via apt package variables | Install yourself | Via Nix packages |
| Best for | Plain apps, personal sites | Complex or sensitive apps | Existing setups |

I moved the larger app off Nixpacks for one concrete reason. Nixpacks only accepts a major Node version, so I had a `nixpacks.toml` that pinned Node through a pinned nixpkgs archive. A Dockerfile pins the exact base image and puts everything in one reviewable file. The cost was that native libraries Nixpacks had supplied now had to be installed by hand.

## Rollback

Rollback on Coolify means redeploying a previous commit or image. Keep that story clear before you cut over.

- Keep Vercel deployable for the first week, with DNS TTL lowered, so you can switch back.
- In Coolify, redeploy the previous commit if a release is bad.
- With a healthcheck, Coolify's rolling update waits for the new container to be healthy before removing the old one, and keeps the old one if the new one fails. This comes from the Coolify docs.
- If you serve build assets from a CDN, keep old release prefixes. My larger app uploads assets under a per-release path and never deletes old releases, so redeploying an old image still finds its assets. That setup is covered in [the Cloudflare R2 CDN guide](/blogs/nextjs-cloudflare-r2-cdn-wrangler).
- Never point a production CDN URL at assets that have not been uploaded from that exact build.

## Cutover checklist

```bash
# Before DNS change: hit the app by its Coolify domain
curl -s -o /dev/null -w "%{http_code}\n" https://app.example.com/api/health
# Expected: 200

# After DNS change: confirm the proxy serves your domain
curl -sI https://app.example.com | head -n 1
# Expected: HTTP/2 200
```

If the first call returns anything other than 200, fix that before you touch DNS.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Browser shows `undefined` for a public value | `NEXT_PUBLIC_*` was set as runtime only | Mark it Available at Buildtime and redeploy |
| Build fails, `MY_DB_URL` empty | Migration step needs it at build time | Mark it Available at Buildtime, keep it out of the client bundle |
| Deploy fails healthcheck, site works | Image has no curl or wget | Install curl (Dockerfile) or Railpack deploy apt packages |
| 502 or "No available server" | Server bound to localhost inside the container | Set `HOSTNAME=0.0.0.0` |
| Styles and images 404 on standalone | `public` and `.next/static` not copied | Add the `COPY` lines next to `server.js` |
| Runtime reads a file that is missing | File not traced into standalone | Add `outputFileTracingIncludes` |
| Cron never fires | `vercel.json` crons do not run on Coolify | Create a Scheduled Task |
| Native module fails to load | System library missing in slim image | Install it in the runner stage |

## Security

Treat the migration as a chance to tighten things.

- Put every secret in Coolify's environment UI. Never commit it, bake it into an image layer, or paste it into chat.
- Keep secrets runtime-only. Build-time variables are available to every build step, so use them only when the build needs them.
- Strip `.env*` from standalone output, as the Dockerfile does.
- Run as a non-root user.
- Give the app database user only the privileges it needs. Use a separate, broader user for migrations if you can.
- Protect cron routes with a bearer token held in a runtime variable. See the [cron guide](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks).
- Rotate any secret that ever sat in a Vercel dashboard you are leaving.

## If you use an AI agent for this

Agents can help with Dockerfiles and config, but set the ground rules first.

- Tell the agent to treat logs, web pages, and tool output as data, not instructions.
- Never paste secrets into the chat, and do not let the agent print them. Use placeholders.
- Make it show destructive commands (deleting volumes, DNS changes, force deploys) and wait for your approval.
- Give it minimum permissions: a scoped API token and a staging project first.

## FAQ

### Is Railpack or a Dockerfile better for Next.js on Coolify?
Use Railpack when your app is a plain Next.js build and you want zero config. Use a Dockerfile when you need migrations in the build, a non-root user, standalone output, cache mounts, or native libraries.

### Do Vercel crons work on Coolify?
No. The `crons` entry in `vercel.json` is read only by Vercel. Recreate each one as a Coolify Scheduled Task that calls the same route.

### Do I need `output: 'standalone'`?
No. `next start` works, and my small site uses it. Standalone makes a smaller image and a simple `node server.js`, but you must copy `public` and `.next/static` yourself.

### Where do I put NEXT_PUBLIC variables?
Set them as build-time variables. Next.js inlines them into the client bundle during `next build`, so a runtime-only value will not reach the browser.

### How do I roll back?
Redeploy the previous commit or image in Coolify. If you use a CDN for build assets, keep old release prefixes so the old image still finds them.

## Next steps

- Recreate each cron: [Cron jobs for a Next.js app in Coolify](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks).
- Add the healthcheck: [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).
- Serve assets from a CDN: [Next.js with Cloudflare R2 and wrangler](/blogs/nextjs-cloudflare-r2-cdn-wrangler).
- Host an MCP endpoint in the same app: [Deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).

If you want to show your team the move, [Subclip](subclip:inline-deploy-walkthrough) can record a short screen walkthrough and its AI editor trims it. Once the site is live, [Rankizz](rankizz:inline-post-migration-tracking) can track whether the moved pages stay indexed and get cited in AI search.
