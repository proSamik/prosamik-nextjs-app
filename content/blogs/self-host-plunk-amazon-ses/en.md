---
title: How to Self-Host Plunk with Amazon SES
seoTitle: How to Self-Host Plunk with Amazon SES (Docker Setup)
description: Self-host the Plunk email platform with Docker Compose and Amazon SES: domains, environment variables, IAM, SNS webhooks, sandbox exit and DNS checks.
category: Self-hosting
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 40
readTime: 11 min
primaryKeyword: self host plunk
keywords: [self host plunk, plunk amazon ses, plunk docker compose, open source email platform, ses sandbox plunk]
related: [move-nextjs-from-vercel-to-coolify, coolify-cron-jobs-nextjs-scheduled-tasks, postgres-backups-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture the DNS and SES console steps once and hand a clean walkthrough to a teammate.
rankizzBlurb: Rankizz tracks how your published pages rank and get cited by AI search, which is useful for a self-hosting guide like this one.
---

Plunk is an open-source email platform for transactional email, contacts, segments, campaigns and automations. Self-hosting means you run the app and its database, and Amazon SES does the actual sending. This guide walks through the documented setup: Docker Compose, the environment variables, the SES side, DNS and the sandbox.

I use Plunk's tooling and have a Coolify server, but I am not going to claim a production self-hosted Plunk deployment of my own. Everything below comes from the official Plunk self-hosting docs and the AWS SES documentation, fetched in November 2026. Plunk is under active development, so treat file names and defaults as things to re-check against the current docs.

## Quick answer

Download `docker-compose.yml` from the `next` branch of the Plunk repository, set the environment variables from the docs, run `docker compose up -d`, and give each service a subdomain (dashboard, API, docs, landing). Create an SES IAM user, an SNS topic with an HTTPS subscription to `/webhooks/sns`, and two configuration sets. Add your sending domain in the Plunk dashboard and publish the DNS records it shows. Request SES production access to leave the sandbox.

```bash
docker compose up -d
docker compose ps
curl -s https://api.example.com/health
```

## Environment

| Item | Value |
| --- | --- |
| Host | A VPS with Docker and Docker Compose (Coolify works, see below) |
| Plunk | Self-hosted, Docker Compose from the `next` branch |
| Sending | Amazon SES, one region |
| Domains | `app.example.com`, `api.example.com`, plus docs and landing subdomains |
| Secrets | Set as variables in the host, never in Git |

## What you run

The Plunk Docker docs describe these services: `plunk` (API, web app, landing, wiki and SMTP, plus nginx), `postgres` (PostgreSQL 16), `redis` (Redis 7 queue), `minio` (S3-compatible storage) and `ntfy` (notifications).

Ports from the docs: 80 for nginx (HTTP), 465 for SMTP with implicit TLS, 587 for SMTP with STARTTLS, 8080 for the API (proxied by nginx and usually not exposed), 9000 and 9001 for the Minio API and web console. Postgres, Redis and Minio stay internal to the Docker network by default. Behind a reverse proxy, expose port 80, plus 465 and 587 only if you use SMTP.

Requirements per the docs: Docker and Docker Compose, an AWS SES account, and a domain you control with a subdomain per service.

## Step 1: plan the domains

Each service gets its own subdomain. The docs list these:

| Subdomain | Service |
| --- | --- |
| `app.example.com` | Dashboard |
| `api.example.com` | API |
| `docs.example.com` | Documentation |
| `www.example.com` | Landing page |
| `smtp.example.com` | SMTP relay (optional) |

Point DNS records for these at your server, then terminate TLS at your reverse proxy. If you do not need the landing page or wiki, they still need values because the domain variables are required.

## Step 2: set the environment variables

The Plunk docs list required variables. The ones you set yourself:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs JWT tokens. The docs suggest `openssl rand -base64 32`. |
| `DB_PASSWORD` | PostgreSQL password for the Compose setup. |
| `API_DOMAIN`, `DASHBOARD_DOMAIN`, `LANDING_DOMAIN`, `WIKI_DOMAIN` | The subdomains above. |
| `USE_HTTPS` | Set to `true` behind a TLS-terminating proxy. Default `false`. |
| `AWS_SES_REGION` | Region where SES is configured. |
| `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY` | Keys for the IAM user with SES send permissions. |

`DATABASE_URL`, `DIRECT_DATABASE_URL` and `REDIS_URL` are listed as required too, but `DATABASE_URL` and `DIRECT_DATABASE_URL` are auto-configured in Docker. The docs say `DATABASE_URL` is typically used through PgBouncer for runtime, and that `DIRECT_DATABASE_URL` is for Prisma migrations and "must bypass any connection pooler". See [PgBouncer with self-hosted Postgres](/blogs/pgbouncer-self-hosted-postgres-nextjs) for why migrations need a direct connection.

Optional ones: `NODE_ENV=production`, `PORT` (API port, default 8080), `SES_CONFIGURATION_SET`, `SES_CONFIGURATION_SET_NO_TRACKING` and `MAIL_FROM_SUBDOMAIN` (default `plunk`).

Generate the secret and keep the values in your host's secret store or a `.env` file that is not committed:

```bash
openssl rand -base64 32
```

Set `NODE_ENV=production` and `USE_HTTPS=true` once TLS is in front.

## Step 3: start the stack

Download the Compose file from the `next` branch of the `useplunk/plunk` repository, put your variables next to it, and start:

```bash
docker compose up -d
docker compose ps
```

All services should show as running. The API serves `/health`, which returns `200` when the process is up, so use it for a probe:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/health
```

Expected: `200`. The docs also note you can run a single service by setting `SERVICE` to `api`, `worker`, `web` or `all` (the default).

### Running it on Coolify

The Plunk docs mention Traefik for Dokploy and Coolify in the SMTP TLS section: mount Traefik's `acme.json` read-only at `/certs/acme.json` and set `SMTP_DOMAIN`, and Plunk extracts the matching certificate. With no certificates mounted, SMTP runs without TLS. The docs do not give a step-by-step Coolify deployment, so I cannot verify the exact clicks. If you deploy Compose on Coolify, map the domains to the `plunk` service on port 80 and keep Postgres, Redis and Minio internal.

## Step 4: set up SES

From the Plunk email setup docs, the AWS side has these parts.

**IAM user.** Create a user (the docs call it `plunk-ses`) with a custom policy allowing the SES actions the docs list, including `ses:SendRawEmail` and `ses:VerifyDomainDkim`. Copy the exact policy from the docs page instead of writing your own from memory. Generate access keys and put them in the two `AWS_SES_*` variables.

**SNS topic.** Create a Standard topic (the docs name it `plunk-ses-events`) and add an HTTPS subscription to `https://api.example.com/webhooks/sns`. Plunk confirms the subscription automatically; if not, the docs say to check the logs for the confirmation URL. Your API must be publicly reachable for this.

**Configuration sets.** Create two. One sends events for Sends, Deliveries, Opens, Clicks, Bounces and Complaints to the SNS topic. The other sends the same events without Opens and Clicks, so projects can turn tracking off. The docs name them `plunk-tracking` and `plunk-no-tracking`, while the environment variable page lists defaults of `plunk-configuration-set` and `plunk-no-tracking-configuration-set`. Those names differ, so create sets with the names you will put in `SES_CONFIGURATION_SET` and `SES_CONFIGURATION_SET_NO_TRACKING`, and set both variables explicitly.

Then restart the stack so the variables load.

## Step 5: add your domain and DNS

In the Plunk dashboard, add the domain you send from. The docs say Plunk handles DKIM setup and shows the DNS records to add. Publish those at your DNS provider, then wait until the dashboard shows the domain as verified.

Optionally set a custom MAIL FROM domain for better DMARC alignment. The docs suggest a subdomain such as `mail.example.com`, plus the MX and TXT records SES displays. Inbound email is optional too: it needs an SES receipt rule set that publishes to SNS and an MX record, and Plunk does not create those for you.

Check records from your terminal:

```bash
dig +short TXT example.com
dig +short CNAME <selector>._domainkey.example.com
```

Use the exact record names from the dashboard. DNS can take time to propagate.

## Step 6: leave the SES sandbox

New SES accounts start in the sandbox, per region. In the sandbox you can only send to verified addresses and domains (or the mailbox simulator), at most 200 messages per 24 hours and 1 message per second. Until you leave it, your campaigns will not reach normal recipients. Request production access from the SES console: open **Account dashboard**, choose **View Get set up page**, then **Request production access**. Choose **Marketing** or **Transactional**, enter your **Website URL**, add contacts, and confirm the acknowledgement that you only send to people who asked for email and handle bounces and complaints. AWS says it responds within 96 hours, and may need more information.

Verifying your domain first is described as a best practice that helps approval. You still have to verify every identity used as From or Return-Path.

## Step 7: send a test

Send one transactional email from the dashboard or API to an address you control. Check that it arrives, passes DKIM, and that delivery events appear in Plunk through the SNS webhook. If events do not appear, the SNS subscription is the first place to look.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| SES account in sandbox | Only verified recipients, 200/day, 1/sec | Request production access. |
| Sandbox is per region | Production in one region does not carry to another | Use the region in `AWS_SES_REGION`. |
| Behind a proxy | URLs may use the wrong protocol | Set `USE_HTTPS=true`. |
| Configuration set names differ from docs | Events or tracking fail | Set both `SES_CONFIGURATION_SET*` variables explicitly. |
| SMTP without certificates | Runs without TLS | Mount a certificate for `SMTP_DOMAIN`. |
| Certificate files in certbot dirs | Container runs as UID 1001 and cannot read root-only dirs | Copy with a deploy hook. |
| Migrations behind a pooler | Migrations fail | Use `DIRECT_DATABASE_URL`. |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Email rejected, recipient not verified | SES sandbox | Verify the recipient or leave the sandbox. |
| SNS subscription stays pending | API not public, or `/webhooks/sns` blocked | Make the API reachable, check logs for the confirmation URL. |
| No open or click data | Wrong configuration set, or tracking disabled | Check `SES_CONFIGURATION_SET` and the set's event destination. |
| Domain never verifies | DNS records missing or not propagated | Re-publish the exact records and wait. |
| Dashboard links use `http://` | `USE_HTTPS` is `false` behind TLS proxy | Set `USE_HTTPS=true` and restart. |
| Health check fails | API container not up | `docker compose logs` for the `plunk` service. |

## Security

- Generate a fresh `JWT_SECRET` and database password. Never commit them.
- Scope the IAM user to the SES actions the docs list. Do not use a root or admin key.
- Keep Postgres, Redis and Minio internal. Do not publish their ports.
- Expose the Minio console (9001) only if you need it, and behind authentication.
- Back up the database: [Postgres backups in Coolify](/blogs/postgres-backups-coolify) covers the pattern.
- Sending email creates abuse risk. Honor unsubscribes, monitor bounces and complaints, and secure the dashboard login.

## If you use an AI agent for this

An agent can read the docs and draft the Compose environment, with these rules.

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste AWS keys or the JWT secret into the chat, and do not let the agent print them. Use `<YOUR_ACCESS_KEY_ID>` in anything you share.
- Make it show destructive commands, including removing volumes, DNS changes and force deploys, and wait for approval.
- Give it minimum permissions: a scoped IAM user and a staging domain first. Never let it send a campaign to a real list on its own.

## FAQ

### Does Plunk need Amazon SES?
Its self-hosting docs list an AWS SES account as a requirement, and the SES variables as required settings.

### What services does the Plunk Compose file run?
`plunk` (API, web, landing, wiki, SMTP and nginx), PostgreSQL 16, Redis 7, Minio and ntfy, per the Docker docs.

### Why can I only send to some addresses?
Your SES account is probably in the sandbox, which only allows verified recipients, 200 messages per day and 1 per second. Request production access.

### Which port does Plunk need public?
Port 80 behind your proxy, plus 465 and 587 if you use the SMTP relay. Keep Postgres, Redis and Minio private.

### Does Plunk need a direct database URL?
Yes for migrations. `DIRECT_DATABASE_URL` must bypass any connection pooler.

## Next steps

- Move your app platform: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
- Schedule jobs that trigger email: [Coolify cron jobs for Next.js](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks).
- Protect the database: [Postgres backups in Coolify](/blogs/postgres-backups-coolify).

If you publish a self-hosting guide, [Rankizz](rankizz:inline-guide-tracking) can track how it ranks and whether AI search cites it.
