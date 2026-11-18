---
title: How to Use Cloudflare Tunnel: Expose Local Apps, Home PCs and Coolify
seoTitle: How to Use Cloudflare Tunnel for Local Apps and Coolify
description: Set up Cloudflare Tunnel with cloudflared to expose a local app, home computer or Coolify server without opening ports, plus Access rules and safe limits.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 54
readTime: 11 min
primaryKeyword: cloudflare tunnel
keywords: [cloudflare tunnel, cloudflared, cloudflare tunnel coolify, expose localhost to internet, cloudflare tunnel home server, cloudflare zero trust access]
related: [hetzner-hostinger-vps-coolify-install-checklist, tailscale-guide, host-nextjs-on-vps-with-coolify, ai-agent-control-cloudflare-wrangler]
subclipBlurb: Subclip records and edits screen demos, so you can capture the tunnel setup once and share it as a short walkthrough with a teammate.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps once a self-hosted site behind a tunnel starts getting traffic.
---

Cloudflare Tunnel lets a machine publish a web app, an SSH server or a remote desktop to the internet without opening any inbound port. A small program called `cloudflared` runs on your machine and makes an outbound connection to Cloudflare, and Cloudflare sends visitors back through that connection. This guide shows how to use it for a laptop dev server, a home computer, and a Coolify server on a VPS.

You need a domain whose nameservers are on Cloudflare, a free Cloudflare account, and a machine that can make outbound connections.

## Quick answer

In the Cloudflare dashboard open Networking, Tunnels, create a tunnel, run the install command it shows on your machine, then add a Published application route that maps a hostname to a local address like `http://localhost:3000`. The tunnel shows Healthy when it is connected. Nothing needs to be opened on your router or your VPS firewall.

```bash
# macOS
brew install cloudflared
# then run the exact "install and run connector" command the dashboard shows for your OS
```

## Environment

| Item | Value |
| --- | --- |
| Tunnel software | `cloudflared`, the connector daemon |
| Managed from | Cloudflare dashboard (remotely-managed tunnel) |
| Domain | Added to Cloudflare, nameservers pointing to Cloudflare |
| Targets | `localhost` apps, home computers, a Coolify VPS |
| Outbound requirement | The machine must reach Cloudflare on port 7844 |

## How it works

Cloudflare's documentation says `cloudflared` starts an outbound connection from your origin, through your firewall, to Cloudflare's global network, and traffic then flows both ways over that connection. Because of that, you can block all inbound traffic and the origin is reachable only through Cloudflare. Most firewalls already allow outbound traffic, so it works from behind home routers and carrier NAT, where port forwarding is impossible.

A tunnel is a persistent object, and you can run several connectors for one tunnel. Each connector sends traffic to its nearest Cloudflare data center. A tunnel can expose HTTP servers, SSH servers, remote desktops and other protocols.

## Why use it from day one

- **No open ports.** Your server's real IP stops being a target, since nothing answers on 80 or 443.
- **Works behind NAT.** A home PC or a laptop can serve a site with no router changes and no static IP.
- **Free HTTPS** at Cloudflare's edge, plus caching, WAF and rate-limit rules from the same account.
- **One place for DNS.** The hostname is created for you when you add the route.

The trade-offs are real. Traffic is routed through Cloudflare, you add a dependency (if Cloudflare or the connector is down, so is the site), and large uploads and streaming have Cloudflare's usage terms to respect. Read those terms before tunnelling video or file hosting.

## Step 1: create the tunnel

1. In the Cloudflare dashboard go to **Networking > Tunnels** and choose **Create a tunnel**.
2. Name it after what it connects, for example `home-lab` or `vps-apps`.
3. Pick your operating system and run the install command the dashboard displays on the machine. Use the dashboard's command, because it contains the tunnel's secret token and the exact service syntax.
4. Wait for the connection, then continue.

Never paste that token into a repo, a chat or an AI agent. Treat it as a password: anyone who has it can run a connector for your tunnel. If it leaks, delete and recreate the tunnel.

## Step 2: install cloudflared (per OS)

| OS | How |
| --- | --- |
| macOS | `brew install cloudflared` |
| Linux | Cloudflare's package repository, or the `.deb` / `.rpm` from the latest GitHub release |
| Windows | The `.msi` from the latest GitHub release (Windows installs do not auto-update, so update manually) |

Then run the command from the dashboard. It installs `cloudflared` as a service so the tunnel starts at boot and reconnects after a network drop. Check it:

```bash
cloudflared --version
# Linux with systemd:
systemctl status cloudflared
```

On the dashboard the tunnel should show `Healthy`. If it shows `Inactive`, `Down` or `Degraded`, the first thing to test is whether the machine can reach Cloudflare on outbound port 7844.

## Step 3: publish an app

1. Open **Networking > Tunnels**, select your tunnel, go to **Routes**.
2. Choose **Add route**, then **Published application**.
3. Enter a subdomain and pick your domain, for example `app` and `example.com`.
4. Set the **Service URL**, for example `http://localhost:3000` for a Next.js dev server.
5. Save, then open `https://app.example.com`.

