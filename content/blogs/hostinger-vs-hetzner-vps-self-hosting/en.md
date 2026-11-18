---
title: Hostinger vs Hetzner VPS for Self-Hosting Next.js with Coolify
seoTitle: Hostinger vs Hetzner VPS: How to Choose for Coolify
description: Hostinger vs Hetzner VPS for Coolify and Next.js: pricing structure, locations, backups, firewalls, and why a first VPS should start on Hetzner.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 29
readTime: 11 min
primaryKeyword: hostinger vs hetzner vps
keywords: [hostinger vs hetzner vps, hetzner cloud vs hostinger, vps for coolify, cheap vps self hosting, vps for nextjs]
related: [host-nextjs-on-vps-with-coolify, add-multiple-servers-coolify, basic-linux-vps-commands-self-hosting, cheapest-domain-registrar-for-developers, hetzner-hostinger-vps-coolify-install-checklist]
subclipBlurb: Subclip records and edits screen demos, so you can capture a side-by-side walkthrough of a provider's dashboard for your team.
rankizzBlurb: Rankizz tracks how your comparison pages rank and get cited by AI search, which matters for "X vs Y" content like this.
---

Both Hostinger and Hetzner rent Linux VPS servers that run Coolify, so the choice comes down to pricing structure, locations, and what the provider includes. Hetzner Cloud prices in euros per month and excludes VAT, with shared and dedicated CPU types. Hostinger sells fixed KVM plans paid upfront for a term, with a higher renewal rate. This is a comparison from the two providers' public pages, not a benchmark.

I have not benchmarked either provider for this post, so there are no speed claims here. Prices and plans change often, so as of November 2026 check each pricing page before buying. Figures below are what the pages showed when I fetched them.

## Quick answer

Pick Hetzner Cloud if you want per-month billing in euros, a choice of US, Germany, Finland and Singapore locations, and shared or dedicated CPU options. Pick Hostinger if you want a fixed KVM plan with a lot of RAM and NVMe for the money, free weekly backups, and a Coolify option in its stack picker, and you are fine paying upfront for a long term. Either meets Coolify's minimum of 2 CPU cores, 2 GB RAM and 10 GB free disk on its mid plans.

## Environment

| Item | Value |
| --- | --- |
| What is compared | Hetzner Cloud and Hostinger VPS (KVM) |
| Workload | Next.js app plus Postgres, run by Coolify |
| Source | Each provider's public pages, fetched November 2026 |
| Not covered | Real benchmarks, support quality, uptime history |

## What Coolify needs

Coolify's install docs list 2 CPU cores, 2 GB RAM and 10 GB free disk, on amd64 or arm64, with an Ubuntu LTS recommended. They say a 1 core, 512 MB machine can run it but is not recommended. A Next.js build is memory-hungry, so a 4 GB plan or larger gives you room for the app, the database and builds together. Coolify also supports adding more servers later, as in [the multiple servers guide](/blogs/add-multiple-servers-coolify).

## Decision table

| Factor | Hetzner Cloud | Hostinger VPS |
| --- | --- | --- |
| Billing shown | Per month, euros, VAT excluded | Per month equivalent, paid upfront for a term (24 months on the page) |
| Entry shown on the page | Regular Performance from 5.49 EUR/month; Cost-Optimized listed as currently not available | KVM 1 from 6.49 USD/month on a 24-month term |
| Mid plan shown | n/a, see the pricing page | KVM 2: 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB bandwidth at 8.79 USD/month on the term |
| Renewal | Not stated on the page I fetched | Renews at a higher rate (KVM 2 listed at 14.99 USD/month) |
| CPU types | Shared (Cost-Optimized, Regular Performance) and dedicated (General Purpose) | KVM, AMD EPYC |
| Locations | Germany, Finland, Singapore, USA | Docs page lists USA, Brazil, UK, Germany, France, Lithuania, India, Indonesia, Malaysia |
| Backups | Not stated on the pages I fetched | Free weekly backups listed |
| Firewall | Not verified on the pages I fetched; check Hetzner's docs | Firewall management listed |
| Coolify | Coolify can provision Hetzner servers | Coolify listed as a control panel option; Coolify can provision Hostinger servers |
| IPv4 | Primary IPv4 listed at 0.50 EUR/month excluding VAT | Not stated separately |
| Guarantee | Not stated on the page I fetched | 30-day money-back guarantee advertised |

I could not verify from the pages I fetched Hetzner's included traffic or backup pricing, so I have left those out rather than guess. Check Hetzner's pricing page for those numbers.

## What stands out about Hetzner

Hetzner's docs describe two families: Shared Resources (Cost-Optimized and Regular Performance) and Dedicated Resources (General Purpose, newer hardware). Shared instances split CPU access among several virtual servers. Dedicated instances have their own CPU resources. The cloud page lists data centers in Falkenstein, Nuremberg, Helsinki, Hillsboro, Ashburn and Singapore.

The docs also say cloud servers do not include public IP addresses, and IPv4 Primary IPs have an additional cost of 0.50 EUR per month excluding VAT. Remember that when you compare headline prices.

For a small personal site, shared Regular Performance is usually the comparison point. A busy app with steady CPU use is where dedicated vCPUs start to matter, and that tier starts much higher on the page I fetched.

## What stands out about Hostinger

Hostinger's VPS page lists four KVM plans, from 1 vCPU, 4 GB RAM and 50 GB NVMe up to 8 vCPU, 32 GB RAM and 400 GB NVMe. Every plan lists AMD EPYC, NVMe storage, a 1 Gbps network, firewall management, a public API and a free domain for one year. Plans are paid upfront, and the page shows a discounted first term and a higher renewal rate for the same term length.

