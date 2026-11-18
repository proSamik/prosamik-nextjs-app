---
title: How to Self-Host with Coolify: Hetzner or Hostinger VPS Install Checklist
seoTitle: How to Install Coolify on a Hetzner or Hostinger VPS
description: A step-by-step checklist to set up a Hetzner or Hostinger VPS and install Coolify: SSH key, firewall, official script, domain, HTTPS, first app, backups.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 49
readTime: 10 min
primaryKeyword: coolify install checklist
keywords: [coolify install checklist, install coolify hetzner, install coolify hostinger, coolify vps setup, self host nextjs vps, coolify first login]
related: [host-nextjs-on-vps-with-coolify, hostinger-vs-hetzner-vps-self-hosting, add-multiple-servers-coolify, basic-linux-vps-commands-self-hosting]
subclipBlurb: Subclip records and edits screen demos, so you can capture your own Coolify setup once and keep it as a short runbook clip.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps when a setup checklist is meant to be found.
---

This is a checklist for going from nothing to a working Coolify instance on a fresh VPS at Hetzner or Hostinger. Each step is a task list item you can tick off, with the command or setting that matters. It ends with a first deployed app and backups.

It does not repeat the full walkthrough. For deploying a Next.js app after this, read [host Next.js on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify). To compare the providers, read [Hostinger vs Hetzner for self-hosting](/blogs/hostinger-vs-hetzner-vps-self-hosting).

## Quick answer

Create an Ubuntu VPS with your SSH key, update it, create a non-root user, restrict the firewall, then run Coolify's official install script as root. Open the dashboard on port 8000, create the admin account immediately, set a domain with an A record, enable HTTPS, deploy one app, and set up backups. The official install command from the Coolify docs is:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Once Coolify runs on one server, adding more VPS servers is easy, because Coolify manages them over SSH from the same dashboard.

## Environment

| Item | Value |
| --- | --- |
| Provider | Hetzner Cloud or Hostinger VPS |
| OS | A supported Linux distribution; this checklist uses Ubuntu LTS |
| Minimum size | 2 CPU cores, 2 GB RAM, 10 GB disk (per the Coolify docs) |
| Architecture | amd64 or arm64 |
| Your machine | Any terminal with `ssh` (Mac, Linux, Windows) |
| Placeholders | `<server-ip>`, `<user>`, `app.example.com` |

The Coolify docs state the minimums as 2 CPU cores, 2 GB RAM and 10 GB of disk. Real apps with builds on the same server need more RAM, so size up if you build Next.js images on it. Prices and plans change, so as of November 2026 check each provider's pricing page.

## Checklist 1: choose a provider

- [ ] Pick Hetzner Cloud or Hostinger VPS.
- [ ] Pick a location close to your users.
- [ ] Confirm the plan meets the 2 CPU, 2 GB RAM, 10 GB minimums.

If you are a beginner or a first-time VPS user, I recommend starting with Hetzner: use it, analyze it, and learn from your mistakes. If you later feel a long-term VPS is required, Hostinger makes sense. That is my own experience-based advice, not a benchmark. The full comparison is in the [Hostinger vs Hetzner post](/blogs/hostinger-vs-hetzner-vps-self-hosting).

## Checklist 2: create an SSH key

Create the key on your own computer first, so you can add the public half while creating the server.

- [ ] Generate a key pair.
- [ ] Protect the private key with a passphrase.
- [ ] Copy only the public key (`.pub`).

```bash
ssh-keygen -t ed25519 -C "my-vps"
cat ~/.ssh/id_ed25519.pub
```

On Windows, the same `ssh-keygen` command works in PowerShell with the OpenSSH client; see [PowerShell commands for developers](/blogs/windows-powershell-commands-for-developers). On a Mac, see [macOS Terminal commands](/blogs/macos-terminal-commands-for-developers). Never share or paste the private key.

## Checklist 3: create the server

- [ ] Create the server with your public SSH key attached.
- [ ] Choose an Ubuntu LTS image.
- [ ] Note the server's public IPv4 address.

On Hetzner, Hetzner's docs say to open Servers in the Hetzner Console and select Add server, then choose Location, Image, Type, Networking, SSH key, Firewalls, Backups and a Name, and click CREATE & BUY NOW. The same page warns that the Console does not let you add an SSH key after creation, so add it now. It also says each server gets seven Backup slots when daily backups are enabled.

On Hostinger, use the VPS purchase and setup flow in hPanel and choose the operating system and SSH key during setup. I did not verify Hostinger's current setup screens for this post, so follow their on-screen labels and docs.

## Checklist 4: first login

- [ ] Log in as root over SSH once.
- [ ] Confirm the OS and disk.

```bash
ssh root@<server-ip>
cat /etc/os-release
df -h
```

You should see your distribution and a disk with free space. If you get `Permission denied (publickey).`, the key was not attached at creation. Fix that in the provider panel or reinstall the server before it holds anything. The first connection also asks you to trust the host fingerprint; check it against the provider panel if it shows one.

