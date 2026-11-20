---
title: "RevenueCat Tutorial for iOS: Complete Dashboard Setup (2026)"
seoTitle: "RevenueCat Tutorial for iOS: Dashboard Setup"
description: Set up RevenueCat for an iOS app: project, products, entitlements, offerings, packages, public SDK key and a sandbox test, in the right order.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 81
readTime: 10 min
primaryKeyword: revenuecat tutorial ios
keywords: [revenuecat tutorial, revenuecat dashboard setup, entitlements offerings packages, revenuecat ios, paywall setup, in-app subscription ios]
related: [how-to-connect-revenuecat-to-app-store-connect, revenuecat-swift-in-app-subscriptions, revenuecat-mcp-server-setup-paywalls-swiftui]
subclipBlurb: Subclip records and edits screen demos, great for a short walkthrough of your RevenueCat dashboard setup.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search as your subscription app grows.
---

RevenueCat's dashboard has a few objects that depend on each other, and the order you create them in matters. This tutorial walks through them for an iOS app: project, app, products, entitlements, offerings and packages. Labels change between releases, so use this as the sequence and confirm names in the current RevenueCat docs.

::youtube[X6xesg7YrU0] RevenueCat Tutorial for iOS: Complete Dashboard Setup (2026)

## Quick answer

1. Create a project and add your iOS app (see [connecting to App Store Connect](/blogs/how-to-connect-revenuecat-to-app-store-connect)).
2. Add products that match your App Store Connect identifiers.
3. Create an entitlement, such as `pro`, and attach the products.
4. Create an offering with packages that each point at a product.
5. Copy the public SDK key, add the SDK to your app and test in the sandbox.

## The model in one table

| Object | What it is | Example |
| --- | --- | --- |
| Product | A store product identifier | `monthly_pro` |
| Entitlement | What the user unlocks | `pro` |
| Offering | A set of packages you show | `default` |
| Package | A product placed in an offering | `$rc_monthly` |

Your app checks entitlements, not products. That keeps your code stable when you change prices or add plans.

## Step 1: products

Add each store product by its exact identifier or import it from App Store Connect. Typical starting set: monthly and annual subscriptions, and optionally a lifetime purchase.

## Step 2: entitlements

Create one entitlement for each thing you gate, usually just `pro`. Attach every product that unlocks it, so monthly, annual and lifetime all grant `pro`.

## Step 3: offerings and packages

Create an offering, mark it current, and add packages using RevenueCat's standard identifiers: `$rc_monthly`, `$rc_annual`, `$rc_lifetime`. Each package points at one product. Your paywall reads the current offering, so you can change what is shown without shipping an update.

## Step 4: the public SDK key

Copy the iOS **public** SDK key from the app settings. It is meant to be embedded in the app. Never put a secret API key in the client.

## Step 5: paywall

Build a paywall in RevenueCat's paywall editor or in SwiftUI with the offering's packages. The Swift side is covered in [RevenueCat with Swift](/blogs/revenuecat-swift-in-app-subscriptions).

## Step 6: sandbox test

Use a sandbox tester on a real device, buy a package and check that the entitlement turns active in the dashboard's customer view. Try restoring purchases too.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Offerings are empty | No current offering or products not ready | Mark an offering current and check store state |
| Entitlement not active after purchase | Product not attached | Attach the product to the entitlement |
| Wrong prices | Store price differs | Change prices in App Store Connect |

## Security

Only the public SDK key goes in the app. Keep secret API keys server-side and out of chats.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. You can skip clicking through the dashboard by letting an agent do this with [the RevenueCat MCP server](/blogs/revenuecat-mcp-server-setup-paywalls-swiftui), after you read each change it plans.

## FAQ

### What is the difference between a product and an entitlement?
A product is something you sell. An entitlement is the access the user gets. Several products can grant one entitlement.

### Do I need an offering?
Yes if you want to show a paywall from RevenueCat or read packages in the app.

### Which key goes in the app?
The public SDK key for the platform.

## Next steps

Write the code in [the Swift guide](/blogs/revenuecat-swift-in-app-subscriptions), automate the setup with [the MCP server guide](/blogs/revenuecat-mcp-server-setup-paywalls-swiftui) and record a walkthrough with [Subclip](subclip:inline-dashboard-demo).
