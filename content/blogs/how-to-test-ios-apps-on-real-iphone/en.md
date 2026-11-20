---
title: "How to Test iOS Apps on Real iPhone (Complete Setup for Beginners)"
seoTitle: "How to Test iOS Apps on a Real iPhone (Beginner Setup)"
description: Run your Xcode app on a real iPhone: sign in with an Apple ID, turn on Developer Mode, trust the Mac, pick your device and fix common signing errors.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 77
readTime: 8 min
primaryKeyword: test ios app on real iphone
keywords: [test ios app real iphone, xcode run on device, developer mode iphone, xcode signing, wireless debugging xcode, ios beginner setup]
related: [publish-ios-app-app-store-step-by-step, how-to-use-testflight-for-ios-app-testing, apple-sign-in-supabase-ios-tutorial]
subclipBlurb: Subclip records and edits screen demos, handy for capturing your app running on a real device.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search once the app is ready to share.
---

The simulator is fast, but it cannot show real performance, camera, push notifications, Sign in with Apple behavior or in-app purchases. Running on a real iPhone is free with a normal Apple ID, and it takes a few minutes once. This guide covers the first-time setup in order. Settings names move between iOS and Xcode versions, so follow the sequence and check Apple's documentation if a label differs.

::youtube[uhiy6nbmLgU] How to Test iOS Apps on Real iPhone (Complete Setup for Beginners)

## Quick answer

1. Add your Apple ID to Xcode and pick it as the signing team.
2. Connect the iPhone with a cable and tap **Trust** on the phone.
3. Turn on **Developer Mode** on the iPhone and restart it.
4. Select the iPhone as the run destination and press Run.
5. If asked, trust the developer certificate on the phone.

## Step 1: sign in to Xcode

Open **Xcode, Settings, Accounts**, click **+** and add your Apple ID. In your project's **Signing and Capabilities** tab enable **Automatically manage signing** and choose your personal team. Use a unique bundle ID such as `com.yourname.myapp`.

## Step 2: connect and trust

Plug the iPhone into the Mac, unlock it and accept **Trust This Computer**. The device should appear in Xcode's destination menu.

## Step 3: enable Developer Mode

On the iPhone open **Settings, Privacy and Security**, scroll down, turn on **Developer Mode** and restart when asked. The option only appears after you connect the device to Xcode.

## Step 4: run

Choose your iPhone as the destination and press **Run**. The first install can take a while. If iOS says the developer is not trusted, open **Settings, General, VPN and Device Management** and trust your profile.

## Step 5: go wireless (optional)

With the phone still connected, open **Window, Devices and Simulators**, select the phone and enable **Connect via network**. After that Xcode can run on the phone over the same Wi-Fi.

## Limits of a free account

Apps signed with a free personal team expire after a short period and must be rebuilt, and some capabilities such as push notifications and in-app purchase need the paid Apple Developer Program. When you are ready to share builds with others, use TestFlight, covered in [how to use TestFlight](/blogs/how-to-use-testflight-for-ios-app-testing).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Signing error about a team | No team selected | Pick your Apple ID team |
| Bundle ID unavailable | Someone already used it | Change to a unique ID |
| Developer Mode missing | Device never connected to Xcode | Connect, then check Privacy and Security |
| App closes right away | Untrusted profile or crash | Trust the profile, check the Xcode console |
| Device not listed | Cable or trust issue | Unlock, re-plug, accept Trust |

## Security

Do not share your Apple ID password or signing files with anyone, including AI agents. Keep test accounts separate from real user data.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. An agent can explain Xcode errors, but never paste credentials into the chat.

## FAQ

### Do I need to pay to test on my own iPhone?
No. A free Apple ID is enough for basic device testing, with limits on capabilities and how long the build runs.

### Why is Developer Mode not showing?
It appears after the device has been connected to a Mac running Xcode. Connect and unlock it, then look again.

### Can I test without a cable?
Yes, after one wired setup you can enable network connection in Devices and Simulators.

## Next steps

When it runs, share it with testers through [TestFlight](/blogs/how-to-use-testflight-for-ios-app-testing) and follow [the full publishing guide](/blogs/publish-ios-app-app-store-step-by-step). Capture a device demo with [Subclip](subclip:inline-device-demo).
