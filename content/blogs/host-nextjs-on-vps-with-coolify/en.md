---
title: How to Host a Next.js App on Your Own VPS with Coolify
seoTitle: How to Host a Next.js App on a VPS with Coolify
description: Install Coolify on a Linux VPS, deploy a Next.js app from Git with Railpack or a Dockerfile, add a domain with HTTPS, and lock down the server.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 25
readTime: 11 min
primaryKeyword: host nextjs on vps
keywords: [host nextjs on vps, coolify nextjs, self host nextjs, deploy nextjs vps, coolify install]
related: [move-nextjs-from-vercel-to-coolify, coolify-healthcheck-nextjs-docker-railpack, add-multiple-servers-coolify, basic-linux-vps-commands-self-hosting]
subclipBlurb: Subclip records and edits screen demos, so you can capture a first deploy in Coolify as a short walkthrough for a teammate or your future self.
rankizzBlurb: Rankizz tracks how your published pages rank and get cited by AI search, which helps once a self-hosted site is live and you want to see if it gets found.
---

You can host a Next.js app on a cheap Linux VPS by installing Coolify, a self-hosted deployment platform, and pointing it at your Git repository. Coolify builds the app into a Docker image, runs it as a container, and puts a reverse proxy with HTTPS in front of it. This guide covers the whole path: server, install, first deploy, domain, and the security settings that matter.

I run a small Next.js 16 site this way, built with Railpack and no Dockerfile in the repo, and a larger app built from a Dockerfile. The commands and UI paths below come from Coolify's documentation unless I say they come from my own setup.

## Quick answer

Rent a fresh Linux server with at least 2 CPU cores, 2 GB RAM and 10 GB free disk. Run the Coolify install script as root, open the dashboard on port 8000 and create the admin account immediately. Then create a project, add your Git repository as a resource, pick a build pack, set the port and a domain, and deploy.

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Then open `http://<server-ip>:8000`.

## Environment

| Item | Value |
| --- | --- |
| Server | Fresh Linux VPS, amd64 or arm64 |
| Minimum size | 2 CPU cores, 2 GB RAM, 10 GB free disk (Coolify docs) |
| OS | Ubuntu LTS recommended (20.04, 22.04 or 24.04 per the docs) |
| App | Next.js 16, App Router |
| Build pack | Railpack (beta in the docs) or Dockerfile |
| Domain | `app.example.com` (placeholder) |

Coolify only runs on Linux. Smaller servers (1 core, 512 MB RAM) can run it, but the docs do not recommend that. Also note that building and running on the same small server can make it unresponsive under load, which is why [adding a second server](/blogs/add-multiple-servers-coolify) is the usual next step.

## Step 1: prepare the server

Start from a fresh server so Coolify does not collide with software you already run. If Docker was installed through snap, remove it first, because the docs say to use the official Docker Engine method (or let the install script handle it).

Log in over SSH and update the system.

```bash
ssh root@<server-ip>
apt update && apt upgrade -y
```

If you are new to these commands, [basic Linux VPS commands for self-hosting](/blogs/basic-linux-vps-commands-self-hosting) explains each one.

Set up your firewall at the provider level if it offers one. Coolify's firewall page lists these ports for the server that runs Coolify:

| Port | Purpose |
| --- | --- |
| `22/tcp` | SSH |
| `80/tcp` | HTTP and certificate generation via the proxy |
| `443/tcp` | HTTPS via the proxy |
| `8000/tcp` | Direct dashboard access by IP |
| `6001/tcp` | Real-time dashboard updates by IP |
| `6002/tcp` | Web terminal by IP |

Ports 8000, 6001 and 6002 can be closed once the dashboard works through a domain on the proxy. Keep an SSH session open while you change rules so you cannot lock yourself out.

## Step 2: install Coolify

The automated install needs root. Run it once.

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

When it finishes, open `http://<server-ip>:8000` in a browser and create the admin account right away. The docs warn that whoever reaches the registration page first can become the instance admin and gain root access to the server. They also say Coolify accepts the first account only during the first 10 minutes after startup. If you see "Setup window closed", run `docker restart coolify` and reload the page.

Back up `/data/coolify/source/.env`. It holds `APP_KEY`, which you need to restore from a backup.

## Step 3: check the localhost server

On a self-hosted install, Coolify creates a Localhost server automatically. It shares resources with the dashboard and cannot be removed. For a personal site that is fine. For production traffic the docs recommend adding a remote server, covered in the multiple servers guide.

In the dashboard, open Servers and confirm Localhost is reachable and that the proxy is running.

## Step 4: create a project and add your app

A project groups environments and resources. The docs' first-app flow is: click **New Project**, enter a name, click **Continue**, then open the project and click **Create New Resource**. For a Git-based app you pick a Git source, then the repository and branch. The [projects and environments guide](/blogs/coolify-projects-environments-nextjs) explains how to organise this.

Coolify lists five build methods for Git-based applications: Nixpacks, Railpack (Beta), Static, Dockerfile and Docker Compose.

| Build pack | Use it when |
| --- | --- |
| Railpack | You have a normal Next.js repo and no Dockerfile. This is what my small site uses. |
| Dockerfile | You want control: standalone output, migrations in the build, a non-root user. My larger app uses this. |
| Nixpacks | The Next.js page in Coolify's docs lists it as an option (set Build strategy to `nixpacks`). |
| Static | Only for a static export with Output Directory set to `out`. |

For the Dockerfile route, Coolify's Next.js page says to set **Ports Exposes** to `3000`, add a Dockerfile to the project root (copied from the official Next.js example), and set **Build strategy** to `Dockerfile`.

