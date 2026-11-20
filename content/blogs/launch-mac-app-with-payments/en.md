---
title: How to Launch a Mac App with Payments: Mac App Store vs Selling Direct
seoTitle: How to Launch a Mac App with Payments: Store vs Direct
description: Compare selling a Mac app through the Mac App Store with in-app purchase against direct sales with notarization and a payment provider.
category: Apple App Store
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 71
readTime: 9 min
primaryKeyword: launch mac app with payments
keywords: [mac app store, sell mac app, notarization, mac in-app purchase, direct distribution mac, developer id]
related: [publish-ios-app-app-store-step-by-step, launch-mobile-app-with-payments-revenuecat, eu-app-store-rules-for-developers]
subclipBlurb: Subclip is a desktop app, and its screen-recording and editing features show what a Mac app demo video can look like.
rankizzBlurb: Rankizz tracks how your Mac app's landing page ranks and gets cited by AI search.
---

You can sell a Mac app in two main ways: through the Mac App Store using Apple's in-app purchase and Apple's payment system, or direct from your own website with a notarized app and your own payment provider. The choice changes your fees, your sandbox rules, your update flow and your customer relationship. This guide compares them and lists the steps for each.

::youtube[GL1Q9ZC_7tQ] Convert iOS App to macOS with SwiftUI

## Quick answer

Pick the Mac App Store for easy discovery, built-in payments and automatic updates, accepting Apple's commission and sandbox rules. Pick direct distribution for more control and different fees, accepting that you handle licensing, payments, updates and notarization yourself. Many developers do both.

## Comparison

| Topic | Mac App Store | Direct (Developer ID) |
| --- | --- | --- |
| Discovery | Store search and features | Your site, SEO and links |
| Payments | Apple in-app purchase | Your provider such as Stripe or a merchant of record |
| Commission | Apple's, check current rates | Payment provider's fees |
| Sandbox | Required | Optional, but hardened runtime required |
| Review | Apple reviews every release | No review, but notarization needed |
| Updates | Handled by the store | You add an updater such as Sparkle |
| Customers | Apple holds the relationship | You have emails and control |

## Path A: Mac App Store with payments

1. Join the Apple Developer Program and accept the Paid Apps Agreement.
2. Create the app record for macOS and its in-app purchases or subscriptions, as in [the payments guide](/blogs/launch-mobile-app-with-payments-revenuecat).
3. Enable **App Sandbox** and request only the entitlements you need.
4. Integrate in-app purchase through StoreKit or RevenueCat, which supports macOS.
5. Archive, upload and submit, then test with a sandbox account.

Sandboxing limits file and network access, so check early that your features still work.

## Path B: direct distribution

1. Sign with a **Developer ID Application** certificate and enable the **Hardened Runtime**.
2. **Notarize** the build through Apple's notary service so Gatekeeper lets it open without warnings, and staple the ticket.
3. Package it as a signed `.dmg` or `.zip`.
4. Sell it with a payment provider. A merchant of record can handle sales tax and VAT for you, which saves a lot of paperwork. Compare provider terms yourself.
5. Deliver a license key or account login and verify it in the app.
6. Add an updater so users get new versions.

Never ship unsigned or un-notarized builds to customers, since macOS warns or blocks them.

## Licensing basics

Keep license checks simple and respectful. Verify on a server where possible, allow offline grace periods, and never put private keys or provider secrets inside the app, since anyone can inspect a binary.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| App needs full disk or accessibility access | Sandbox limits it | Consider direct distribution |
| Customers want Apple's purchase flow | Direct sales feel unfamiliar | Offer the store version too |
| Selling to EU customers | Extra rules apply | See [the EU rules post](/blogs/eu-app-store-rules-for-developers) |
| Provider outage | Customers cannot buy | Keep a status page and a manual license option |

## Security

Protect your signing identities and notarization credentials like passwords. Use app-specific passwords or API keys kept in a secret store, never in the repo or chat.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. Do not give the agent signing keys or payment-provider secrets. Make it show every release or pricing action first and test with sandbox or test mode.

## FAQ

### Can I sell the same app in both places?
Yes, but follow each channel's rules, and be careful about how you mention outside purchase options inside the store build.

### Do I need notarization for the App Store?
No, the store review replaces it. Notarization is for direct distribution.

### Which is better for a solo developer?
The store is simpler to start. Direct gives control as you grow.

## Next steps

See [the iOS submission walkthrough](/blogs/publish-ios-app-app-store-step-by-step) and [EU rules](/blogs/eu-app-store-rules-for-developers). Show your app in action with a recorded demo from [Subclip](subclip:inline-mac-demo).
