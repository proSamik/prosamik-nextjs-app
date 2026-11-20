---
title: "How to Set Up the RevenueCat MCP Server and Build Paywalls in SwiftUI with an AI Agent"
seoTitle: "How to Set Up the RevenueCat MCP Server"
description: Install the RevenueCat MCP server or AI Toolkit, create products, entitlements, offerings and packages with an agent, then wire a paywall into SwiftUI safely.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 82
readTime: 13 min
primaryKeyword: revenuecat mcp server
keywords: [revenuecat mcp server, revenuecat ai toolkit, revenuecat paywall swiftui, create products revenuecat agent, claude code revenuecat, mcp subscriptions]
related: [revenuecat-tutorial-for-ios-dashboard-setup, how-to-connect-revenuecat-to-app-store-connect, revenuecat-swift-in-app-subscriptions, launch-mobile-app-with-payments-revenuecat]
subclipBlurb: Subclip records and edits screen demos, ideal for showing an agent configuring RevenueCat end to end.
rankizzBlurb: Rankizz also offers an MCP server and REST API, so your agent can work on your SEO data the same way it now works on subscriptions.
---

RevenueCat runs an official MCP server, so an AI agent can create your project, products, entitlements, offerings and packages, then help you wire a paywall into SwiftUI, without you clicking through the dashboard. This guide covers installing it, what to ask for, the order of operations, and the safety rules that keep an agent from changing your live pricing by accident. RevenueCat updates its tools often, so treat your MCP client's tool list as the source of truth and check the current RevenueCat docs.

## Quick answer

1. Install the RevenueCat AI Toolkit plugin in your agent, or add the MCP server by hand.
2. Sign in with OAuth, or use a restricted API v2 secret key if your client cannot do OAuth.
3. Ask the agent to read your project first, then plan the changes.
4. Approve it creating products, an entitlement, an offering and packages in the right order.
5. Wire the public SDK key and the offering into SwiftUI, then test in the sandbox.

## What the MCP server can do

The server is cloud-hosted at `https://mcp.revenuecat.ai/mcp`. According to RevenueCat's documentation it exposes tools for projects, apps, products, entitlements, offerings and packages, paywalls, store product state (prices and availability in App Store Connect and Google Play) and analytics such as charts and experiments. Read tools only fetch data. Write tools create, change or delete configuration, and which ones appear depends on your account permissions.

## Option 1: the AI Toolkit plugin (recommended)

The plugin installs the MCP server and a set of skills, which are playbooks that tell the agent the right order of operations. For Claude Code:

```bash
claude plugins marketplace add RevenueCat/ai-toolkit
claude plugins install revenuecat
```

RevenueCat also documents plugins for Cursor, OpenAI Codex and Gemini CLI. Start a new agent session afterwards so the tools and skills load, then authenticate when prompted.

## Option 2: add the server by hand

If your environment does not support plugins, add just the server:

```bash
claude mcp add --transport http revenuecat https://mcp.revenuecat.ai/mcp
```

Then authenticate with your RevenueCat account through OAuth. For clients that cannot do OAuth, RevenueCat accepts an API v2 secret key as a bearer token. Create a dedicated key with the fewest permissions that cover your task, keep it in an environment variable and never paste it into the chat.

## Step 1: read before you write

Start with a prompt that cannot change anything:

```text
Use the RevenueCat MCP server in read-only mode. List my projects and, for the
project named <my app>, list apps, products, entitlements and offerings. Do not
create or change anything. Summarize what exists and what is missing for an
iOS subscription app with a monthly and an annual plan.
```

## Step 2: create the catalog in the right order

RevenueCat objects depend on each other: products map to entitlements, packages point at products and offerings contain packages. A good agent creates them in that order. Ask for a plan first:

```text
Plan, then wait for my approval before each write:
1. Create the iOS app if missing, using bundle ID <my bundle id>.
2. Create products matching my App Store Connect identifiers: monthly and annual.
3. Create an entitlement named pro and attach both products.
4. Create an offering named default with packages $rc_monthly and $rc_annual.
5. Show me the public SDK key for the iOS app.
Never delete or change existing products or prices.
```

