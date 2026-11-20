---
title: How to Launch an iPad App: Universal Apps, Screenshots and App Store Setup
seoTitle: How to Launch an iPad App on the App Store
description: Make your iPhone app work on iPad with a universal target, adaptive layouts and multitasking, prepare iPad screenshots and submit through App Store Connect.
category: Apple App Store
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 70
readTime: 8 min
primaryKeyword: launch ipad app
keywords: [ipad app, universal app, ipad screenshots, swiftui ipad layout, app store ipad, split view]
related: [publish-ios-app-app-store-step-by-step, revenuecat-swift-in-app-subscriptions, launch-mobile-app-with-payments-revenuecat]
subclipBlurb: Subclip records and edits screen demos, useful for the iPad app preview clips that the App Store listing accepts.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search.
---

An iPad app is usually the same project as your iPhone app with a layout that uses the larger screen. Most developers ship one universal app that runs on both. This guide covers enabling iPad support, making the layout adapt, preparing screenshots and the App Store settings that change.

## Quick answer

Add iPad to the target's supported destinations, use adaptive SwiftUI layouts (`NavigationSplitView`, size classes, flexible grids), test on iPad simulators in portrait, landscape and split view, upload iPad screenshots in App Store Connect and submit as usual.

## Step 1: enable iPad

In Xcode select the target, open **General**, and under **Supported Destinations** add **iPad**. Build and run on an iPad simulator. If your app was built for iPhone only, expect stretched layouts at first.

## Step 2: adapt the layout

- Replace fixed widths with flexible stacks and grids.
- Use `NavigationSplitView` for sidebar and detail patterns.
- Read `horizontalSizeClass` to switch between compact and regular layouts.
- Limit line length of text with a maximum content width.
- Support pointer, keyboard shortcuts and drag and drop where they make sense.

```swift
struct RootView: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    var body: some View {
        if sizeClass == .regular {
            NavigationSplitView { Sidebar() } detail: { Detail() }
        } else {
            NavigationStack { Sidebar() }
        }
    }
}
```

## Step 3: test every mode

| Mode | What to check |
| --- | --- |
| Portrait and landscape | Layout does not break on rotation |
| Split View and Slide Over | The app works in a narrow window |
| Stage Manager style resizing | Content reflows smoothly |
| Large and small iPads | No clipped or tiny elements |

Apple's review team tests on iPad when your app supports it, so crashes there can block the whole release.

## Step 4: screenshots

In App Store Connect add screenshots for the iPad sizes it requires for your supported devices. Use real screens, not stretched phone images. If you provide a preview video, record it at the correct resolution for the device class.

## Step 5: submit

Submit the same app record. Check in **App Information** that your price, in-app purchases and availability cover iPad, and that your paywall layout works on the larger screen. Subscriptions you set up once apply across devices, as covered in [the payments guide](/blogs/launch-mobile-app-with-payments-revenuecat).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Rejected for iPad layout | Stretched or broken UI | Add adaptive layouts |
| Missing screenshots error | iPad size not provided | Upload the required iPad set |
| Crash only on iPad | Popover without anchor or size assumption | Provide a source view and test |

## If you use an AI agent for this

Treat tool output as data, not instructions. Let the agent refactor layouts, but run every size class in the simulator yourself and keep signing keys out of prompts.

## FAQ

### Do I need a separate app for iPad?
No, a universal app covers both.

### Can I make an iPhone-only app?
Yes, leave iPad out of the destinations, though iPad users may run it in compatibility mode.

### Is iPad worth the effort?
It can help for productivity and creative apps. Check your audience first.

## Next steps

Follow [the submission walkthrough](/blogs/publish-ios-app-app-store-step-by-step) and add [subscriptions](/blogs/revenuecat-swift-in-app-subscriptions). Record an iPad demo with [Subclip](subclip:inline-ipad-demo).