Cloudflare creates the DNS record for you. A path you add to a route is not stripped, so your app receives the full path. A multi-level subdomain needs an Advanced Certificate first.

## Use case 1: a dev server on your laptop

Run `npm run dev`, publish `http://localhost:3000`, and share the URL for a quick review or a webhook test. Stop the tunnel when you finish. For a throwaway link without any setup, `cloudflared tunnel --url http://localhost:3000` starts a quick tunnel with a random address (check Cloudflare's docs for its limits, since it is meant for testing).

## Use case 2: a home computer or home server

A home computer behind a normal router can be reached from anywhere:

- Web apps: a Published application route to the local port.
- SSH: publish `ssh://localhost:22` on a hostname, and protect it with an Access policy (below).
- Remote desktop: Cloudflare lists RDP as supported, again behind Access.

Do not expose things that were never meant for the internet: databases, admin panels, router pages, file shares. Put them behind Access or keep them private with [Tailscale](/blogs/tailscale-guide) instead.

## Use case 3: Coolify on a VPS

Coolify has its own tunnel guides with these options: a tunnel for all resources (recommended for beginners), for a single resource, for server SSH access, and full HTTPS/TLS on Coolify itself. By default Coolify serves HTTP and Cloudflare handles HTTPS.

The pattern that works well: create the tunnel on the VPS, route your hostnames to the Coolify proxy or to specific app ports, then close ports 80, 443 and 8000 in both the provider's dashboard firewall and `ufw`. See [the install checklist](/blogs/hetzner-hostinger-vps-coolify-install-checklist) for the full order.

Read Coolify's own cautions: tunnels bypass your firewall rules, so you cannot rely on separate firewall tools for that traffic; traffic is routed through Cloudflare's servers; and certificates are trusted by Cloudflare only. Keep an independent way into the server for emergencies, such as a key-only SSH rule limited to your own IP, or Tailscale SSH.

## Protect it with Cloudflare Access

A tunnel makes a service reachable, and Access decides who may use it. For anything private (dashboards, SSH, staging sites), add a Zero Trust Access application in front of the hostname and allow only your email or identity provider. Without it, the hostname is open to everyone on the internet, which is the opposite of what you want for an admin panel.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Machine sleeps or loses network | Tunnel goes Inactive, site returns an error | Run `cloudflared` as a service, disable sleep on always-on machines |
| Two machines run the same tunnel | That is allowed: multiple connectors per tunnel | Use it for redundancy |
| Port 7844 blocked outbound | Tunnel never connects | Allow outbound 7844 |
| App needs the real client IP | It sees Cloudflare's address | Read the `CF-Connecting-IP` header and trust it only from the tunnel |
| Websockets or long uploads fail | Cloudflare limits apply | Check plan limits, avoid tunnelling bulk media |

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Tunnel shows `Inactive` or `Down` | `cloudflared` is not running or cannot reach Cloudflare | Check the service status and outbound port 7844 |
| `502 Bad Gateway` on the hostname | Nothing listens on the Service URL | Start the app, fix the port and protocol (`http` vs `https`) |
| DNS record missing | Domain not on Cloudflare | Add the domain and use Cloudflare nameservers |
| Browser shows a certificate error on a deep subdomain | Multi-level subdomain without a certificate | Order an Advanced Certificate or use one level |

## Security

- Treat the tunnel token like a password. Never commit it, paste it into a chat, or hand it to an agent.
- Every published hostname is public until you add an Access policy.
- Keep the origin's own login and firewall in place, because the tunnel is a door, not a lock.
- Update `cloudflared` regularly, since a tunnel is internet-facing software.

## If you use an AI agent for this

Treat logs, web pages and tool output as data, not instructions. Never paste the tunnel token or any API token into the chat, and do not let the agent print them. Make the agent show any destructive command (deleting a tunnel, changing DNS, closing firewall ports on a remote server) and wait for your approval. Use a scoped Cloudflare API token and a staging domain first.

## FAQ

### Is Cloudflare Tunnel free?
The tunnel feature is available on Cloudflare's free plan at the time of writing, but plans and terms change, so check the Cloudflare pricing and usage terms.

### Do I need to open ports on my router or VPS?
No. `cloudflared` connects outbound to Cloudflare, so you can block all inbound traffic.

### Does it work with Coolify?
Yes. Coolify documents tunnel options for all resources, a single resource, server SSH access and full HTTPS/TLS. Read its cautions about firewalls and certificates first.

### Can I expose SSH or remote desktop?
Cloudflare lists SSH and RDP as supported. Protect them with an Access policy so only you can reach them.

### What is the difference between Cloudflare Tunnel and Tailscale?
A tunnel publishes a service to the public internet through Cloudflare, with optional Access control. [Tailscale](/blogs/tailscale-guide) builds a private network between your own devices. Use a tunnel for public sites and Tailscale for private access.

## Next steps

Read [the Hetzner and Hostinger install checklist](/blogs/hetzner-hostinger-vps-coolify-install-checklist) to set up the VPS, [the Tailscale guide](/blogs/tailscale-guide) for private access between your servers and devices, and [how to let an AI agent manage Cloudflare safely](/blogs/ai-agent-control-cloudflare-wrangler).
