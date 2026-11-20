---
title: How to Publish an iOS App on the App Store: Xcode and App Store Connect, Step by Step
seoTitle: How to Publish an iOS App on the App Store (Step by Step)
description: A beginner path to publish an iOS app: developer account, bundle ID, App Store Connect record, Xcode archive, TestFlight, listing, review and release.
category: Apple App Store
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 66
readTime: 12 min
primaryKeyword: publish ios app app store
keywords: [publish ios app, app store connect, xcode archive, testflight, app store submission, apple developer program]
related: [launch-ios-app-app-store-with-codex, launch-ios-app-app-store-connect-api-agent, launch-mobile-app-with-payments-revenuecat, ipad-app-app-store-guide]
subclipBlurb: Subclip records and edits screen demos, ideal for the app preview videos and walkthroughs that App Store pages use.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search after launch.
---

Publishing an iOS app means joining the Apple Developer Program, creating an app record in App Store Connect, uploading a build from Xcode, filling in the listing and submitting it for review. This guide walks the whole path in order for a first release. Screens and menu names change between Xcode versions, so use this as the sequence and follow Apple's current documentation for exact labels.

## Quick answer

1. Join the Apple Developer Program.
2. Create an App ID (bundle identifier) and an app record in App Store Connect.
3. In Xcode set the bundle ID, version and build number, sign with your team, and archive.
4. Upload the archive and test it in TestFlight.
5. Complete the listing: screenshots, description, privacy answers, age rating, pricing.
6. Submit for review, then release manually or automatically.

## What you need

| Item | Notes |
| --- | --- |
| Apple Developer Program membership | Paid yearly |
| A Mac with a current Xcode | Required to build and sign iOS apps |
| A working app | Runs on a real device without crashes |
| Privacy policy URL | Required for most apps |
| Support URL and contact | Shown on the listing |

## Step 1: join the program

Enroll at Apple's developer site with your Apple ID. Individuals enroll quickly, while organizations need a legal entity and a D-U-N-S number, which can take longer. Turn on two-factor authentication, because Apple requires it.

## Step 2: bundle ID and app record

In App Store Connect open **Apps**, choose **New App**, and pick a platform, name, language, bundle ID and SKU. The bundle ID, like `com.example.myapp`, must match Xcode exactly and cannot be changed later. The name must be unique on the store and is limited in length.

## Step 3: configure Xcode

1. Open the project and select the app target.
2. In **Signing and Capabilities** choose your team and enable automatic signing.
3. Set **Bundle Identifier**, **Version** (for example 1.0.0) and **Build** (increase it on every upload).
4. Add the capabilities you need, for example push notifications or in-app purchase.
5. Choose **Any iOS Device** as the destination, then **Product, Archive**.

## Step 4: upload and test

In the Organizer window select the archive and choose **Distribute App** to upload to App Store Connect. Processing takes a few minutes. Then use TestFlight: add yourself as an internal tester and install the build on a real device. Fix crashes before reviewers see them.

## Step 5: complete the listing

| Section | What to prepare |
| --- | --- |
| Screenshots | Required sizes for the device classes you support |
| Description and keywords | Honest and specific, no competitor names |
| App Privacy | Declare data your app and its SDKs collect |
| Age rating | Answer the questionnaire |
| Pricing and availability | Price tier and countries |
| Review information | Contact details and demo account if sign-in is needed |

Make sure the demo account, if any, works on the day of review.

## Step 6: submit and release

Choose the build, answer the export compliance and content questions, and **Submit for Review**. Review often takes a day or two but can vary. If rejected, read the message in Resolution Center, fix the cited issue and resubmit. Choose manual release if you want control over the launch time.

## Common rejection reasons

| Reason | Fix |
| --- | --- |
| Crashes or broken features | Test on real devices and the latest iOS |
| Missing or wrong privacy info | Match disclosures to actual data use |
| Incomplete demo account | Provide working credentials |
| Payments outside Apple's system for digital goods | Use in-app purchase unless an exception applies |
| Placeholder content | Replace all lorem ipsum and test data |

## Security

Keep signing certificates and App Store Connect keys private. Do not commit them or paste them into chats. Use the narrowest API role if you automate uploads.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. Do not give the agent your Apple ID password or private keys, make it show any submission or release action before it runs, and use TestFlight before production. For scripted pipelines see [the App Store Connect API guide](/blogs/launch-ios-app-app-store-connect-api-agent).

## FAQ

### How much does it cost to publish?
The Apple Developer Program has a yearly fee. Check Apple's site for the current price.

### How long does review take?
Often one to two days, but it varies.

### Can I publish without a Mac?
No, building and signing iOS apps requires Xcode on a Mac.

### Do I need TestFlight?
Not required, but strongly advised to catch problems first.

## Next steps

Read [the Codex App Store workflow](/blogs/launch-ios-app-app-store-with-codex), add payments with [RevenueCat](/blogs/launch-mobile-app-with-payments-revenuecat), and promote the launch with a short demo made in [Subclip](subclip:inline-app-preview).