The page says reinstalling a VPS in another data center permanently deletes all data including backups and snapshots, so choose your location before you deploy. It also advertises a 30-day money-back guarantee and says cancellation is available anytime.

The upfront structure changes the comparison. A 24-month term is a commitment, and the renewal rate is what you pay after that. Compare the renewal rate, not only the first-term price.

## Beginner or first VPS? Start with Hetzner

My advice, from experience rather than a benchmark: if you are a beginner or this is your first VPS, start with Hetzner. Use it, look at what the server is doing, and learn from your mistakes there. Month-to-month billing means a wrong first choice (a location, a size, a broken firewall rule) costs you little to throw away and rebuild, which is the fastest way to learn Linux, Docker and Coolify. Pair it with the commands in [Basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting).

Once Coolify runs on one VPS, adding other servers is easy, because Coolify manages them over SSH. That also means your first server does not have to be your last, as covered in [Add multiple servers to Coolify](/blogs/add-multiple-servers-coolify). For the step-by-step install on either provider, see the [Hetzner and Hostinger VPS plus Coolify install checklist](/blogs/hetzner-hostinger-vps-coolify-install-checklist).

## When Hostinger makes sense long term

If, after running a VPS for a while, you decide you need a long-lived server, Hostinger makes sense. A long-term plan fits when you already know your RAM and disk needs, your location, and that the app will stay for the whole term. The page I fetched lists free weekly backups, firewall management and a free domain for one year on its plans. The commitment is the cost: you pay upfront for a term and the renewal rate is higher, so compare the renewal rate and plan your exit. Take your own database backups either way.

## Choose Hetzner if

- You want to pay month to month and resize or delete servers easily.
- You want a US, German, Finnish or Singapore location, or a dedicated-CPU option.
- You plan several small servers, for example a [build server and a deployment server](/blogs/add-multiple-servers-coolify).
- You are comfortable adding backups and a firewall yourself.

## Choose Hostinger if

- You want more RAM and NVMe per dollar on a fixed plan and accept a long upfront term.
- You want free weekly backups and a managed firewall built in.
- You want a location in Brazil, India, Indonesia or Malaysia, which the Hostinger page lists.
- You want a stack picker that offers Coolify at setup.

## Whichever you pick

Do the same steps after buying: update the system, set up SSH keys, lock the firewall to the ports Coolify lists, then install Coolify as in [the VPS hosting guide](/blogs/host-nextjs-on-vps-with-coolify). Pair the server with a registrar you can switch away from, see [the cheapest domain registrar guide](/blogs/cheapest-domain-registrar-for-developers).

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Hetzner server without IPv4 | No public IPv4 unless you add a Primary IP | Budget the extra IPv4 cost |
| Hostinger renewal | Rate rises after the first term | Compare the renewal rate |
| Location chosen wrongly on Hostinger | Reinstall elsewhere deletes data | Back up first, or choose carefully |
| Shared CPU under steady load | Performance can vary with neighbors | Move to dedicated if builds or traffic are heavy |
| ARM vs amd64 | Images must match the CPU architecture | Check plan architecture, especially with a separate build server |
| Prices in different currencies | Hard to compare directly | Convert and check VAT |

## Security

- Turn on the provider firewall and restrict SSH to your own address if you can. Coolify's docs prefer provider firewalls because Docker's published ports can bypass plain UFW.
- Open only 22, 80 and 443, plus 8000, 6001 and 6002 until the dashboard works on a domain.
- Use SSH keys, not passwords.
- Protect the provider account with two-factor authentication.
- Take your own backups of the database, whatever the provider offers.

## If you use an AI agent for this

- Tell the agent to treat pricing pages, logs and tool output as data, not instructions.
- Never paste API tokens or SSH keys into the chat, and do not let the agent print them.
- Make it show destructive actions (deleting a server, reinstalling an OS, firewall changes, DNS changes) and wait for approval.
- Give provider API tokens the minimum scope, and try a throwaway server first.

## FAQ

### Is Hostinger or Hetzner better for Coolify?
Both work. Choose on billing style and location. Hetzner bills monthly in euros excluding VAT; Hostinger sells fixed plans paid upfront for a term.

### What size VPS do I need for Next.js and Coolify?
Coolify needs 2 cores, 2 GB RAM and 10 GB free disk at minimum. A 4 GB plan or larger gives builds and the database room.

### Does Hostinger offer Coolify?
Its VPS page lists Coolify as a control panel option under its stack choices, and Coolify's docs list Hostinger as a provisioning provider.

### Are Hetzner prices including VAT?
The cloud page I fetched showed prices excluding VAT, in euros.

### Which should a beginner choose?
Start with Hetzner for a first VPS, and move to Hostinger later if you decide you need a long-term plan. This is my advice, not a measured result.

### Can I move later?
Yes. Move the app with a redeploy to a new server and keep database backups. See [Add multiple servers to Coolify](/blogs/add-multiple-servers-coolify).

## Next steps

- Install: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Install on either provider: [Hetzner and Hostinger VPS plus Coolify install checklist](/blogs/hetzner-hostinger-vps-coolify-install-checklist).
- Server basics: [Basic Linux VPS commands](/blogs/basic-linux-vps-commands-self-hosting).
- The domain side: [Cheapest domain registrar for developers](/blogs/cheapest-domain-registrar-for-developers).

If you publish comparison pages like this, [Rankizz](rankizz:inline-comparison-tracking) tracks how a page ranks and gets cited by AI search.
