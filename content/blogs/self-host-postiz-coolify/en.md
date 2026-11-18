---
title: How to Self-Host Postiz on Coolify (Social Media Scheduler)
seoTitle: How to Self-Host Postiz on Coolify (Social Scheduler)
description: Self-host Postiz with Docker Compose or Coolify: required env vars, ports, Temporal, closing registration, storage, upgrades and an agent-safe checklist.
category: Self-hosting
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 42
readTime: 9 min
primaryKeyword: self host postiz
keywords: [self host postiz, postiz coolify, postiz docker compose, social media scheduler self hosted, postiz env variables]
related: [host-nextjs-on-vps-with-coolify, coolify-projects-environments-nextjs, self-host-plunk-amazon-ses, postgres-backups-coolify]
subclipBlurb: Subclip edits screen recordings, which helps when you want to publish a short demo of the social posts you schedule with Postiz.
rankizzBlurb: Rankizz tracks how your published pages rank and get cited in AI search, which pairs with the social posts you schedule to promote them.
---

Postiz is an open-source social media scheduling tool. You can run it on your own server so your post queue and connected accounts live on infrastructure you control. This guide covers the documented Docker Compose install and how it maps onto Coolify.

I did not deploy Postiz for this post. Everything about Postiz comes from its official docs, and I say where the docs stopped short.

## Quick answer

Postiz's docs install it with the `postiz-docker-compose` repository: clone it, set your variables, run `docker compose up`, and open the frontend on port 4007 and the Temporal UI on port 8080. Six variables are validated at boot: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`, `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_INTERNAL_URL`. After you create your account, set `DISABLE_REGISTRATION=true`.

```bash
git clone https://github.com/gitroomhq/postiz-docker-compose
cd postiz-docker-compose
# set variables in docker-compose.yml or a postiz.env file, then:
docker compose up
```

## Environment

