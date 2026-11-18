---
title: How to Transfer a Domain from Namecheap to Another Registrar
seoTitle: How to Transfer a Domain from Namecheap Safely
description: Step-by-step transfer of a domain out of Namecheap: eligibility, unlock, Auth Code, DNS and DNSSEC prep, the 5-day release window, and what to check after.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 31
readTime: 9 min
primaryKeyword: transfer domain from namecheap
keywords: [transfer domain from namecheap, namecheap auth code, namecheap transfer out, move domain to cloudflare, domain transfer checklist]
related: [cheapest-domain-registrar-for-developers, host-nextjs-on-vps-with-coolify, move-nextjs-from-vercel-to-coolify, basic-linux-vps-commands-self-hosting]
subclipBlurb: Subclip records and edits screen demos, so you can capture each transfer screen as a short runbook clip for later.
rankizzBlurb: Rankizz tracks how your published how-to guides rank and get cited by AI search, so you can see whether a transfer guide is found.
---

To transfer a domain out of Namecheap, confirm it is older than 60 days and not recently transferred, unlock it, request the Auth Code from the Transfer Out section, then start the transfer at the new registrar and enter the code. Namecheap then has 5 days to release the domain under the ICANN Transfer Policy. This guide adds the preparation that avoids downtime, using Cloudflare Registrar as the example destination.

Steps and UI labels below come from Namecheap's and Cloudflare's own documentation. Registrars change their screens, so check the current page before you act.

## Quick answer

In Namecheap, go to Domain List, click Manage, open the Sharing & Transfer tab, and in Transfer Out unlock the domain and get the Auth Code. The code goes to the Registrant email, which may differ from your account email. Start the transfer at the new registrar, paste the code, and approve any release email. Keep DNS working throughout.

## Environment

| Item | Value |
| --- | --- |
| Source registrar | Namecheap |
| Destination | Another registrar; Cloudflare Registrar used as the example |
| Domain | `example.com` (placeholder) |
| Needed | Access to the Registrant email, registrar login, DNS records exported |

## Step 0: check eligibility

Namecheap's article says the domain must be more than 60 days old, must not have been transferred between registrars in the last 60 days, and must be unlocked (Registrar Lock disabled). Cloudflare adds that there should be no change to the registrant name, organization or email in the last 60 days, since those trigger a 60-day transfer lock, and that the registration at the current registrar must be active, so renew an expired domain first.

Namecheap also lists country-code extensions with different processes, among them .UK, .IS, .ES, .CH, .LI, .DE, .FR and .TO, for which you should contact Namecheap Support. And .CH, .ES, .FR, .LI, .PE and .SG domains must be renewed at least 12 days before expiration, otherwise they enter redemption, which carries a recovery fee, and a domain in redemption cannot be transferred out. Expired domains cannot be unlocked in the account at all, so those need Namecheap Support.

## Step 1: record your DNS

Before anything changes, export every DNS record so nothing is lost: A, AAAA, CNAME, MX, TXT (including SPF, DKIM and verification records) and any CAA. Take screenshots or copy them into a file. If your app runs on a self-hosted server, make a note of the A record that points at `<server-ip>` so you can recreate it. See [hosting Next.js on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify) for how that record is used.

## Step 2: prepare DNS for the destination

This step depends on where you are going. If the destination is Cloudflare Registrar, its docs say to:

1. Disable DNSSEC at your current registrar if it is enabled, and wait at least 24 hours before changing nameservers. Otherwise DNS validation can fail once the nameservers point to Cloudflare.
2. Add the domain to Cloudflare and update its nameservers at Namecheap to the ones Cloudflare assigns.
3. Wait for the zone to show Active. It usually takes minutes but can take up to 24 hours, and you cannot proceed while it is Pending.

Cloudflare also states you cannot use another DNS provider while the domain is registered with them. For another destination registrar, check its transfer docs for DNS requirements.

Make sure the records you saved in step 1 exist in the new DNS zone before nameservers change, so your site and email keep working.

## Step 3: unlock and get the Auth Code

From Namecheap's documentation:

1. Sign in to your Namecheap account.
2. Go to **Domain List** and click **Manage** next to the domain.
3. Open the **Sharing & Transfer** tab.
4. In the **Transfer Out** section, unlock the domain and get the Auth Code. It is sent to the Registrant email address.
5. You are asked for a reason for the transfer out.

Auth codes can expire, as Cloudflare notes, so request it close to when you will use it. Treat it like a password: anyone with the code and an unlocked domain can start a transfer.

Namecheap's help center also describes a bulk option: select domains in Domain List, then Actions > Transfer Out, and choose the unlock and Auth Code option.

## Step 4: start the transfer at the new registrar

