---
title: "How to Connect RevenueCat to App Store Connect - Complete Setup Guide"
seoTitle: "How to Connect RevenueCat to App Store Connect"
description: Link RevenueCat to App Store Connect with the right bundle ID, an In-App Purchase key and an API key so products import and purchases validate.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 80
readTime: 9 min
primaryKeyword: connect revenuecat to app store connect
keywords: [revenuecat app store connect, in-app purchase key, revenuecat setup ios, app store connect api key, import products revenuecat, subscription setup ios]
related: [launch-mobile-app-with-payments-revenuecat, revenuecat-tutorial-for-ios-dashboard-setup, revenuecat-mcp-server-setup-paywalls-swiftui]
subclipBlurb: Subclip records and edits screen demos, useful for showing the connection steps in a short walkthrough.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search once subscriptions are live.
---

RevenueCat sits between your app and the App Store, so it needs permission to talk to your App Store Connect account. That permission comes from keys you create in App Store Connect and upload to RevenueCat. Once connected, RevenueCat can validate purchases and import your products. Names and menus change over time, so follow the order and check RevenueCat's current docs for exact labels.

::youtube[dKrKa27ECQg] How to Connect RevenueCat to App Store Connect - Complete Setup Guide

## Quick answer

1. Create the app and its subscription products in App Store Connect.
2. Add a RevenueCat project and an iOS app with the same bundle ID.
3. Create an **In-App Purchase** key in App Store Connect and upload it to RevenueCat.
4. Add an App Store Connect API key if you want RevenueCat to import products and check state.
5. Validate the credentials, import products and test in the sandbox.

## Step 1: products in App Store Connect

Create the app record, then add a subscription group and products with identifiers, durations and prices. Add localized names and a review screenshot for each product. Products must be ready to submit before the store returns them in tests.

## Step 2: RevenueCat project and app

In the RevenueCat dashboard create a project and add an **App Store** app. Enter the bundle ID exactly as it appears in Xcode and App Store Connect.

## Step 3: the In-App Purchase key

In App Store Connect open **Users and Access**, then **Integrations**, and find the **In-App Purchase** section. Generate a key, download the `.p8` file once and note the Key ID and Issuer ID. In RevenueCat's app settings upload the key file and enter those IDs. This lets RevenueCat verify purchases with Apple.

## Step 4: the App Store Connect API key

For product import and store state checks, create an App Store Connect API key under the same Integrations area with a limited role, then add it in RevenueCat. Use the narrowest role that works.

## Step 5: validate and import

RevenueCat shows whether the credentials work. Fix any red checks, then import the products from the store or add them by identifier.

## Step 6: sandbox test

Run the app on a real device signed in with a sandbox tester account. Make a test purchase and confirm it appears in RevenueCat's customer view. Details on the dashboard side are in [the dashboard setup tutorial](/blogs/revenuecat-tutorial-for-ios-dashboard-setup).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Credentials show an error | Wrong key, key ID or issuer ID | Re-enter or regenerate the key |
| Products missing | Not ready in App Store Connect | Complete metadata and agreements |
| Empty offerings in the app | Products not attached to an offering | Attach them in the dashboard |
| Sandbox purchase fails | Not signed into a sandbox account | Use a sandbox tester on a device |

## Security

The `.p8` file is a credential. Keep it out of your repo, backups and chats. Revoke keys you no longer use and give API keys only the access they need.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. Do not paste keys into a chat. An agent can set up the dashboard through [the RevenueCat MCP server](/blogs/revenuecat-mcp-server-setup-paywalls-swiftui), but credentials still belong in the dashboard.

## FAQ

### Do I need both keys?
The In-App Purchase key is needed for validation. The API key adds product import and store checks, so most setups use both.

### Can I connect before the app is published?
Yes. Sandbox testing works before release if products and agreements are set up.

### Where do I get the bundle ID?
From Xcode's target settings. It must match the App Store Connect app.

## Next steps

Continue with [the dashboard tutorial](/blogs/revenuecat-tutorial-for-ios-dashboard-setup), the wider [payments guide](/blogs/launch-mobile-app-with-payments-revenuecat) and [the MCP server guide](/blogs/revenuecat-mcp-server-setup-paywalls-swiftui). Record the setup for your team with [Subclip](subclip:inline-setup-clip).
