---
title: "How to Use TestFlight for iOS App Testing (Complete Guide)"
seoTitle: "How to Use TestFlight for iOS App Testing"
description: Upload a build, add internal and external testers, share a public link, collect feedback and fix TestFlight-only crashes before you submit to the App Store.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 78
readTime: 9 min
primaryKeyword: testflight ios app testing
keywords: [testflight, ios beta testing, testflight external testers, testflight public link, app store connect testers, testflight crash]
related: [publish-ios-app-app-store-step-by-step, how-to-test-ios-apps-on-real-iphone, launch-ios-app-app-store-connect-api-agent]
subclipBlurb: Subclip records and edits screen demos, useful for a short clip showing testers how to install your beta.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search while your beta turns into a launch.
---

TestFlight is Apple's tool for distributing beta builds. You upload a build to App Store Connect, add testers, and they install it through the TestFlight app. It is the safest way to catch crashes and bad flows before App Review sees them. Labels in App Store Connect change over time, so use this as the sequence and check Apple's current documentation for exact wording.

::youtube[NDiRMxNdEX8] How to Use TestFlight for iOS App Testing (Complete Guide)

## Quick answer

1. Upload a build from Xcode to App Store Connect and wait for processing.
2. Answer the export compliance question for the build.
3. Add yourself as an internal tester and install through the TestFlight app.
4. Add external testers or a public link for a wider beta.
5. Read feedback and crash reports, fix, and upload a new build number.

## Step 1: upload and process

Archive in Xcode and distribute to App Store Connect. The build appears under **TestFlight** after processing, which usually takes a few minutes. Every upload needs a higher build number than the last. If Xcode's upload fails, see [4 ways to upload iOS apps to App Store Connect](https://www.youtube.com/watch?v=KlkAi9ieboQ).

## Step 2: internal testers

Internal testers are people on your App Store Connect team, up to a limit Apple documents. They get builds quickly with no review. Add yourself first, install the TestFlight app on your iPhone and test the real flow.

## Step 3: external testers

External testers are anyone with an email address or a public link. The first build for external testing goes through a short beta review by Apple, and later builds may not need a full one. You can invite testers by email or create a public link with a tester limit.

| Type | Who | Review |
| --- | --- | --- |
| Internal | Your team in App Store Connect | None |
| External | Anyone you invite | Beta App Review for the first build |
| Public link | Anyone with the link, up to your cap | Same as external |

## Step 4: tell testers what to test

Write **What to Test** notes for each build, with the changes and the flows you want checked. Testers can send feedback and screenshots from the TestFlight app, and you see crashes in App Store Connect.

## Step 5: build expiry

Builds expire after a fixed period, which Apple documents (currently 90 days), so keep a fresh build available for active testers.

## If the app only crashes in TestFlight

This usually points at release-only differences such as optimization, missing entitlements, a wrong API key for the production configuration or code that depends on debug settings. See [why your iOS app crashes in TestFlight](https://www.youtube.com/watch?v=b6fksIMklUk) and test a Release build on a device first.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Build stuck processing | Normal delay or invalid binary | Wait, then check the email from Apple |
| Missing compliance prompt | Not answered yet | Answer export compliance for the build |
| Tester cannot install | Not invited or iOS too old | Check the invite and minimum iOS version |
| Build disappeared | Expired | Upload a new build |

## Security

Do not put production secrets in a beta build that you share widely, and use test accounts for in-app purchases.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. For scripted checks of build status see [the App Store Connect API guide](/blogs/launch-ios-app-app-store-connect-api-agent), and keep Apple keys out of the chat.

## FAQ

### How many testers can I have?
Apple sets the limits for internal and external testers and may change them, so check App Store Connect's documentation.

### Do I need to pay?
Yes, TestFlight distribution needs the Apple Developer Program.

### Does TestFlight replace App Review?
No. It is for testing. Production releases still go through review.

## Next steps

Finish setup with [running on a real iPhone](/blogs/how-to-test-ios-apps-on-real-iphone) and follow [the full publishing guide](/blogs/publish-ios-app-app-store-step-by-step). Show testers how to install with a clip from [Subclip](subclip:inline-testflight-demo).
