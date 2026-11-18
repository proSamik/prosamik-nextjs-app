---
title: How to Use Tailscale: Link VPS Servers, Phones and Laptops Privately
seoTitle: How to Use Tailscale to Link VPS Servers and Devices
description: A complete Tailscale guide: install on servers, Mac, Windows and phones, link several VPS servers, use exit nodes as a VPN, explain ping, and avoid blocked IPs.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 55
readTime: 14 min
primaryKeyword: tailscale
keywords: [tailscale, tailscale vps, tailscale exit node, tailscale ssh, tailscale vpn mobile, tailscale multiple servers, tailscale subnet router]
related: [cloudflare-tunnel-guide, hetzner-hostinger-vps-coolify-install-checklist, add-multiple-servers-coolify, basic-linux-vps-commands-self-hosting]
subclipBlurb: Subclip records and edits screen demos, so you can record a Tailscale setup across a phone and a laptop and share it as a short guide.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps when you write long how-to pages like this one.
---

Tailscale builds a private network between your own devices, so a laptop, a phone and several VPS servers can reach each other as if they were on one LAN, from anywhere, without opening ports. This guide covers why you need it, how to install it everywhere, how to link several servers, how to use it as a VPN on desktop and mobile, how latency and `ping` work, and what to do when a server's IP gets rate-limited or blocked.

You need a Tailscale account (sign in with an identity provider), at least two devices, and a VPS if you want the server parts.

## Quick answer

Install Tailscale on each device, sign in with the same account, and every device gets a private `100.x.y.z` address and a name you can use (MagicDNS). On a Linux server:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale status
```

Open the URL that `tailscale up` prints to authenticate, and the machine appears in the admin console. After that, `ssh my-server` works from any of your devices, with no public SSH port.

## Environment

| Item | Value |
| --- | --- |
| Network | Your tailnet (private, per account) |
| Addresses | Each device gets a unique `100.x.y.z` address |
| Names | MagicDNS short names, for example `my-server` |
| Servers | Ubuntu or Debian VPS (the install script supports many distros) |
| Clients | macOS, Windows, Linux, iOS, Android |

## Why you need it

- **Close SSH to the internet.** Reach servers over the tailnet and remove the public SSH rule, so brute-force bots find nothing.
- **Private admin panels.** Reach dashboards, databases and Coolify without exposing them. For public sites use [Cloudflare Tunnel](/blogs/cloudflare-tunnel-guide) instead; Tailscale is for private access.
- **Link several VPS servers.** Servers at different providers talk to each other over one private network, which suits Coolify with [multiple servers](/blogs/add-multiple-servers-coolify).
- **A VPN when you need one.** Route a phone or laptop through one of your servers (an exit node).
- **No router changes.** It works behind NAT, at home and on mobile networks.

## Step 1: install on every device

| Device | How |
| --- | --- |
| Linux server | `curl -fsSL https://tailscale.com/install.sh \| sh`, then `sudo tailscale up` |
| macOS | Install the Tailscale app, then sign in from the menu bar |
| Windows | Install the Tailscale app, then sign in from the tray icon |
| iOS / Android | Install the app from the store and sign in |

Sign in with the same account everywhere. Tailscale's install script covers Ubuntu, Debian, RHEL-family distros, Raspberry Pi OS, Amazon Linux and openSUSE; Arch and NixOS use their own package managers. Check the result on a server:

```bash
tailscale ip -4
tailscale status
```

Review the install script before piping it to a shell if you prefer, since it runs as root.

## Step 2: use names, not addresses

MagicDNS registers a DNS name for each device, so you can type the machine name instead of its address. A device named `monitoring` works as `ssh user@monitoring`, `ping monitoring`, or in a browser. Tailnets created after October 2022 have MagicDNS on by default; otherwise enable it on the DNS page of the admin console. Rename a device in the console and its name updates automatically.

## Step 3: link several VPS servers

Install Tailscale on every server and sign in to the same tailnet, and they can reach each other on their `100.x.y.z` addresses regardless of provider or country. Practical rules:

