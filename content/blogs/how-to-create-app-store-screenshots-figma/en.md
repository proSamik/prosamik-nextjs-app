---
title: "How to Create App Store Screenshots - Fast & Easy using Figma"
seoTitle: "How to Create App Store Screenshots with Figma"
description: Design App Store screenshots in Figma with the right sizes, a reusable template, short captions and export settings, then upload them to App Store Connect.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 79
readTime: 8 min
primaryKeyword: app store screenshots figma
keywords: [app store screenshots, figma app store template, screenshot sizes iphone, app store listing, aso screenshots, app store connect screenshots]
related: [publish-ios-app-app-store-step-by-step, ipad-app-app-store-guide, how-to-use-testflight-for-ios-app-testing]
subclipBlurb: Subclip records and edits screen demos, ideal for the app preview video that sits beside your screenshots.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search, a good companion to a polished App Store listing.
---

Screenshots are the first thing people see on your App Store page, and most visitors never read the description. You do not need a designer: one Figma file with a reusable frame, short captions and real screens is enough. Apple changes the required sizes over time, so confirm the current list in App Store Connect before you export.

::youtube[RDbkDFaxaq4] How to Create App Store Screenshots - Fast & Easy using Figma

## Quick answer

1. Check which device sizes App Store Connect asks for.
2. Capture clean screens from the simulator or a real device.
3. In Figma, make one frame per size with a background, a short headline and the device screen.
4. Duplicate the frame for each screen and change the caption and image.
5. Export at the exact pixel size and upload in order.

## Step 1: check the required sizes

In your app's version page, App Store Connect lists the screenshot slots and exact pixel sizes for each device class. Provide the largest iPhone size and, if you support iPad, the iPad sizes. A 6.9-inch iPhone screenshot is 1320 by 2868 pixels, for example, but verify against the current list.

## Step 2: capture clean screens

Use a test account with realistic data, a full battery and a clean status bar. Remove debug banners and placeholder text. Capture from the simulator at the required device or from your iPhone.

## Step 3: build the Figma frame

Create a frame at the exact export size. Add a background color, a headline of a few words at the top and place the screenshot below it, optionally inside a device frame. Turn the frame into a component so edits apply to all screenshots.

## Step 4: write short captions

Each screenshot should answer one question: what does this screen let me do? Use outcomes, such as "Track every habit in one tap", not feature names. Keep the text large enough to read at thumbnail size.

| Slot | Content |
| --- | --- |
| 1 | The main benefit |
| 2 to 3 | Your two best features |
| 4 to 5 | Proof, such as a result or a social signal you really have |
| Last | A call to action or a secondary feature |

## Step 5: export and upload

Select the frames, set export to PNG at 1x, and make sure the dimensions match exactly. Drag them into the matching slot in App Store Connect. The order you upload is the order shown.

## Common mistakes

- Wrong pixel size, which App Store Connect rejects.
- Screens with test data that looks fake.
- Text too small to read in search results.
- Claims in captions that the app does not deliver, which can cause a rejection.

## Security and privacy

Do not show real customers' names, emails or messages in screenshots.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. An agent can help write captions or generate variations, but you should check every claim against what the app really does.

## FAQ

### Do I need screenshots for every device size?
Usually the largest size per device class is enough and App Store Connect scales it, but check the current requirements.

### Can I add a video?
Yes, an app preview video can sit before the screenshots. Record it with a screen tool such as [Subclip](subclip:inline-preview-video).

### Can I use AI to design them?
You can use it for ideas and captions, but keep the real screens and verify claims.

## Next steps

Continue with [the full publishing guide](/blogs/publish-ios-app-app-store-step-by-step), prepare iPad sizes with [the iPad guide](/blogs/ipad-app-app-store-guide) and test builds with [TestFlight](/blogs/how-to-use-testflight-for-ios-app-testing).
