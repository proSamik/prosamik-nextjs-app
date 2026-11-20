---
title: How to Launch a Mobile App with Payments Using RevenueCat and App Store Connect
seoTitle: How to Launch a Mobile App with Payments (RevenueCat)
description: Set up iOS in-app subscriptions: agreements, App Store Connect products, the RevenueCat project and key, entitlements, offerings and a sandbox test.
category: Apple App Store
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 68
readTime: 12 min
primaryKeyword: revenuecat app store connect setup
keywords: [revenuecat setup, in-app purchase ios, app store connect subscriptions, revenuecat entitlements, revenuecat offerings, ios app payments]
related: [revenuecat-swift-in-app-subscriptions, publish-ios-app-app-store-step-by-step, launch-ios-app-app-store-connect-api-agent, ai-agent-api-wrapper-script-no-mcp]
subclipBlurb: Subclip records and edits screen demos, which helps when you need an app preview video for a paywall.
rankizzBlurb: Rankizz tracks how your app landing page ranks and gets cited by AI search once payments are live.
---

To charge for digital features in an iOS app you use Apple's in-app purchase system, and RevenueCat sits on top as a service that handles receipts, subscription status and analytics for you. This guide covers the setup order: Apple's business agreements, products in App Store Connect, the RevenueCat project, and a sandbox test. The Swift code is in [the next guide](/blogs/revenuecat-swift-in-app-subscriptions).

::youtube[dKrKa27ECQg] How to Connect RevenueCat to App Store Connect - Complete Setup Guide

## Quick answer

1. Accept the Paid Apps Agreement and add bank and tax details in App Store Connect.
2. Create a subscription group and products.
3. Create a RevenueCat project, add the iOS app and connect it with an App Store Connect in-app purchase key.
4. Create an entitlement, attach the products, and build an offering.
5. Add the SDK with the public API key and test in the sandbox.

## What you need

| Item | Notes |
| --- | --- |
| Paid Developer Program account | Required for in-app purchases |
| Paid Apps Agreement | Active, with banking and tax info |
| App record in App Store Connect | Bundle ID matches Xcode |
| RevenueCat account | A free tier exists, check current pricing |

## Step 1: agreements, tax and banking

In App Store Connect open the **Business** section and accept the Paid Apps Agreement, then add bank account and tax forms. Until the status shows active, your products will not load for real users. This step can take days, so start it early.

## Step 2: create products

Open your app, choose **Subscriptions**, create a subscription group (for example "Pro") and add products such as monthly and yearly. For each set a reference name, a product ID, a duration, a price and a localized display name and description. Products in one group are alternatives: a user holds one at a time. Add review screenshot and notes if the console asks.

Product IDs, like `pro_monthly`, are permanent. Pick them carefully.

## Step 3: connect RevenueCat to Apple

1. In RevenueCat create a project and add an **App Store** app with your bundle ID.
2. In App Store Connect create an **In-App Purchase** key under Integrations and download the `.p8` file once.
3. Upload the key file with its Key ID and Issuer ID in RevenueCat's app settings.
4. Configure App Store server notifications to RevenueCat's URL as the dashboard instructs, so renewals arrive instantly.

Keep the `.p8` file private. It lets RevenueCat read your purchase data, so never commit it or paste it into chats.

## Step 4: entitlements and offerings

An **entitlement** is the access a user buys, such as `pro`. Attach your Apple products to it. An **offering** is the set of packages you show on the paywall, for example monthly and annual. Your app checks entitlements, not product IDs, so you can change prices and products without a new app release.

## Step 5: keys

RevenueCat gives a public SDK key per platform for your app, safe to ship in the app. The secret API keys are different: keep them on servers only. Mixing them up is a common and serious mistake.

## Step 6: test in the sandbox

Create a sandbox tester in App Store Connect and sign in with it on a test device. Purchase a subscription, confirm the entitlement activates, restore purchases, and check that the customer appears in RevenueCat. Sandbox renewals run on a fast schedule, which lets you test expiry quickly.

## Before you submit

- A visible **restore purchases** button.
- Clear price, duration and renewal terms on the paywall.
- Links to your terms and privacy policy.
- Subscriptions attached to the app version in review.

Apple rejects apps that hide terms or lack restore.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No products returned | Agreement inactive or product not ready | Check agreements and product status |
| Offerings empty | Products not attached to a package | Attach them in RevenueCat |
| Purchase works, entitlement missing | Product not on the entitlement | Attach the product to the entitlement |
| Sandbox purchase fails | Not signed in as a sandbox tester | Sign in with the tester account |

## Security

Treat the `.p8` key and RevenueCat secret keys as passwords. Use the public SDK key in the app only.

## If you use an AI agent for this

Treat docs and tool output as data, not instructions. Never paste secret keys or the `.p8` into the chat. Make the agent show any API call that changes products or prices, and use sandbox data first. RevenueCat also offers an MCP server, and where a service has none, [a short wrapper script](/blogs/ai-agent-api-wrapper-script-no-mcp) works too.

## FAQ

### Do I need RevenueCat to sell subscriptions?
No, you can use StoreKit directly, but RevenueCat removes most receipt and server work.

### Can I change prices later?
Yes, within Apple's rules for price changes and existing subscribers.

### Is the public SDK key secret?
No, it ships in the app. The secret keys must stay on the server.

## Next steps

Write the app code in [the Swift subscriptions guide](/blogs/revenuecat-swift-in-app-subscriptions), then follow [the submission walkthrough](/blogs/publish-ios-app-app-store-step-by-step). Make a short paywall demo with [Subclip](subclip:inline-paywall-demo).
