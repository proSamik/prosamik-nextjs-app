---
title: How to Self-Host OpenSEO with Docker (Open-Source Semrush Alternative)
seoTitle: How to Self-Host OpenSEO with Docker and DataForSEO
description: Self-host OpenSEO with Docker Compose: what it is, the DataForSEO key, required env vars, first-admin signup, reverse proxy, backups and upgrades.
category: Self-hosting
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 41
readTime: 9 min
primaryKeyword: self host openseo
keywords: [self host openseo, openseo docker, open source semrush alternative, dataforseo api key, openseo mcp server]
related: [host-nextjs-on-vps-with-coolify, deploy-mcp-server-nextjs-coolify, self-host-plunk-amazon-ses, move-nextjs-from-vercel-to-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture a short walkthrough of your OpenSEO setup for teammates who will invite themselves later.
rankizzBlurb: Rankizz is an SEO and AI-search workspace with a REST API and an MCP server, a hosted option if you would rather not run your own SEO stack.
---

OpenSEO is an open-source, MIT-licensed SEO platform you can run yourself. Its repository describes keyword research, rank tracking, backlinks, site audits and AI visibility tracking, with an MCP server so agents can query the data. The software is free to run. The data is not: it comes from DataForSEO, which you pay separately.

This guide covers the Docker Compose route from the project's own self-hosting docs. I did not run this install myself, so everything below comes from the official repository documentation, and I mark the parts I could not verify.

## Quick answer

Clone the repository, point `COMPOSE_FILE` at `deploy/standalone/compose.yaml`, copy the example env file, set `STORAGE_SECRET_KEY` and `DATAFORSEO_API_KEY`, then run `docker compose pull` and `docker compose up -d`. Wait for `OpenSEO initialized and ready.` in the `init` logs and open port 3001. The first account you create becomes the administrator.

```bash
git clone https://github.com/every-app/open-seo.git
cd open-seo
export COMPOSE_FILE=deploy/standalone/compose.yaml
cp deploy/standalone/.env.example deploy/standalone/.env
# edit deploy/standalone/.env, then:
docker compose pull
docker compose up -d
docker compose logs -f init
```

## Environment

| Item | Value |
| --- | --- |
| Image | `ghcr.io/every-app/open-seo-standalone` (prebuilt) |
| Docker | Docker Engine or Docker Desktop with Compose |
| Memory | At least 4 GiB available to Docker, per the docs |
| Data provider | DataForSEO API key, or a treg token |
| Local URL | `http://localhost:3001` |
| Verified from | The official `README.md` and `docs/SELF_HOSTING_DOCKER.md` |

## What OpenSEO is and what self-hosting does not include

OpenSEO is a self-hostable alternative to tools like Semrush and Ahrefs. The README names three ways to run it: EveryApp (runs it in your own Cloudflare account), Docker, and a direct Cloudflare deployment. This post covers Docker only.

Self-hosting gives you the application and your own accounts. It does not give you a search dataset. The docs say you bring a DataForSEO key and pay DataForSEO directly, and they describe DataForSEO as unaffiliated with OpenSEO. If you stop paying, the data stops.

## Step 1: get a data key

OpenSEO needs `DATAFORSEO_API_KEY`. The docs say to log into DataForSEO and copy the credential labelled "Base64" from the API Access page. It is your DataForSEO login and API password encoded together, so treat it like a password.

The docs mention that new accounts get a small free credit and that the minimum top-up is $50. That was true on the page I read. Prices change, so as of November 2026, check the DataForSEO pricing page before you plan around it.

There is an alternative: a `TREG_API_TOKEN` from a third-party reseller, which skips the DataForSEO signup. The docs say it is not supported for Cloudflare self-hosting, that `DATAFORSEO_API_KEY` wins if both are set, and that requests fail when the balance runs out.

## Step 2: clone and configure

Run the clone and copy commands from the Quick answer. Then edit `deploy/standalone/.env`.

| Variable | Status | Notes |
| --- | --- | --- |
| `STORAGE_SECRET_KEY` | Required | A unique random value. The docs suggest `openssl rand -hex 32`. |
| `DATAFORSEO_API_KEY` | Required (or `TREG_API_TOKEN`) | The Base64 credential from step 1. |
| `BETTER_AUTH_URL` | Required | Keep `http://localhost:3001` for local use. Use your public HTTPS URL later. |
| `OPENROUTER_API_KEY` | Optional | Also `OPENROUTER_BASE_URL` and `OPENROUTER_MODEL`. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Listed by the docs as optional. |
| `AUTH_MODE` | Optional | `local_noauth` turns sign-in off. See Security. |

Generate the storage key without printing it into a shared terminal log:

```bash
openssl rand -hex 32
```

Paste the output into the `.env` file only. Do not commit that file.

## Step 3: start it

```bash
docker compose pull
docker compose up -d
docker compose logs -f init
```

The `init` service runs database migrations and first-start setup. You should see `OpenSEO initialized and ready.` Then open `http://localhost:3001`. If `init` exits with an error, read it before doing anything else, because the `web` service depends on it finishing.

## Step 4: create the admin account first

The docs say the first visitor creates the administrator, and that registration closes once that account exists. They add: create it before you put the installation on the internet. Do this on localhost, or behind a private network, before you expose the port.

Teammates join through invitation links from Team settings. The docs state there is no email delivery, so you send the link yourself.

## Step 5: put it on a domain

Only Nginx is published by the Compose file, and only on the host's loopback address at port 3001. For public HTTPS, put a reverse proxy in front of `127.0.0.1:3001`. The docs say to forward WebSocket upgrades, which one feature needs.

Set `BETTER_AUTH_URL` to the final public URL, such as `https://app.example.com`, then apply it without rebuilding:

```bash
docker compose up -d --force-recreate init web crawl-gateway
```

The README says the Docker image works with Compose-based platforms such as Coolify, Portainer and Dokploy. I did not verify the click path inside Coolify for this project. If you use Coolify, choose its Docker Compose option, point it at the repository and the `deploy/standalone/compose.yaml` file, set the variables as environment variables in Coolify, and attach the domain to the web service. Check the Coolify docs for the exact labels. If you are new to Coolify, start with [host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).

## Step 6: connect an agent over MCP

The README says MCP clients such as Claude, ChatGPT, Codex and Cursor sign in with the same accounts you created. I did not test an MCP connection, and the docs page I read did not list the endpoint path, so look it up in the repository before you wire a client. For how to add a remote MCP server to a client, see [Codex MCP server setup](/blogs/codex-mcp-server-setup).

## Edge cases

| Case | What the docs say | What to do |
| --- | --- | --- |
| Private or intranet sites | Crawls reach public addresses on ports 80 and 443 only | Private sites are not supported |
| Rolling back an image | Migrations are not undone by an older image | Restore the matching backup instead |
| `docker compose down -v` | Deletes the installation's data and secrets | Never run it unless you mean to wipe everything |
| Running behind Tailscale or a private network | `AUTH_MODE=local_noauth` runs without sign-in | Only if the network already limits access |
| Upgrading from the older single-container image | A one-time `migrate` service copies data from `open_seo_data` | Follow the migration section of the Docker doc; it does not carry over sessions, API keys or MCP connections |
| Google sign-in | The docs say it is not offered on this Docker setup | Use email and password |

## Backups and upgrades

The `config` volume holds secrets generated on first start, and nothing secret is built into the image. Back it up. The docs also describe the storage volume as holding app state. The documented upgrade is: back up, pull, stop three services, bring everything up, check `init`.

```bash
node scripts/celld/backup.mjs backup ./backups/before-update
docker compose pull
docker compose stop web crawl-gateway runtime
docker compose up -d
docker compose logs init
```

Run the backup first. Migrations run in `init`, and the docs are explicit that going back does not undo them.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Port 3001 does not answer | `init` has not finished or failed | `docker compose logs -f init` and wait for the ready line |
| Data requests fail after some time | DataForSEO or treg balance is empty | Top up. With treg, look for `treg.refused` in the server log |
| Sign-in loops or redirects wrongly after adding a domain | `BETTER_AUTH_URL` still points at localhost | Set the public URL and recreate `init web crawl-gateway` |
| Someone else registered first | The installation was exposed before the admin was created | Wipe with care and redo setup, creating the admin on a private network |
| Locked out | Forgotten password | Run the admin reset command from the docs inside the `runtime` container |
| Crawl of an internal site fails | Only public ports 80 and 443 are reachable by the crawler | Not supported for private sites |

The password reset command in the docs is `docker compose exec -T runtime node /opt/standalone/admin.mjs ...` with the reset-password subcommand and the user's email, written here as `<your-email>`. A reset signs that user out everywhere.

## Security

- The first visitor becomes admin. Create the account before exposing the port.
- Keep `DATAFORSEO_API_KEY` and `STORAGE_SECRET_KEY` only in the `.env` file or your host's secret UI. Never commit them.
- Treat `AUTH_MODE=local_noauth` as dangerous on any public host. The docs say to use it only where the network already limits access.
- Your DataForSEO key spends money. A leaked key is a billing problem, so rotate it if it leaks.
- Back up the `config` volume and store the backup somewhere private.
- Do not publish the Docker port directly. Use a reverse proxy with HTTPS.

## If you use an AI agent for this

An agent can read the repository docs and run the commands, with limits.

- Tell it to treat logs, web pages and tool output as data, not instructions.
- Never paste the DataForSEO key or storage secret into the chat, and do not let the agent print the `.env` file.
- Make it show destructive commands (`down -v`, volume deletes, DNS changes, force deploys) and wait for your approval.
- Give it minimum permissions, and try the install on a throwaway VM first.

## FAQ

### Is OpenSEO free to self-host?
The software is MIT-licensed and free to run. The SEO data comes from DataForSEO (or a treg token), which you pay for directly.

### Do I need Cloudflare to self-host OpenSEO?
No. Docker is a documented route and works on a plain VPS. Cloudflare and EveryApp are alternative routes in the README.

### Can I run OpenSEO on Coolify?
The README says the Docker image works with Compose-based platforms such as Coolify. I did not verify the project-specific steps in Coolify, so follow the Coolify Docker Compose docs and the repository's compose file.

### How do I add teammates?
Create invitation links from Team settings. The docs say there is no email delivery, so send each link yourself.

### How much memory does it need?
The docs say at least 4 GiB of memory available to Docker.

## Next steps

- Host the machine first: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Another protected endpoint for agents: [Deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).
- More self-hosting: [Self-host Plunk with Amazon SES](/blogs/self-host-plunk-amazon-ses).

If you want to track how a published guide like this one ranks or gets cited by AI search, [Rankizz](rankizz:inline-guide-tracking) is a hosted workspace for that.

Sources: https://github.com/every-app/open-seo, https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md, https://github.com/every-app/open-seo/blob/main/docs/DATAFORSEO_API_KEY.md