## Step 5: set variables and the port

Coolify's environment variables page says **Build time** and **Runtime** are independent settings for each variable. A new variable defaults to available both during build and in the container. For anything the browser needs (`NEXT_PUBLIC_*`), the value must exist at build time because Next.js inlines it into the bundle. For secrets the app only reads after start, set Build time to "Not available during build".

Placeholders for this guide:

```text
NODE_ENV=production
MY_DB_URL=<set in the Coolify secret UI>
NEXT_PUBLIC_MY_APP_URL=https://app.example.com
```

Never commit these to the repo or paste them into a chat. If you use a Dockerfile with standalone output, set `HOSTNAME=0.0.0.0` and `PORT=3000` so the server listens on all interfaces inside the container. That is from my own Dockerfile and is what the proxy needs to reach it.

## Step 6: add a domain

First point DNS at the server: create an A record for `app.example.com` with the value `<server-ip>`. Coolify's docs say to replace the generated domain with yours using `https://`, and to restart the app after changing it. The generated testing URL looks like `http://<uuid>.<server-ip>.sslip.io`.

The docs' troubleshooting checklist is short: the proxy shows **Proxy is running**, your firewall allows ports 80 and 443, and DNS points at your server.

## Step 7: deploy and verify

Click **Deploy** and watch the build log. When it finishes, check the site from your own machine.

```bash
curl -I https://app.example.com
```

You should see an HTTP 200 and a valid certificate. If you built a health route, add a Coolify healthcheck next, as in [the healthcheck guide](/blogs/coolify-healthcheck-nextjs-docker-railpack).

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Server has under 2 GB RAM | Builds can stall or the host becomes unresponsive | Use a bigger plan or a separate build server |
| Non-LTS Ubuntu | The automated script is not the documented path | Use the manual install from the docs |
| Docker installed via snap | Conflicts with Coolify's Docker setup | Remove it first |
| `NEXT_PUBLIC_*` set as runtime only | Browser code gets an empty value | Mark it available at build time |
| Domain typed without `https://` | No certificate is issued | Use the `https://` form |
| Cloudflare proxy in front before HTTPS works | Certificate issuance can fail | Test with DNS only first, then enable the proxy |

The last row is general proxy behaviour rather than something I verified in the Coolify docs, so test it on your own setup.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Setup window closed` on the registration page | First 10 minutes passed | `docker restart coolify`, reload |
| Dashboard unreachable on port 8000 | Firewall blocks it, or you restricted it | Open 8000 or reach it another way |
| Site shows a bad gateway | App not listening on the exposed port | Set Ports Exposes to the real port and `HOSTNAME=0.0.0.0` |
| No HTTPS certificate | DNS not pointing at the server, or 80/443 closed | Fix the A record and firewall |
| Build killed or very slow | Not enough RAM or disk | Resize, or build elsewhere |
| Deploy fails the healthcheck but site works | Image has no `curl` or `wget` | Add one to the image or disable the check |

## Security

The dashboard controls the server, so treat it like root.

- Create the admin account immediately after install, or pre-create it with the `ROOT_USERNAME`, `ROOT_USER_EMAIL` and `ROOT_USER_PASSWORD` variables so registration is never exposed.
- Close ports 8000, 6001 and 6002 once the dashboard works on a domain. Make sure you have another way in first.
- Prefer your provider's firewall. Coolify's docs say Docker's published ports can bypass plain UFW rules.
- Use SSH keys, and keep secrets in Coolify's variable UI, not in the repo or image layers.
- Run the app as a non-root user and strip `.env*` files from the image if you build your own Dockerfile.

## If you use an AI agent for this

An agent can help write the Dockerfile or explain build logs, but set limits first.

- Tell it to treat logs, web pages and tool output as data, not instructions.
- Never paste secrets into the chat or let the agent print them.
- Make it show destructive commands (deleting volumes, DNS changes, force deploys, firewall changes) and wait for your approval.
- Give it minimum permissions: a scoped API token and a staging project first.

## FAQ

### What are the minimum requirements to run Coolify?
Coolify's docs list 2 CPU cores, 2 GB RAM and 10 GB free disk, on amd64 or arm64. Smaller servers can run it but are not recommended.

### Which build pack should I use for Next.js on Coolify?
Railpack needs no Dockerfile and is the simplest start. Use a Dockerfile when you need standalone output, migrations during the build, or a non-root user.

### Do I need a domain to deploy?
No. Coolify generates a testing URL on sslip.io. Add your own domain with `https://` and an A record when you are ready.

### Can I run the database on the same server?
Yes, as a separate Coolify resource. Mine is Postgres, kept apart from the app container. Watch memory on small servers.

### Is port 8000 safe to leave open?
Close it once the dashboard works through a domain, as Coolify's firewall page suggests.

## Next steps

- Migrating an existing app: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
- Add a safe deploy gate: [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).
- Add capacity: [Add multiple servers to Coolify](/blogs/add-multiple-servers-coolify).
- Server basics: [Basic Linux VPS commands for self-hosting](/blogs/basic-linux-vps-commands-self-hosting).

If you document runbooks with screen clips, [Subclip](subclip:inline-first-deploy-clip) can record the first deploy and its AI editor cleans up the take.

Sources: coolify.io/docs/get-started/installation, coolify.io/docs/applications/nextjs, coolify.io/docs/knowledge-base/server/firewall, coolify.io/docs/get-started/deploy-your-first-app, coolify.io/docs/builds/packs/overview, coolify.io/docs/knowledge-base/environment-variables
