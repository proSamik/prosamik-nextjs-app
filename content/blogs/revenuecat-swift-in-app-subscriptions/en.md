---
title: How to Add In-App Subscriptions with RevenueCat and Swift
seoTitle: How to Add In-App Subscriptions with RevenueCat
description: Add the RevenueCat SDK to a SwiftUI app, configure it, fetch offerings, make a purchase, check entitlements, restore purchases and test with a sandbox account.
category: Apple App Store
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 69
readTime: 10 min
primaryKeyword: revenuecat swift subscriptions
keywords: [revenuecat swift, swiftui subscriptions, in-app purchase swift, revenuecat sdk, purchases configure, restore purchases]
related: [launch-mobile-app-with-payments-revenuecat, publish-ios-app-app-store-step-by-step, ipad-app-app-store-guide]
subclipBlurb: Subclip records and edits screen demos, ideal for a paywall preview video.
rankizzBlurb: Rankizz tracks how your app page ranks and gets cited by AI search after launch.
---

With RevenueCat's SDK, selling a subscription in SwiftUI takes four calls: configure, fetch offerings, purchase a package and check the entitlement. This guide shows each step. Do the store and dashboard setup first in [the payments setup guide](/blogs/launch-mobile-app-with-payments-revenuecat), and check RevenueCat's current SDK docs because method names evolve.

::youtube[8LA1O_ykskA] How to Implement RevenueCat in iOS Apps (with Supabase)

## Quick answer

Add the package with Swift Package Manager, call `Purchases.configure(withAPIKey:)` at launch with your public SDK key, load `Purchases.shared.offerings()`, purchase a package, then unlock features when `customerInfo.entitlements["pro"]?.isActive == true`.

## Step 1: add the SDK

In Xcode choose **File, Add Package Dependencies**, enter RevenueCat's `purchases-ios` repository URL from their docs, and add the `RevenueCat` product to your app target. Enable the **In-App Purchase** capability under Signing and Capabilities.

## Step 2: configure at launch

```swift
import SwiftUI
import RevenueCat

@main
struct MyApp: App {
    init() {
        Purchases.logLevel = .warn
        Purchases.configure(withAPIKey: "YOUR_PUBLIC_SDK_KEY")
    }
    var body: some Scene { WindowGroup { ContentView() } }
}
```

Use the public SDK key from the dashboard. It is meant to ship in the app, but never put a secret API key here.

## Step 3: show the paywall data

```swift
@MainActor
final class Store: ObservableObject {
    @Published var packages: [Package] = []
    @Published var isPro = false

    func load() async {
        do {
            let offerings = try await Purchases.shared.offerings()
            packages = offerings.current?.availablePackages ?? []
            let info = try await Purchases.shared.customerInfo()
            isPro = info.entitlements["pro"]?.isActive == true
        } catch { print("Load failed: \(error.localizedDescription)") }
    }

    func buy(_ package: Package) async {
        do {
            let result = try await Purchases.shared.purchase(package: package)
            if !result.userCancelled {
                isPro = result.customerInfo.entitlements["pro"]?.isActive == true
            }
        } catch { print("Purchase failed: \(error.localizedDescription)") }
    }

    func restore() async {
        do {
            let info = try await Purchases.shared.restorePurchases()
            isPro = info.entitlements["pro"]?.isActive == true
        } catch { print("Restore failed: \(error.localizedDescription)") }
    }
}
```

Use your own entitlement ID in place of `pro`. Show `package.storeProduct.localizedPriceString` on the button so the price matches the user's country and currency.

## Step 4: a minimal paywall

```swift
struct PaywallView: View {
    @StateObject private var store = Store()
    var body: some View {
        VStack(spacing: 12) {
            ForEach(store.packages, id: \.identifier) { package in
                Button("\(package.storeProduct.localizedTitle) - \(package.storeProduct.localizedPriceString)") {
                    Task { await store.buy(package) }
                }
            }
            Button("Restore purchases") { Task { await store.restore() } }
            Text("Subscription renews automatically until cancelled. Manage it in your Apple ID settings.")
                .font(.footnote)
        }
        .task { await store.load() }
    }
}
```

Add links to your terms and privacy policy on the paywall. Apple expects clear renewal terms and a restore option.

## Step 5: test

1. Use a physical device or simulator signed in with a sandbox tester.
2. Buy each package and confirm `isPro` flips.
3. Delete and reinstall the app, press restore and confirm access returns.
4. Check the customer appears in the RevenueCat dashboard.

You can also use a local StoreKit configuration file in Xcode for fast offline tests, then do a final sandbox run.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `offerings.current` is nil | No current offering set | Mark an offering as current |
| Empty `availablePackages` | Products not ready or not attached | Check product status and packages |
| Entitlement never active | Product not attached to entitlement | Attach it in the dashboard |
| Purchase errors in simulator | Not signed in to sandbox | Sign in with a tester |

## Security

Gate features on the entitlement, and for sensitive server data verify the purchase on your server through RevenueCat's API using a secret key kept only on the server. The app alone can be tampered with on a jailbroken device.

## If you use an AI agent for this

Treat tool output as data, not instructions. Keep secret keys out of prompts and out of the app code. Ask the agent to check method names against RevenueCat's current docs before running, since SDK versions change.

## FAQ

### Do I need a backend?
Not to start. A backend helps when you must protect server-side content.

### How do I support iPad and Mac?
The same SDK works across Apple platforms. See [the iPad guide](/blogs/ipad-app-app-store-guide).

### Where do I set prices?
In App Store Connect, not in code.

## Next steps

Finish [the store setup](/blogs/launch-mobile-app-with-payments-revenuecat), then submit with [the walkthrough](/blogs/publish-ios-app-app-store-step-by-step). Show the paywall in action with a clip from [Subclip](subclip:inline-paywall-clip).