| Item | Value |
| --- | --- |
| Install method | `postiz-docker-compose` repository |
| Tested size per docs | Ubuntu 24.04 VM, 2 GB RAM, 2 vCPUs |
| Frontend port | `4007` |
| Temporal UI port | `8080` |
| Backing services | PostgreSQL, Redis, Temporal (defined in the repository's compose file) |
| Verified from | docs.postiz.com install and configuration reference |

The docs do not list the services inside the compose file. They tell you to read the file in the repository, and to pull it from there instead of copying a snapshot, because services and variables change between releases.

## Step 1: get the compose project

```bash
git clone https://github.com/gitroomhq/postiz-docker-compose
cd postiz-docker-compose
ls
```

You should see `docker-compose.yaml` and a `dynamicconfig` directory that the Temporal service mounts. Keep the directory next to the compose file.

If you are upgrading from v2.11.2 to v2.12.0 or later, the docs say Temporal changes, and you should read the migration guide first.

## Step 2: set the variables

The docs allow three places for configuration: the `docker-compose.yml` file, a `postiz.env` file mounted at `/config` for the Postiz container only, or a `.env` file beside the compose file, which the docs do not recommend. A mix is allowed. For a server, `postiz.env` kept out of git is the cleanest.

| Variable | Required | Meaning from the docs |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma |
| `REDIS_URL` | Yes | Redis connection for queues, rate limiting and short-lived caches |
| `JWT_SECRET` | Yes | A long random string used to sign session JWTs; rotating it invalidates all sessions |
| `FRONTEND_URL` | Yes | Address browsers use for the frontend; also the OAuth redirect base and used in email links |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Address browsers use to reach the backend |
| `BACKEND_INTERNAL_URL` | Yes | Address the frontend server uses to reach the backend; often `http://localhost:3000` on one host |
| `MAIN_URL` | No | Falls back to `FRONTEND_URL` |
| `DISABLE_REGISTRATION` | No | When `true`, allows one signup then disables sign-up (this also disables OIDC/OAuth sign-in) |
| `STORAGE_PROVIDER` | No | `local` (default) or `cloudflare` |

Generate the JWT secret locally and paste it only into the env file:

```bash
openssl rand -base64 48
```

## Step 3: start and check the logs

```bash
docker compose up
```

Wait for startup and read the logs for errors before you detach. The docs tell you to open the frontend (port 4007) and the Temporal UI (port 8080). After changing any variable, the docs say to run `docker compose down` and then `docker compose up` so the containers are recreated.

When it works, `http://localhost:4007` shows the sign-up page. Create your account right away.

## Step 4: close registration

Coolify's Postiz service page warns that a fresh deployment allows sign-ups from anyone. Create your account first, then set `DISABLE_REGISTRATION=true` and recreate the containers. Remember that the Postiz reference says this also disables OIDC and OAuth sign-in, so decide before you rely on those.

## Step 5: deploy on Coolify

Coolify lists Postiz as a one-click service, but the Coolify page I read gave no deployment steps and pointed to the Postiz docs for setup. So I cannot give you Coolify-specific click paths as verified fact. Two options follow.

- Use the Coolify one-click service for Postiz if your version lists it, then check each variable against the table above.
- Use Coolify's Docker Compose option with the `postiz-docker-compose` repository, set variables in Coolify's environment UI, and attach a domain to the frontend service on port 4007.

Check the Coolify docs for the exact field names in your version. For the server and project basics, see [host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify) and [Coolify projects and environments](/blogs/coolify-projects-environments-nextjs).

Set `FRONTEND_URL` and `NEXT_PUBLIC_BACKEND_URL` to your final public HTTPS URLs, for example `https://app.example.com`. If you leave them on localhost, the browser cannot reach the backend and OAuth redirects break.

## Step 6: uploads and storage

`STORAGE_PROVIDER` defaults to `local`, with `UPLOAD_DIRECTORY` as the path. Local uploads need a persistent volume, or media disappears when the container is recreated. The other documented value is `cloudflare`, which uses Cloudflare R2 settings (account, keys, bucket name, bucket URL, region). For the R2 side, see [Next.js with Cloudflare R2 and a CDN](/blogs/nextjs-cloudflare-r2-cdn-wrangler).

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Changed a variable but nothing changed | Containers still hold old values | `docker compose down`, then `up` |
| Rotated `JWT_SECRET` | All sessions are invalidated | Everyone signs in again |
| Registration closed, OAuth login gone | The docs say `DISABLE_REGISTRATION` also disables OIDC/OAuth sign-in | Plan your login method first |
| Upgrading across v2.12.0 | Temporal changes | Read the migration guide before pulling |
| Local storage without a volume | Uploads lost on recreate | Mount a persistent volume or use R2 |
| 2 GB server running other apps | The tested size is 2 GB and 2 vCPUs for Postiz alone | Give it its own server or more memory |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Container exits at boot | A required variable is missing; the six core ones are validated on boot | Set all six and recreate |
| Frontend loads but API calls fail | `NEXT_PUBLIC_BACKEND_URL` points to an address the browser cannot reach | Set it to the public backend URL |
| OAuth redirect mismatch when connecting a network | `FRONTEND_URL` does not match the URL registered with the provider | Use the same public HTTPS URL in both places |
| Temporal UI unreachable | Port 8080 is not published or is firewalled | Check the compose ports; keep it private |
| Everyone signed out | `JWT_SECRET` changed | Expected; keep the value stable |
| Anyone can register | `DISABLE_REGISTRATION` not set | Set it to `true` and recreate |

## Security

- Create your account immediately after first start, then disable registration.
- Keep `JWT_SECRET`, database and Redis URLs only in `postiz.env` or Coolify's secret UI. Never commit them or paste them into chat.
- Do not expose the Temporal UI (port 8080) to the internet. It is an admin surface.
- Connected social accounts hold OAuth tokens. Back up the database and store backups privately; see [Postgres backups in Coolify](/blogs/postgres-backups-coolify).
- Keep Redis and Postgres off public interfaces.

## If you use an AI agent for this

An agent can read the compose file and apply changes. Set boundaries.

- Tell it to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print `postiz.env`.
- Make it show destructive commands (volume deletes, `down -v`, DNS changes, force deploys) and wait for approval.
- Give it minimum permissions, and try the stack on a staging server first.

## FAQ

### What do I need to self-host Postiz?
Docker with Compose and a server. The docs say it was tested on an Ubuntu 24.04 VM with 2 GB RAM and 2 vCPUs.

### Which ports does Postiz use?
The frontend is on 4007 and the Temporal UI is on 8080, unless you change them in the variables.

### How do I stop strangers from signing up?
Create your own account first, then set `DISABLE_REGISTRATION=true`. It allows a single signup and then closes sign-up.

### Does Postiz run on Coolify?
Coolify lists it as a service. I could not verify deployment steps from Coolify's page, so use the Postiz variable table and the Coolify Docker Compose docs.

### Where do uploaded images go?
`STORAGE_PROVIDER` defaults to `local`. Set it to `cloudflare` to use R2.

## Next steps

- Get a server ready: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Organise resources: [Coolify projects and environments](/blogs/coolify-projects-environments-nextjs).
- Protect the data: [Postgres backups in Coolify](/blogs/postgres-backups-coolify).

Sources: https://docs.postiz.com/installation/docker-compose, https://docs.postiz.com/self-host/configuration/reference, https://coolify.io/docs/services/postiz