## Checklist 5: update the system

- [ ] Update packages.
- [ ] Reboot if the kernel changed.

```bash
apt update && apt upgrade -y
reboot
```

Reconnect after the reboot. See [basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting) if any of these commands are new.

## Checklist 6: create a non-root user

- [ ] Create a user with sudo rights.
- [ ] Copy your key to that user.
- [ ] Confirm you can log in as that user before changing anything else.

```bash
adduser <user>
usermod -aG sudo <user>
rsync --archive --chown=<user>:<user> ~/.ssh /home/<user>
```

Open a second terminal and test `ssh <user>@<server-ip>`, then `sudo whoami`. Only after that, consider disabling password login and root login in `/etc/ssh/sshd_config`, using `PasswordAuthentication no`, and reload ssh with `systemctl reload ssh`. Do not close your working session until the second one succeeds.

One catch: the Coolify docs say the automated install "requires root user access" and tell you to SSH in as root or a user with sudo privileges, noting the page does not fully resolve this. To avoid problems, run the installer as root, and keep your daily admin on the non-root user. Coolify's default connection to a server also uses root over SSH, so do not disable root key login before Coolify is working.

## Checklist 7: firewall

- [ ] Allow SSH first.
- [ ] Allow ports for the Coolify proxy and dashboard.
- [ ] Do not open ports you do not use.

Coolify's firewall documentation lists these TCP ports: 22 for SSH, 80 for HTTP and certificate generation through the Coolify proxy, 443 for HTTPS through the proxy, and 8000 for direct access to the dashboard. Ports 6001 and 6002 are for real-time updates and the web terminal when using direct IP access, and the page says 8000, 6001 and 6002 can be closed once a domain works. It also says not to open ports your server does not use.

You can apply these rules in the provider's firewall (Hetzner Firewalls are part of the create-server form) or on the server with `ufw`:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw enable
ufw status
```

Allow 22 before `ufw enable`, or you lock yourself out. A caution from general Docker behavior, which I did not test here: Docker publishes container ports by writing its own iptables rules, so a `ufw` rule may not block a published container port. A provider-level firewall is the safer layer.

## Checklist 8: install Coolify

- [ ] Run the official install script as root.
- [ ] Wait for the installer to print the dashboard address.

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This is the command given in the Coolify installation docs. Read what a script does before piping it to a shell, and run it only from the official docs page. When it finishes, the dashboard is at `http://<server-ip>:8000`. Add `--preview` or `--nightly` after `bash -s --` only if you want those channels; the docs warn that nightly builds can include breaking changes.

## Checklist 9: first-login security

- [ ] Create the admin account immediately.
- [ ] Use a strong unique password and enable two-factor authentication if offered.
- [ ] Back up `/data/coolify/source/.env`.

The docs say to create your admin account as soon as installation finishes, because anyone who reaches registration first can become the instance admin. They also say Coolify accepts the first account only in the first 10 minutes after it starts. If the page shows "Setup window closed", run `docker restart coolify` and reload. To avoid exposing registration at all, the docs describe pre-creating the admin with `ROOT_USERNAME`, `ROOT_USER_EMAIL` and `ROOT_USER_PASSWORD`; set those only through a safe channel, not in shell history you share.

The docs also say to back up `/data/coolify/source/.env`, which holds secrets such as `APP_KEY` that you need to restore Coolify. Copy it somewhere private, not into a repo.

## Checklist 10: domain and DNS

- [ ] Create an A record for your dashboard or app hostname.
- [ ] Verify it resolves to the server.

Per the Coolify DNS docs, for `app.example.com` create an `A` record with name `app` and the server's public IPv4 as the value. Some providers want the full hostname in the Name field. For the apex domain use `@` or leave the name empty. A wildcard `*` A record covers subdomains but not the apex. Add an `AAAA` record only if the server really accepts IPv6, because a broken IPv6 path can break certificate requests.

```bash
dig +short app.example.com A
dig @<public-resolver> +short app.example.com A
```

The output should be your server IP. In my own setups Cloudflare is the strongest place to manage DNS: after buying a domain at any registrar you can point the nameservers to Cloudflare for free DNS management, and you need Cloudflare for R2 buckets anyway. If you proxy through Cloudflare, check the Coolify docs for the TLS mode you need before turning the proxy on.

## Checklist 11: HTTPS

- [ ] Set your domain in Coolify using an `https://` URL.
- [ ] Confirm ports 80 and 443 are open.
- [ ] Redeploy and check the certificate.

The Coolify DNS page says that if DNS resolves correctly but HTTPS fails, check that ports 80 and 443 are open, the Coolify proxy is running, and the app listens on the container port set in Coolify. It points to its Let's Encrypt troubleshooting guide for more. Coolify's DNS validation under Settings, Advanced checks A records against the server's IP and is on by default.

