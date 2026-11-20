---
title: "Google Sign-in with Supabase: iOS Tutorial"
seoTitle: "Google Sign-In with Supabase in SwiftUI: iOS Tutorial"
description: Add Google sign-in to a SwiftUI app with the GoogleSignIn SDK and Supabase signInWithIdToken, including the Google Cloud client IDs and URL scheme.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 76
readTime: 10 min
primaryKeyword: google sign in supabase ios
keywords: [google sign in supabase, google sign in swiftui, supabase auth ios, google cloud oauth client ios, signInWithIdToken google, ios login tutorial]
related: [apple-sign-in-supabase-ios-tutorial, publish-ios-app-app-store-step-by-step, google-search-console-sitemap-nextjs]
subclipBlurb: Subclip records and edits screen demos, a good fit for showing the Google login flow in a short clip.
rankizzBlurb: Rankizz tracks how your app's site ranks and gets cited by AI search after you add sign-in and start promoting it.
---

Google sign-in is the other login most apps offer next to Sign in with Apple. In a native iOS app you use Google's SDK to show the account picker, get an ID token, and give that token to Supabase, which verifies it and starts a session. The setup is mostly in Google Cloud, so that is where most mistakes happen. Console labels change over time, so use this as the order of work and check the current Google and Supabase docs for exact names.

::youtube[8QGghYtaX04] Google Sign-in with Supabase: iOS Tutorial

## Quick answer

1. In Google Cloud, configure the OAuth consent screen and create an **iOS** client ID and a **Web** client ID.
2. Add the GoogleSignIn package in Xcode and set the client ID and the reversed client ID URL scheme.
3. In Supabase, enable the Google provider with the **web** client ID and secret.
4. In the app, sign in with the SDK and pass the ID token to `signInWithIdToken`.
5. Test on a device and handle sign-out.

## Step 1: Google Cloud

Create a project, set up the **OAuth consent screen** (app name, support email, your domain) and create two OAuth clients:

| Client | Used for |
| --- | --- |
| iOS | The SDK in your app, tied to your bundle ID |
| Web | The audience Supabase verifies tokens against |

Keep the consent screen honest and complete. If you request only basic sign-in scopes, verification is simple, but unverified apps show a warning screen and have user limits.

## Step 2: add the SDK and settings in Xcode

Add the GoogleSignIn-iOS Swift package. In your target's **Info** tab add a URL type whose scheme is the reversed iOS client ID, and add the iOS client ID and the web (server) client ID to the Info settings as the SDK documents.

## Step 3: Supabase provider

In **Authentication, Providers** enable **Google** and enter the web client ID and secret. Supabase needs the web client because the ID token's audience is set from it.

## Step 4: sign in and exchange the token

```swift
import GoogleSignIn
import Supabase

func signInWithGoogle(client: SupabaseClient, presenting: UIViewController) async throws {
    let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenting)
    guard let idToken = result.user.idToken?.tokenString else { return }
    let accessToken = result.user.accessToken.tokenString
    try await client.auth.signInWithIdToken(
        credentials: .init(provider: .google, idToken: idToken, accessToken: accessToken)
    )
}
```

Nonce handling differs between SDK versions. If Supabase reports a nonce problem, follow the current Supabase guide for native Google sign-in rather than disabling checks blindly.

## Step 5: sign out

Call both `GIDSignIn.sharedInstance.signOut()` and `client.auth.signOut()` so the next sign-in shows the account picker again.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| App crashes on sign-in | URL scheme missing | Add the reversed iOS client ID as a URL type |
| Supabase rejects the token | Wrong web client ID in Supabase | Use the web client ID and secret |
| Account picker never appears | Presenting controller is nil | Present from the active window scene |
| Warning screen for users | Consent screen not verified | Complete the consent screen and verification |

## Security

Keep the Google client secret in Supabase only, never in the app. The app holds the public client IDs. Do not log tokens.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. Let the agent write the Swift code, but never paste client secrets or keys into the chat.

## FAQ

### Do I need both an iOS and a Web client ID?
Yes for this flow: the iOS client powers the SDK and the web client is the audience Supabase verifies.

### Can I use Google and Apple sign-in together?
Yes, and Apple's rules often require Sign in with Apple when you offer Google. See [the Apple tutorial](/blogs/apple-sign-in-supabase-ios-tutorial).

### Does the simulator work?
Often yes for Google, but test on a real device before release.

## Next steps

Pair this with [Sign in with Apple](/blogs/apple-sign-in-supabase-ios-tutorial) and follow [the App Store publishing guide](/blogs/publish-ios-app-app-store-step-by-step). Use [Rankizz](rankizz:inline-signin-site) to watch how your app's site ranks once it is live.