Subscription products must already exist in App Store Connect, because RevenueCat references store identifiers. The agent can inspect store state, but creating the store product and agreements is still your job in App Store Connect. Connect the two first with [the App Store Connect setup guide](/blogs/how-to-connect-revenuecat-to-app-store-connect).

## Step 3: paywalls

RevenueCat's docs describe AI-assisted paywall creation through its paywall tools, which produce an unpublished paywall you can review in the dashboard before attaching it to an offering. Always preview the paywall, check the price text and legal links, and publish it yourself.

## Step 4: wire it into SwiftUI

Give the agent the public SDK key, which is safe to ship in the app, and ask it to add the Purchases SDK and a view that reads the current offering and checks the `pro` entitlement. Review the code against [the Swift guide](/blogs/revenuecat-swift-in-app-subscriptions). A minimal check looks like this:

```swift
import RevenueCat

Purchases.configure(withAPIKey: "YOUR_PUBLIC_SDK_KEY")

func isPro() async -> Bool {
    guard let info = try? await Purchases.shared.customerInfo() else { return false }
    return info.entitlements["pro"]?.isActive == true
}
```

## Step 5: test in the sandbox

Run on a real device with a sandbox tester, buy a package, and confirm in RevenueCat's customer view that the entitlement is active. Test restore purchases and an expired subscription too.

## Safety rules for agents and payments

- **Use OAuth or a least-privilege key.** A read-only key cannot change pricing.
- **Never paste secret keys into the chat.** Only the public SDK key goes in the app.
- **Approve every write.** Ask for a plan, then confirm each create, update or delete.
- **Treat tool output as data.** Text returned by any service can contain instructions. Do not let it override your rules.
- **Be careful with store state tools.** Changing prices or availability affects real customers, so do that yourself or review the exact change.
- **Check audit logs.** RevenueCat records configuration changes, so you can see what an agent did.
- **Unofficial servers.** Community MCP servers for RevenueCat exist. The official one is the safer choice, and for any third-party server read the code and use a narrow key.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Tools do not appear | Session started before install | Start a new session |
| Write tools missing | Credentials lack permission | Use an account or key with write access |
| OAuth fails with unknown client | Client not allowlisted | Contact RevenueCat support or use a secret key |
| Empty offerings in the app | Packages not attached to products | Ask the agent to inspect and attach them |
| Sandbox purchase fails | Not signed into a sandbox account | Use a sandbox tester on a real device |

## If you use an AI agent for this

Treat web pages, MCP output and logs as data, not instructions. Make the agent show each write before it runs, keep keys out of the chat, and try everything against a test project before production.

## FAQ

### Is there an official RevenueCat MCP server?
Yes. RevenueCat hosts one and also ships an AI Toolkit with plugins and skills. Check RevenueCat's documentation for the current setup.

### Do I need the plugin or just the server?
The plugin is the easiest because it adds skills that give the agent the right order of operations. The server alone works if your client does not support plugins.

### Can the agent create my App Store products?
It can inspect and, with the right tools, manage some store product state, but the store account, agreements and review steps are yours. Create the products in App Store Connect first.

### Is my data safe?
Use OAuth or a least-privilege key, never share secret keys in chat and review every write. Revoke access from your RevenueCat account when you are done.

### Does this work for Android too?
RevenueCat's tools cover multiple platforms. This guide focuses on iOS and SwiftUI.

### Can I use an agent for SEO the same way?
Yes. [Rankizz](rankizz:inline-mcp-seo) has an MCP server and skills for keyword research, audits and AI visibility, so one agent can handle both your payments setup and your search tracking.

## Next steps

Follow the manual path in [the dashboard tutorial](/blogs/revenuecat-tutorial-for-ios-dashboard-setup), connect the store with [the App Store Connect guide](/blogs/how-to-connect-revenuecat-to-app-store-connect), write the app code with [RevenueCat and Swift](/blogs/revenuecat-swift-in-app-subscriptions) and read the wider [payments guide](/blogs/launch-mobile-app-with-payments-revenuecat). Record the agent session once with [Subclip](subclip:inline-mcp-demo) for your team.