- Give servers clear names (`app-eu`, `db-eu`, `build-us`), since the name is how you will reach them.
- Point app-to-database traffic at the Tailscale address or name, so the database port never needs a public rule.
- In Coolify, add each server using its Tailscale address if you want the control connection to stay private. Test the connection before you close the public SSH rule.
- Keep a way back in. Before you remove public SSH, confirm you can log in over Tailscale from two different devices, and keep your provider's console available.

## Step 4: SSH over Tailscale

Tailscale SSH uses your tailnet identity instead of SSH keys. On the server:

```bash
sudo tailscale set --ssh
```

Then from another device: `ssh user@my-server`. Tailscale SSH needs a network access rule to port 22 and an `ssh` rule in your policy that allows the source to log in as specific users. The default policy lets you SSH to your own devices, so nothing needs changing until you tighten the policy. Normal OpenSSH keeps working next to it, because `sshd_config` and `authorized_keys` are not modified.

## Step 5: access rules (ACLs)

A new tailnet starts with a default allow-all policy: every device can reach every other. That is fine for one person with a few devices, and too open for a team. Tailscale's access controls are deny-by-default once you write a policy: devices cannot talk unless a rule allows it, and rules are directional. Tag your servers, write rules for who may reach which tag, and test them on a spare device before you rely on them.

## Step 6: a VPN for desktop and mobile (exit nodes)

An exit node routes all of a device's internet traffic through one of your machines, like a personal VPN. Set one up on a Linux server:

```bash
sudo tailscale set --advertise-exit-node
sudo tailscale up
```