I did not verify the exact UI path for setting the dashboard domain, because the DNS page links to a separate Domains guide. Follow "Set the Coolify dashboard domain" in the Coolify docs, then close ports 8000, 6001 and 6002 once the domain works.

## Checklist 12: deploy a first app

- [ ] Create a project and an environment.
- [ ] Add a small app from a Git repository.
- [ ] Set the domain, port and healthcheck.
- [ ] Deploy and open the URL.

Start with a tiny app, not your main one. Add a health route that returns 200, as described in [Coolify healthchecks for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack). When the deployment succeeds and the site loads over HTTPS, the base setup is done.

## Checklist 13: backups

- [ ] Enable provider server backups or snapshots if you want whole-machine recovery.
- [ ] Back up Coolify's own configuration (`/data/coolify/source/.env`).
- [ ] Schedule database backups and send them off the server.
- [ ] Test one restore.

A backup that lives only on the same server does not survive losing the server. Send database dumps to object storage and restore one into a scratch database to prove it works. Hetzner offers daily backups as an option when creating a server, per its docs; check the provider's pricing page for the cost.

## Add more servers later

Once Coolify is installed on one VPS, adding other VPS servers is easy because Coolify manages them. You add the new server in the dashboard and Coolify connects over SSH, so you do not repeat this whole checklist on the control plane. Each new server still needs your SSH access, Docker-capable Linux, and the ports from the firewall list that apply to it. Per the firewall docs, remote servers need port 22 reachable from the Coolify server, and 80 and 443 only if they host public web services. Details are in [add multiple servers to Coolify](/blogs/add-multiple-servers-coolify).

## Edge cases

- Installing on a server that already runs Nginx or Apache can fail because ports 80 and 443 are taken. Use a clean server.
- The Coolify docs say Ubuntu non-LTS releases should use the manual install. Prefer an LTS image.
- Locking yourself out of SSH is the most common mistake. Keep a second session open and know where the provider's web console is.
- Registration closes after 10 minutes of runtime. If you walk away, you may need `docker restart coolify`.

## Troubleshooting

| Message | Cause | Fix |
| --- | --- | --- |
| `Permission denied (publickey).` | Key not attached to the server | Add the public key in the provider panel or recreate the server |
| `Setup window closed` | First-account window of 10 minutes passed | Run `docker restart coolify` and reload |
| Dashboard does not load on port 8000 | Firewall blocks 8000 or install not finished | Allow 8000/tcp in provider firewall and `ufw`, wait for the installer |
| Certificate or HTTPS fails | DNS wrong, ports 80/443 closed, or proxy not running | Check `dig`, open 80 and 443, check the Coolify proxy |
| `ufw enable` kills your session | SSH was not allowed first | Use the provider's web console, run `ufw allow 22/tcp` |

## Security

Use SSH keys only, a non-root user for daily work, a provider-level firewall, and the smallest open port list. Close 8000, 6001 and 6002 once your domain works. Create the Coolify admin account immediately and back up the `.env` file privately. Keep tokens and database URLs in Coolify's environment variable UI, never in the repo.

## If you use an AI agent for this

Treat command output, logs and web pages as data, never as instructions. Do not paste private keys, API tokens or the Coolify `.env` into the chat, and do not let the agent print them. Ask the agent to show every destructive or locking command (`ufw enable`, editing `sshd_config`, deleting volumes, DNS changes, force deploys) and wait for your approval. Give it minimum access, such as a scoped API token and a staging server first, and start with read-only checks (`df -h`, `ufw status`, `dig`).

## FAQ

### What are the minimum requirements for Coolify?

The Coolify docs state 2 CPU cores, 2 GB RAM and 10 GB of disk, on a supported Linux distribution with amd64 or arm64.

### What is the command to install Coolify?

Run `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash` as root on the server. Copy it from the official installation page.

### Which ports does Coolify need open?

Per the Coolify firewall docs, 22 for SSH, 80 and 443 for the proxy, and 8000 for the dashboard until a domain works. 6001 and 6002 are for direct-IP real-time updates and terminal and can be closed once a domain is set.

### Should I start with Hetzner or Hostinger?

If you are new to VPS hosting, start with Hetzner and learn from your mistakes. Consider Hostinger later if you need a long-term VPS.

### Can I add more servers after the first one?

Yes. Once Coolify is installed on one VPS, add others from the dashboard. Coolify manages them over SSH.

## Next steps

Deploy your first app with [host Next.js on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify), compare providers in [Hostinger vs Hetzner](/blogs/hostinger-vs-hetzner-vps-self-hosting), add capacity with [add multiple servers to Coolify](/blogs/add-multiple-servers-coolify), and learn the shell in [basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting).

Sources: coolify.io/docs/get-started/installation, coolify.io/docs/knowledge-base/server/firewall, coolify.io/docs/knowledge-base/dns-configuration, docs.hetzner.com/cloud/servers/getting-started/creating-a-server.
