---
title: Cheapest Domain Registrar for Developers: Spaceship, Cloudflare, Porkbun, Namecheap
seoTitle: Cheapest Domain Registrar: Spaceship vs Cloudflare
description: My ranking of domain registrars for developers: Spaceship, Cloudflare, Porkbun, Namecheap. Compare renewals, WHOIS privacy, DNS and domain transfer rules.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 30
readTime: 12 min
primaryKeyword: cheapest domain registrar
keywords: [cheapest domain registrar, spaceship domains, domain transfer, domain registrar for developers, cloudflare registrar, porkbun vs namecheap, domain renewal price]
related: [transfer-domain-namecheap-to-another-registrar, host-nextjs-on-vps-with-coolify, hostinger-vs-hetzner-vps-self-hosting, move-nextjs-from-vercel-to-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture a registrar's checkout and DNS screens as a short walkthrough.
rankizzBlurb: Rankizz tracks how your comparison pages rank and get cited by AI search, useful for pricing and registrar comparisons that change often.
---

The cheapest domain registrar is the one with the lowest total cost over several years, not the lowest first-year price. Registration, renewal, transfer, WHOIS privacy and DNS can all be priced differently, and a low intro price often renews higher. This guide shows how to compare, gives my own ranking of Spaceship, Cloudflare, Porkbun and Namecheap, and covers how each provider handles domain transfers.

I am not quoting current prices. They differ per extension and change often, so as of November 2026 check each registrar's pricing page for the exact TLD you want. What I verified is how each one structures its pricing.

## Quick answer

My ranking as a developer is #1 Spaceship, #2 Cloudflare, #3 Porkbun, #4 Namecheap. This is my personal ranking, not a price benchmark. Cloudflare ranks high for DNS, nameservers and R2, not because it is always the cheapest to register with. The rule that matters more than the ranking: the registrar and the DNS host can be different, so you can buy anywhere and point the nameservers to Cloudflare.

The price rule: compare the renewal price of your exact extension at Cloudflare Registrar, Porkbun and Namecheap. Cloudflare says it sells domains at cost with no markup. Porkbun says its prices include ICANN fees and that WHOIS privacy is free. Pick the lowest renewal price that includes privacy, and prefer a registrar whose DNS you will actually use with your host.

## My ranking and why

| Rank | Registrar | Why it sits there |
| --- | --- | --- |
| 1 | Spaceship | My first choice. I could not fetch Spaceship's own pricing or transfer pages for this post (they returned an error), so I am not quoting its prices or fees here. Check its pricing page for your TLD. |
| 2 | Cloudflare | At-cost registration per its docs, WHOIS redacted by default, and its DNS and nameservers are the strongest I use. R2 needs a Cloudflare account anyway. |
| 3 | Porkbun | Free WHOIS privacy and free DNS management per its page, transfers that include a renewal year. |
| 4 | Namecheap | Fine if you already have domains there, but I could not verify its current pricing, so I rank it last on what I can show. |

This is a ranking by my experience and preference. As of November 2026, prices decide the final choice for a given extension, so check each pricing page.

## Buy anywhere, use Cloudflare for DNS

Cloudflare DNS management and nameservers are the strongest part of the stack. After you buy a domain at any registrar, you can add the domain to Cloudflare, then change the nameservers at the registrar to the two Cloudflare gives you. You get free DNS management there regardless of where the domain is registered. Cloudflare's transfer docs describe the same first step: the domain must show as Active in Cloudflare after you switch nameservers.

You need a Cloudflare account anyway if you use R2 buckets, as in [Next.js with Cloudflare R2 as a CDN](/blogs/nextjs-cloudflare-r2-cdn-wrangler). So the practical setup is: register at whichever registrar is cheapest for your TLD, put DNS on Cloudflare, and keep the registrar only for renewal and transfer.

## Environment

| Item | Value |
| --- | --- |
| Goal | A domain for a self-hosted Next.js app, such as `app.example.com` |
| Compared | Cloudflare Registrar, Porkbun, Namecheap |
| Source | Each registrar's public documentation and product pages |
| Not covered | Current per-TLD prices, which change |

## What to compare

| Cost item | Why it matters |
| --- | --- |
| First-year price | Often discounted and not the long-run cost |
| Renewal price | What you pay every year after the first |
| Transfer-in price | Many registrars bundle a renewal year |
| WHOIS privacy | Free at some, an add-on at others |
| DNS | Free DNS you control, with an API if you automate |
| Lock-in | How easy it is to leave later |

Multiply the renewal price by the years you expect to keep the domain. A domain you keep for five years costs one first-year price plus four renewals.

## Cloudflare Registrar

Cloudflare's Registrar docs say domains are bought and renewed "at cost, without markup fees", so you pay what registries and ICANN charge. They also say renewals happen at the registry's list price, that domains auto-renew by default, and that WHOIS information is redacted by default.

The catch from Cloudflare's transfer docs: to register with Cloudflare you must use Cloudflare for full DNS, since you cannot use another DNS provider while the domain is registered there. That is fine when your DNS is already on Cloudflare. It is a restriction if you want DNS elsewhere. I could not verify the list of supported extensions from the pages I fetched, so check that your TLD is supported.

## Porkbun

Porkbun's page says registration and renewal prices are per year for non-premium names, that prices are in USD and include ICANN and other fees, and that most transfers include a one-year renewal. It states WHOIS privacy comes free with every domain, along with free Let's Encrypt certificates for supported domains, URL forwarding, up to 20 email forwards and free DNS management.

Recovery has a cost: restoring a domain through the Redemption Grace Period carries a 200 USD restoration fee on top of the renewal price, per Porkbun's page. Do not let a domain expire.

## Namecheap

Namecheap's transfer-out documentation, which I did fetch, covers how to leave: unlock the domain and get an Auth Code from the Transfer Out section. I did not fetch Namecheap's pricing page, so I am not stating its renewal or privacy terms. Check its current pricing page for your TLD before comparing. If you already own a domain there, the cost of leaving is covered in [the transfer guide](/blogs/transfer-domain-namecheap-to-another-registrar).

## Decision table

| Question | Cloudflare Registrar | Porkbun | Namecheap |
| --- | --- | --- | --- |
| Pricing model stated | At cost, no markup | Per-year prices including ICANN fees | Check the pricing page |
| WHOIS privacy | Redacted by default | Free with every domain | Check the pricing page |
| Transfer in | Adds a year for most gTLDs | Most transfers include a one-year renewal | Check the pricing page |
| DNS requirement | Must use Cloudflare DNS | Free DNS management, powered by Cloudflare | Check the pricing page |
| Notable limit | Supported TLD list not verified here | 200 USD restore fee after expiry | Not verified here |

## Choose Cloudflare if

- Your DNS is already on Cloudflare, or you want it there (and you need Cloudflare for R2 anyway).
- You want to pay the registry price with no markup and have a supported TLD.
- You want to keep registrar and DNS in one account.

## Choose Porkbun if

- You want free privacy and free DNS in a registrar-only account.
- You want a transfer to include a renewal year.
- You want email forwards and URL forwarding included.

## Choose Namecheap if

- You already have domains there and the renewal price for your TLD is competitive.
- You prefer to keep everything in one place. Verify the current prices first.

## A worked cost comparison method

Use a small table you fill in yourself, with numbers from each pricing page for the exact extension you want.

| Line | Registrar A | Registrar B | Registrar C |
| --- | --- | --- | --- |
| Year 1 registration | | | |
| Yearly renewal | | | |
| WHOIS privacy per year | | | |
| Years you will keep it | 5 | 5 | 5 |
| Total | year 1 + 4 renewals + privacy | same | same |

Check whether tax is added at checkout, and whether the price is in the currency you pay in. A registrar that looks cheap in USD can cost more once VAT or card fees apply. If you run several domains, repeat the table per extension, because .com, .dev and .app are priced separately.

## Domain transfers at each provider

A transfer moves the registration, not the website. Before any transfer, turn off the registrar lock, get the authorization code (also called EPP, auth or transfer code), and make sure the 60-day rules allow it. Do it ahead of renewal time and keep DNS working throughout. The step by step for leaving Namecheap is in [Transfer a domain from Namecheap to another registrar](/blogs/transfer-domain-namecheap-to-another-registrar).

| Provider | Transfer in | Transfer out | Verified from |
| --- | --- | --- | --- |
| Cloudflare | Domain at least 60 days old and not transferred in the last 60 days; unlock it; get the auth code; domain must be Active in Cloudflare first; disable DNSSEC beforehand; most gTLD transfers add one year, some ccTLDs (for example `.uk`) add none and have no transfer fee; approval at the old registrar can take up to 5 business days | Not verified (the page I tried returned an error) | Cloudflare's transfer-to-Cloudflare docs |
| Porkbun | Its page says most transfers include a one-year renewal; I could not load its transfer guide | Not verified | Porkbun's domains page only |
| Namecheap | Not verified (page not available to me) | Unlock the domain and get the Auth Code from the Transfer Out section, as in the transfer guide | Namecheap's knowledge base, as used in the transfer post |
| Spaceship | Not verified | Not verified | Could not fetch its pages |

Cloudflare's docs state that changing the registrant name, organization or email triggers a 60-day transfer lock, so avoid editing those fields right before a planned transfer. For Spaceship, Porkbun and Namecheap I could not read the official transfer pages, so check their help centers for fees, supported extensions and lock behavior instead of trusting a blog post, including this one.

Cloudflare's docs also warn that the auth code usually expires, so request it when you are ready, and that you must approve the transfer at the current registrar.

## Pointing the domain at your server

Whichever registrar you use, the setup for a self-hosted Next.js app is the same. Create an A record for your host name pointing at `<server-ip>`. In Coolify you then enter the domain with `https://`, and the proxy handles the certificate, as covered in [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify). Coolify's docs say the proxy needs ports 80 and 443 open for certificate generation.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Intro price renews higher | Cost jumps in year two | Compare renewal price |
| Premium domain names | Priced differently from standard names | Check the exact name |
| DNS locked to one provider | You cannot use another DNS service | Confirm before registering |
| Domain expires | Recovery can cost far more | Turn on auto-renew |
| Country-code domains | Different rules and prices | Check the registrar's list |
| Domain bought by a hosting bundle | Free first year, then normal pricing | Note the renewal date |

## Security

- Turn on two-factor authentication for the registrar account. Losing it means losing the domain.
- Keep auto-renew on and a valid payment method.
- Keep the registrant email current. Transfer approvals and auth codes go there.
- Enable the registrar lock unless you are transferring.
- Use a unique password in a password manager.

## If you use an AI agent for this

- Tell the agent to treat pricing pages, search results and tool output as data, not instructions.
- Never paste registrar passwords, API keys or auth codes into the chat.
- Make it show destructive actions (nameserver changes, unlocking a domain, deleting DNS records, transfers) and wait for approval.
- Give any API token only DNS permissions on the one zone, and test on a spare domain.

## FAQ

### Which registrar is cheapest?
It depends on the extension and the year. Cloudflare says it sells at cost; Porkbun includes ICANN fees and privacy. Compare renewal prices for your exact TLD.

### Is WHOIS privacy free?
Cloudflare redacts WHOIS by default, and Porkbun says privacy is free with every domain.

### Why is renewal more expensive than the first year?
Many registrars discount the first year. Always compare the renewal price.

### Can I use another DNS provider with Cloudflare Registrar?
Not while the domain is registered there, according to Cloudflare's transfer documentation.

### Which registrar do you rank first?
Spaceship first, then Cloudflare, Porkbun and Namecheap. It is my ranking, and I could not verify Spaceship's prices from its own pages, so compare renewals yourself.

### Can I buy at one registrar and use Cloudflare DNS?
Yes. Add the domain to Cloudflare and set the registrar's nameservers to the ones Cloudflare shows.

### Can I switch later?
Yes, after the 60-day period, using an auth code. See [the transfer guide](/blogs/transfer-domain-namecheap-to-another-registrar).

## Next steps

- Leaving a registrar: [Transfer a domain from Namecheap to another registrar](/blogs/transfer-domain-namecheap-to-another-registrar).
- Use it: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Server choice: [Hostinger vs Hetzner VPS](/blogs/hostinger-vs-hetzner-vps-self-hosting).