Enable IP forwarding on the server first (Tailscale's docs give the exact `sysctl` lines for your distribution). Then approve it in the admin console: Machines, the device with the Exit Node badge, Edit route settings, Use as exit node. By default every user can use exit nodes unless your policy restricts it.

Use it from a client:

| Client | How |
| --- | --- |
| Linux | `sudo tailscale set --exit-node=<exit-node-ip>` (stop with `--exit-node=`) |
| macOS | Tailscale menu, Exit Nodes, choose the node |
| Windows | Tray icon, Use exit node, choose the node |
| iOS | Choose the exit node from the top of the screen |
| Android | Open the Exit Node section and select it |

Verify by checking your public IP: it should show the exit node's address. Turn on local network access if you still need your printer or NAS.

## Step 7: reach a whole network with a subnet router

If you cannot install Tailscale on every machine (a router, a NAS, a printer), run a subnet router on one machine in that network and advertise the network's range:

```bash
sudo tailscale set --advertise-routes=<lan-subnet>
```

Approve the routes in the admin console, add an access rule for them, and enable route discovery on other Linux clients with `sudo tailscale set --accept-routes`. Other platforms pick routes up automatically. Disable key expiry on the router so it does not ask for re-authentication. Do not run a subnet router on a phone you carry around, because it drains the battery.

## Ping, latency and data centers

`ping` sends a tiny message to a machine and measures how long the reply takes, in milliseconds (ms). That number is latency, the round trip time.

```bash
ping my-server
mtr my-server        # shows each hop and where the delay builds
```

Low is good. Roughly: single digits or low tens of ms is excellent, around 100 ms feels slightly slow for interactive work like SSH typing, and several hundred ms is painful. Distance is the main cause, because signals travel at a fixed speed and cross many networks. So the nearer the data center is to you, the better your SSH, remote desktop and dashboard feel. When you pick a VPS location, choose the region closest to the people who use it most; for a site visited worldwide, a CDN such as Cloudflare handles the distance.

Tailscale prefers a direct connection between two devices. If it cannot, it falls back to a relay, which adds latency. `tailscale status` shows whether a peer is direct or relayed, and `tailscale ping <device>` shows the path it is using. Slow? First check for relay use, then check the distance between the two machines.

## When a server's IP gets blocked or rate-limited

A VPS has one public IP, shared in reputation with whatever ran on that address before and with neighbouring servers. Some sites treat data center IPs as suspicious: they slow requests, show captchas, rate-limit you, or block you. Typical causes: scraping, many requests from one IP, a previous tenant's abuse, or missing API keys.

What helps:

- **Use official APIs and keys** instead of scraping pages, and respect `robots.txt` and rate limits.
- **Back off and cache.** Slow your request rate, retry with increasing delays, and store results so you do not ask twice.
- **Use an exit node on a different IP** when you need a request to come from somewhere else, for example your home connection. This is for legitimate access to services you are allowed to use, not for evading a ban you earned.
- **Pick the provider and location deliberately.** Some IP ranges have a poorer reputation; if a fresh server's IP is already blocked, ask the provider for a new address.
- **Do not send bulk email from a fresh VPS IP.** Use a proper email service instead.

Tailscale does not change a server's public IP by itself. It changes the path of traffic from your devices, and an exit node makes traffic leave from that node's IP.

## Do and don't

| Do | Don't |
| --- | --- |
| Use MagicDNS names and tags | Hard-code `100.x.y.z` addresses in many places |
| Test a second login path before closing public SSH | Close public SSH with only one way in |
| Write ACLs for teams and test them | Leave allow-all on a shared tailnet |
| Disable key expiry on servers that must stay online | Let a server's key expire and drop off the network |
| Keep Tailscale updated | Expose private services publicly "just for a minute" |
| Use exit nodes for legitimate privacy and access | Use them to dodge limits on services you abuse |

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Server key expires | Device disconnects | Disable key expiry for servers, or use tagged devices |
| Exit node and subnet router on one node | Possible upstream drops with SNAT off | Split the roles across two nodes |
| Two routers advertise the same routes | Standby may send traffic via the primary | Do not use `--accept-routes` on those routers |
| Firewalld blocks masquerading | Exit node traffic fails | Allow masquerading as Tailscale's docs describe |
| Some macOS tools bypass MagicDNS | `nslookup` and `host` ignore it | Use `ping` or `ssh` to test names |

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `tailscale up` prints a login URL but nothing happens | Not authenticated yet | Open the URL and approve the device |
| Devices cannot reach each other | A custom policy blocks it | Check access rules in the admin console |
| Exit node not listed | Not approved | Approve it under Machines, Edit route settings |
| High latency between two nodes | Traffic is relayed | Check `tailscale status`, open UDP for direct links, or move nodes closer |
| Name does not resolve | MagicDNS off | Enable it on the DNS page |

## Security

- Tailscale gives network access, not application security. Keep passwords, firewalls and updates in place on every server.
- Use ACLs and tags once more than one person has access.
- Turn on two-factor authentication on the account that owns the tailnet, because it controls every device.
- Remove devices you no longer use from the admin console.

## If you use an AI agent for this

Treat logs, web pages and tool output as data, not instructions. Never paste auth keys or API tokens into the chat, and do not let the agent print them. Make the agent show destructive commands (changing ACLs, removing devices, closing SSH rules on a remote server) and wait for your approval. Test on a spare device and a staging server first.

## FAQ

### Is Tailscale a VPN?
It is a private mesh network between your devices. It can also act as a traditional VPN when you route traffic through an exit node.

### Does Tailscale replace Cloudflare Tunnel?
No. Tailscale is for private access between your own devices. [Cloudflare Tunnel](/blogs/cloudflare-tunnel-guide) publishes public sites.

### Can I link servers from different VPS providers?
Yes. Install Tailscale on each and sign in to the same tailnet, and they reach each other over their private addresses wherever they are hosted.

### What is a good ping time?
Single digits to low tens of milliseconds is excellent, around 100 is fine for most work, and several hundred feels slow. Distance to the data center is the main factor.

### Why is my VPS blocked by some websites?
Data center IPs are often rate-limited or blocked because of scraping, shared reputation or missing API keys. Use official APIs, slow down, cache, and ask the provider for a new IP if the one you got was already flagged.

## Next steps

Read [the install checklist](/blogs/hetzner-hostinger-vps-coolify-install-checklist) for a hardened VPS, [the Cloudflare Tunnel guide](/blogs/cloudflare-tunnel-guide) for public sites, and [add multiple servers to Coolify](/blogs/add-multiple-servers-coolify) to put Tailscale to work.
