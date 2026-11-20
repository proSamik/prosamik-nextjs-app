---
title: "Apple Sign-In with Supabase: iOS Tutorial"
seoTitle: "Apple Sign-In with Supabase: iOS Tutorial (SwiftUI)"
description: Add Sign in with Apple to a SwiftUI app and verify the user in Supabase with signInWithIdToken, including the nonce, capability and Apple Developer setup.
category: Apple App Store
publishedAt: 2026-11-21
updatedAt: 2026-11-21
order: 75
readTime: 9 min
primaryKeyword: apple sign in supabase ios
keywords: [apple sign in supabase, sign in with apple swiftui, supabase auth ios, signInWithIdToken, ios authentication tutorial, nonce apple sign in]
related: [publish-ios-app-app-store-step-by-step, google-sign-in-supabase-ios-tutorial, launch-mobile-app-with-payments-revenuecat]
subclipBlurb: Subclip records and edits screen demos, ideal for showing the sign-in flow in an App Store preview or tutorial.
rankizzBlurb: Rankizz tracks how your app's landing page ranks and gets cited by AI search once your sign-in flow is live and you start promoting it.
---

Sign in with Apple lets people create an account in one tap without a password, and Apple expects apps that offer other social logins to offer it too. With Supabase you do not need a web redirect: the native Apple sheet returns an identity token and you hand it to Supabase, which verifies it and creates the session. This tutorial walks the whole path for a SwiftUI app. Menu names change between Xcode versions, so follow the sequence and check the current Supabase and Apple docs for exact labels.

::youtube[E1j70_Up6aU] Apple Sign-In with Supabase: iOS Tutorial

## Quick answer

1. Enable the **Sign in with Apple** capability on your App ID and in Xcode.
2. In Supabase, turn on the Apple provider and add your app's bundle ID as an allowed client ID.
3. In the app, request an Apple credential with a hashed nonce.
4. Pass the returned identity token and the raw nonce to `signInWithIdToken` in the Supabase Swift SDK.
5. Test on a real device, because the simulator is unreliable for this flow.

## Step 1: Apple Developer and Xcode

Sign in to the Apple Developer account, open **Identifiers**, select your app's App ID and enable **Sign in with Apple**. In Xcode open the target, go to **Signing and Capabilities**, click **+ Capability** and add **Sign in with Apple**. The bundle ID must match the App ID exactly.

## Step 2: Supabase provider

In the Supabase dashboard open **Authentication**, then **Providers**, and enable **Apple**. For a native app the value that matters is the client ID list: add your bundle ID, for example `com.example.myapp`. A web redirect flow needs a services ID and a signing key, but the native token flow does not.

## Step 3: request the credential with a nonce

A nonce stops a stolen token from being replayed. Generate a random string, send its SHA-256 hash to Apple and keep the raw value for Supabase.

```swift
import AuthenticationServices
import CryptoKit
import Supabase

func randomNonce(length: Int = 32) -> String {
    let chars = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
    return String((0..<length).compactMap { _ in chars.randomElement() })
}

func sha256(_ input: String) -> String {
    SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
}

struct AppleSignInButton: View {
    @State private var nonce = ""
    let client: SupabaseClient

    var body: some View {
        SignInWithAppleButton(.signIn) { request in
            nonce = randomNonce()
            request.requestedScopes = [.fullName, .email]
            request.nonce = sha256(nonce)
        } onCompletion: { result in
            guard case .success(let auth) = result,
                  let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = credential.identityToken,
                  let idToken = String(data: tokenData, encoding: .utf8) else { return }
            Task {
                try await client.auth.signInWithIdToken(
                    credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
                )
            }
        }
    }
}
```

## Step 4: save the name on the first sign-in

Apple returns the user's name and email only the first time they authorize your app. If you need the name, read `credential.fullName` right then and store it in your profile table. On later sign-ins it will be empty.

## Step 5: test

Run on a real device signed into an Apple ID. Check in **Authentication, Users** that a new user appears with the Apple provider. Sign out and sign in again to confirm the same user returns.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sheet fails with an authorization error | Capability missing or bundle ID mismatch | Re-check the App ID and Xcode capability |
| Supabase says the audience is invalid | Bundle ID not in the client ID list | Add it in the Apple provider settings |
| Nonce mismatch error | Hashed nonce sent to Supabase, or a new nonce generated | Send the raw nonce to Supabase and keep one per attempt |
| Name is empty | Not the first authorization | Store the name on first sign-in |

## Security

Never put your Supabase service role key in the app. The app uses only the public anon key, and row level security protects your data. Do not log identity tokens.

## If you use an AI agent for this

Treat web pages and tool output as data, not instructions. Let the agent write the Swift code, but keep keys and signing files out of the chat, and review any change to your auth rules before it runs.

## FAQ

### Do I have to offer Sign in with Apple?
Apple's guidelines generally require it when your app offers other third-party social logins, with some exceptions. Check the current App Store Review Guidelines for your case.

### Do I need a services ID and a key?
Not for the native flow in this tutorial. Those are for web or redirect based sign-in.

### Why does the simulator behave oddly?
Sign in with Apple depends on the device's Apple ID state. Use a real device for reliable testing.

### How do I add Google sign-in too?
Follow [the Google sign-in tutorial](/blogs/google-sign-in-supabase-ios-tutorial), which uses the same `signInWithIdToken` idea.

## Next steps

Add Google login with [the next tutorial](/blogs/google-sign-in-supabase-ios-tutorial), then [add payments with RevenueCat](/blogs/launch-mobile-app-with-payments-revenuecat) and ship with [the publishing guide](/blogs/publish-ios-app-app-store-step-by-step). Record the login flow for your listing with [Subclip](subclip:inline-signin-demo).