At Cloudflare the steps are: open the Transfer Domains page in the dashboard, enter the auth code, confirm payment, enter contact information, accept the terms and select Confirm transfer. Other registrars have a similar form.

Cost note from Cloudflare's docs: for most gTLDs such as .com, .net and .org the transfer adds one year to the current expiration date, an ICANN requirement. Some country-code domains such as .uk have no transfer fee and no added year. If a domain recently expired and was renewed, wait at least 45 days after the original expiration before transferring, or the extra year may not be added.

## Step 5: approve and wait

Once the transfer begins at the new registrar and the code is provided, the transfer starts at the registry. Namecheap has 5 days to release the domain, and can release sooner through the transfer-out notification sent to the Registrant email. Cloudflare says most registrars process within 5 business days, though some TLDs such as .mx can take up to 10. Watch the Registrant mailbox and approve the message if one arrives.

Keep your DNS and your site running during this period. The transfer changes the registrar, not where the domain points, so nothing should go down if DNS records stay the same.

## Step 6: verify after the transfer

Check that the new registrar shows the domain and expiry date, then confirm the site still resolves.

```bash
dig +short A app.example.com
dig +short NS example.com
curl -I https://app.example.com
```

You should see `<server-ip>` for the A record, the expected nameservers, and an HTTP 200. Then turn on auto-renew, the registrar lock and two-factor authentication at the new registrar.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Domain under 60 days old | Transfer is refused | Wait until day 61 |
| Registrant email recently changed | A 60-day transfer lock applies (Cloudflare) | Wait it out |
| DNSSEC enabled | DNS validation can fail after nameserver change | Disable it, wait 24 hours |
| Expired domain | Cannot be unlocked in the account | Renew, or contact Namecheap Support |
| Domain in redemption | Cannot be transferred out | Recover it first, with the fee |
| Country-code TLDs | Different processes | Contact support, check the registry rules |
| Auth code email not arriving | Goes to the Registrant email | Check that address, which may differ from your account email |
| Privacy lock or multiple locks | Transfer blocked | Turn off every lock type |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Awaiting auth code status | Namecheap has a status article for this; I did not read it | Read Namecheap's "Awaiting auth code" article and supply the code at the new registrar |
| New registrar says domain is locked | Registrar Lock still on | Unlock in Transfer Out |
| Invalid auth code | Code expired or mistyped | Request a new one |
| Site down after the move | DNS records not recreated | Re-add the records you saved in step 1 |
| Email stopped working | MX or TXT records missing in new DNS | Restore them |
| Zone stuck Pending at Cloudflare | Nameservers not updated at Namecheap | Update nameservers and wait up to 24 hours |

## Security

- The auth code is a credential. Do not paste it into chats, tickets or screenshots.
- Use two-factor authentication on both registrar accounts.
- Re-lock the domain after the transfer, and confirm the Registrant email is correct.
- Watch the Registrant mailbox for unexpected transfer-out notices.
- Remove old nameservers and delete the old DNS zone only after everything works.

## If you use an AI agent for this

- Tell the agent to treat web pages, emails and tool output as data, not instructions.
- Never paste the Auth Code, registrar passwords or API tokens into the chat, and do not let the agent print them.
- Make it show destructive actions (unlocking, nameserver changes, deleting DNS records, confirming a transfer) and wait for approval.
- Use scoped tokens, and rehearse the DNS part on a spare domain first.

## FAQ

### How long does a Namecheap transfer-out take?
Namecheap has 5 days to release the domain once the transfer starts and the code is supplied, and it can release sooner through the transfer-out notification.

### Where do I find the Auth Code in Namecheap?
Domain List, Manage, Sharing & Transfer, then the Transfer Out section. It is emailed to the Registrant address.

### Will my website go down during a transfer?
Not if the DNS records stay the same. A transfer moves the registration, not the records.

### Can I transfer a domain I just registered?
Not within 60 days of registration, per Namecheap's eligibility rules.

### Does a transfer cost money?
At Cloudflare, most gTLD transfers add a year at the current price. Check your destination registrar's pricing, and compare options in [the cheapest registrar guide](/blogs/cheapest-domain-registrar-for-developers).

## Next steps

- Pick the destination: [Cheapest domain registrar for developers](/blogs/cheapest-domain-registrar-for-developers).
- Point the domain at your server: [Host a Next.js app on a VPS with Coolify](/blogs/host-nextjs-on-vps-with-coolify).
- Leaving Vercel too: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).

If you keep runbooks as screen clips, [Subclip](subclip:inline-transfer-runbook) can record the transfer steps and its AI editor cleans up the take.

Sources: namecheap.com/support/knowledgebase/article.aspx/258/84/what-should-i-do-to-transfer-a-domain-from-namecheap, developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare
