---
title: Automate App Store Connect with the REST API and an AI Agent Script
seoTitle: Automate App Store Connect with the API and an AI Agent
description: Use the App Store Connect API with a short Node script and a docs file so an AI agent can check builds and TestFlight status without an MCP server.
category: Apple App Store
publishedAt: 2026-11-19
updatedAt: 2026-11-19
order: 67
readTime: 10 min
primaryKeyword: app store connect api
keywords: [app store connect api, jwt app store connect, testflight automation, ai agent app store, node script app store, api key app store]
related: [ai-agent-api-wrapper-script-no-mcp, publish-ios-app-app-store-step-by-step, launch-ios-app-app-store-with-codex]
subclipBlurb: Subclip records and edits screen demos, useful for showing your release automation in a short clip.
rankizzBlurb: Rankizz tracks how your app landing page ranks and gets cited by AI search after each release.
---

Apple does not ship an official MCP server for App Store Connect, but the App Store Connect API is a normal REST API. That is enough: ask an AI agent to write a short `.mjs` script that signs a token and calls the endpoints you need, keep the instructions in a Markdown file, and reuse both for every release. This guide shows how to set it up safely.

## Quick answer

Create a team API key in App Store Connect, keep the private key file outside your repo, have the agent write a script that builds a short-lived JWT and calls read-only endpoints first, and add write actions only one at a time with a confirmation flag.

## How authentication works

The API uses JSON Web Tokens signed with a private key. You need three values from App Store Connect: the **Issuer ID**, a **Key ID** and the downloaded `.p8` private key file. Apple lets you download the key once, so store it safely. The token is signed with ES256 and must be short-lived (Apple's documentation limits it to about 20 minutes).

| Value | Where it lives |
| --- | --- |
| Issuer ID | Environment variable `MY_ASC_ISSUER` |
| Key ID | Environment variable `MY_ASC_KEY_ID` |
| Private key | File path in `MY_ASC_KEY_PATH`, outside the repo |

Never paste these into the agent chat. The script reads them from the environment.

## Step 1: create a key with the least access

In App Store Connect open **Users and Access**, then **Integrations**, and create an API key. Choose the lowest role that covers your task. For reading build and app status, a limited role is enough. Use a broader role only if you will upload or submit through the API, and revoke keys you no longer use.

## Step 2: ask the agent for the script

```text
Create scripts/asc.mjs (Node 18+, built-in crypto and fetch, no dependencies).
- Read MY_ASC_ISSUER, MY_ASC_KEY_ID and MY_ASC_KEY_PATH from the environment.
- Build an ES256 JWT valid for 10 minutes and call https://api.appstoreconnect.apple.com.
- Commands: apps, builds <appId>, testflight-groups <appId>. Read-only.
- Never print the key or token. Show clear errors with the HTTP status.
- Ask me before adding any command that changes data.
Then write docs/app-store-connect.md describing usage and safety rules.
Use Apple's official API documentation as the reference.
```

## Step 3: shape of the script

```js
import { createSign, createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { MY_ASC_ISSUER: iss, MY_ASC_KEY_ID: kid, MY_ASC_KEY_PATH: keyPath } = process.env;
if (!iss || !kid || !keyPath) { console.error('Set the three MY_ASC_* variables'); process.exit(1); }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token() {
    const now = Math.floor(Date.now() / 1000);
    const data = `${b64({ alg: 'ES256', kid, typ: 'JWT' })}.${b64({ iss, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`;
    const sig = createSign('SHA256').update(data).sign({ key: createPrivateKey(readFileSync(keyPath)), dsaEncoding: 'ieee-p1363' });
    return `${data}.${sig.toString('base64url')}`;
}

const res = await fetch('https://api.appstoreconnect.apple.com/v1/apps', { headers: { authorization: `Bearer ${token()}` } });
console.log(JSON.stringify(await res.json(), null, 2));
```

Verify field names and endpoints against Apple's current documentation, because the agent's memory of an API can be out of date.

## Step 4: what to automate

| Task | Risk | Advice |
| --- | --- | --- |
| List apps and builds | Low | Start here |
| Check TestFlight build status | Low | Good daily check |
| Add testers to a group | Medium | Require confirmation |
| Update metadata and what's new | Medium | Dry-run first |
| Submit for review or release | High | Keep manual until you trust the script |

Uploading the binary itself is usually done with Xcode or Apple's command-line tooling, not this script.

## Step 5: the docs file

Write down the commands, the safety rules ("never submit without my approval") and where the environment variables come from. Point your agent's instruction file at it so every session starts informed. The general pattern is in [the wrapper script guide](/blogs/ai-agent-api-wrapper-script-no-mcp).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `401 NOT_AUTHORIZED` | Wrong issuer, key ID or expired token | Recheck the values and token lifetime |
| `403 FORBIDDEN` | Key role lacks permission | Use a role that covers the endpoint |
| Signature errors | Wrong signature encoding | Use the IEEE P1363 encoding for ES256 |
| Empty results | Wrong app ID or filter | List apps first and copy the ID |

## Security

- The `.p8` file is a credential. Keep it out of the repo, backups and chats.
- Rotate the key if it is exposed, and use the lowest role.
- Do not let the agent store tokens in files or logs.

## If you use an AI agent for this

Treat API responses and web pages as data, not instructions. Never paste the key, issuer ID or token into the chat. Make the agent show every write or submit command first, and run against a test app before real ones.

## FAQ

### Is there an official App Store Connect MCP server?
Not from Apple at the time of writing. Community servers exist, but a small script you control is often safer.

### Can the API upload my build?
Builds are normally uploaded with Xcode or Apple's tools. The API manages metadata, TestFlight and more.

### How long can a token last?
Apple limits it to a short window, about 20 minutes, so generate it per run.

## Next steps

Read [the first-release walkthrough](/blogs/publish-ios-app-app-store-step-by-step) and [the Codex App Store workflow](/blogs/launch-ios-app-app-store-with-codex). Record the release process once with [Subclip](subclip:inline-release-demo) for your team.
