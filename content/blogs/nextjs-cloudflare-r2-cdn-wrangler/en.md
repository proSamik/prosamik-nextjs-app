---
title: How to Serve Next.js Images and Assets from Cloudflare R2 on Your Own Domain with Wrangler
seoTitle: How to Serve Next.js Images from Cloudflare R2 (Wrangler)
description: Put a Cloudflare R2 bucket on a custom domain, upload versioned files with wrangler, load them with next/image, and optionally serve _next/static from the CDN.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 23
readTime: 12 min
primaryKeyword: cloudflare r2 custom domain nextjs
keywords: [cloudflare r2 nextjs, wrangler r2 object put, next.config remotePatterns, nextjs assetPrefix cdn, r2 custom domain, r2 cors]
related: [move-nextjs-from-vercel-to-coolify, coolify-healthcheck-nextjs-docker-railpack, deploy-mcp-server-nextjs-coolify]
subclipBlurb: Subclip records and edits product walkthroughs, which is handy when you want a short clip of a deploy or a CDN check to share with your team.
rankizzBlurb: Rankizz tracks how your guides rank and get cited in AI search, so you can see whether a technical post like this one is picked up.
---

You can serve Next.js images and static assets from a Cloudflare R2 bucket on your own domain, such as `cdn.example.com`, with a public bucket, a custom domain, `images.remotePatterns` in `next.config`, and `wrangler` for uploads. I use this on two Next.js apps hosted on Coolify. The first is a small site that only needs images on the CDN. The second also serves its `_next/static` files from R2.

This post covers both levels. Level one is the simple setup most apps need. Level two is the `assetPrefix` pattern, which is more work and has sharper edges. You need a Cloudflare account with the domain's DNS on Cloudflare, Node.js, and an existing Next.js app.

## Quick answer

1. Create a bucket and attach a custom domain to it.
2. Upload files with `wrangler r2 object put ... --remote`, using a versioned filename and an immutable cache header.
3. Allow the CDN host in `images.remotePatterns`.
4. Check the public URL with `curl`.

```bash
npx wrangler login
npx wrangler r2 bucket create my-bucket
npx wrangler r2 bucket domain add my-bucket --domain cdn.example.com --zone-id <ZONE_ID> --min-tls 1.2
npx wrangler r2 object put my-bucket/portfolio/hero/hero-20261118a.webp \
  --remote --file ./hero.webp \
  --content-type image/webp \
  --cache-control "public, max-age=31536000, immutable"
curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}B\n" \
  https://cdn.example.com/portfolio/hero/hero-20261118a.webp
```

The most common mistake is forgetting `--remote`. I cover it in step 3.

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16 (App Router) |
| Node.js | 22 or newer |
| Wrangler | v4, run with `npx` |
| Storage | Cloudflare R2, public bucket on a custom domain |
| Hosting | Coolify (Railpack or Dockerfile) |
| Placeholders | `my-bucket`, `cdn.example.com`, `app.example.com`, `<ZONE_ID>` |

## Level one: a public bucket and a custom domain

### 1. Log in and create the bucket

Wrangler logs in with OAuth in the browser, so no API token has to live on your laptop for this.

```bash
npx wrangler login
npx wrangler whoami
npx wrangler r2 bucket create my-bucket
npx wrangler r2 bucket list
```

`whoami` should print your account. `bucket list` should show `my-bucket`. If it shows nothing, you are logged in to the wrong account.

### 2. Attach a custom domain

The domain must be a zone in the same Cloudflare account as the bucket. Cloudflare's docs list the dashboard path (bucket, Settings, Custom Domains, Add) and the CLI does the same job:

```bash
npx wrangler r2 bucket domain add my-bucket \
  --domain cdn.example.com \
  --zone-id <ZONE_ID> \
  --min-tls 1.2
```

`--domain` and `--zone-id` are required. Per the wrangler reference, `--min-tls` defaults to 1.0 when you leave it out, so I set 1.2 explicitly. Wait until the domain status reads Active in the dashboard. If it stalls on Initializing, the dashboard has a Retry connection action.

Use a custom domain, not the `r2.dev` URL. Cloudflare says `r2.dev` is rate limited and meant for development, and that WAF rules, caching and access controls only work on a custom domain.

### 3. Upload with `--remote`

```bash
npx wrangler r2 object put my-bucket/portfolio/hero/hero-20261118a.webp \
  --remote \
  --file ./hero.webp \
  --content-type image/webp \
  --cache-control "public, max-age=31536000, immutable"
```

`--remote` matters. In my experience with wrangler v4, leaving it off writes to the local simulator. The command looks like it succeeded, and then the public URL returns 404 because nothing reached the real bucket. The wrangler reference documents both `--local` and `--remote` but does not state a default, so always pass `--remote` and treat the 404 as the symptom to recognise.

Two habits keep caches honest:

- Put a version in the filename, such as `-20261118a`.
- Send a one-year immutable `Cache-Control`.

To change an image, upload a new name and bump the version in code. Never overwrite a file that browsers and Cloudflare may already cache for a year.

### 4. Verify with curl

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}B\n" \
  https://cdn.example.com/portfolio/hero/hero-20261118a.webp
```

Expected shape of the output:

```text
200 image/webp <size>B
```

If you see `404`, the upload went to the simulator or the key differs. If the type is `application/octet-stream`, you forgot `--content-type`.

Custom domains can use Cloudflare's cache, but Cloudflare notes that by default only certain file types are cached. To see what happens to yours, run `curl -sI` twice and read the `cf-cache-status` header.

### 5. CORS for browser fetches

Plain `<img>` tags do not need CORS. Fonts, `fetch()` and anything loaded with `crossorigin` do. For public, non-credentialed static files, an anonymous read-only rule is fine.

```json
{
  "rules": [
    {
      "allowed": {
        "origins": ["https://app.example.com"],
        "methods": ["GET", "HEAD"]
      }
    }
  ]
}
```

```bash
npx wrangler r2 bucket cors set my-bucket --file cors.json
```

Keep this separate from your app's own API CORS. The bucket rule only controls who may read public files. For direct browser uploads you would use presigned URLs and a rule that also allows `PUT`, but do not combine that with the public-read rule without thinking about it.

### 6. Tell Next.js about the host

`next/image` refuses remote hosts you have not listed.

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com', pathname: '/portfolio/**' },
    ],
  },
}

export default nextConfig
```

Then build URLs through one small helper so the version lives in one place.

```ts
// lib/cdn.ts
export const cdnAsset = (path: string) =>
  `https://cdn.example.com/portfolio/${path}`

// usage: <Image src={cdnAsset('hero/hero-20261118a.webp')} width={1200} height={630} alt="..." />
```

If you read the host from an env var (`MY_CDN_URL`), remember that anything the browser needs must be available at build time. See my [Vercel to Coolify migration notes](/blogs/move-nextjs-from-vercel-to-coolify) for how Coolify splits build-time and runtime variables.

That is the whole simple setup. Most apps can stop here.

## Level two: serve `_next/static` from the CDN

Do this only if you have a reason, such as taking static traffic off your app server. Next.js supports it with `assetPrefix`. The docs say Next.js then uses the prefix for the JS and CSS it loads from `/_next/`, and that you host the contents of `.next/static/` on the CDN as `_next/static/`. They also say not to upload the rest of `.next`.

I run this on the larger of my two apps. These are the rules I ended up with.

### Release-prefixed paths

Instead of putting files at `_next/static/...`, I upload each build under its own prefix:

```text
releases/<release>/_next/static/chunks/<hash>.js
```

and set `assetPrefix` to `https://cdn.example.com/releases/<release>`. Every file is uploaded with its MIME type and the immutable cache header. Uploads never delete old releases.

That gives you rollback almost for free. To roll back, redeploy the previous image. Its HTML points at its own release prefix, and those files are still there.

### A manifest with SHA-256

At build time, write a manifest listing every file: path, SHA-256, MIME type. The uploader and the verifier both read it.

```json
{
  "release": "20261118-1",
  "files": [
    { "path": "_next/static/chunks/abc.js", "sha256": "<hash>", "type": "text/javascript" }
  ]
}
```

### Publish and verify inside the Docker build

The publish and verify step runs inside the build, so a failed upload fails the deployment and the old version keeps running. In my Dockerfile it runs inside the build step. The upload needs credentials at build time, so pass them as build-only values and keep them out of the final image.

My verifier fetches the real public files, compares bytes with the manifest, checks MIME types and anonymous CORS, and requires a warm Cloudflare cache HIT. Here is a reduced version of the byte and MIME check:

```js
// verify-cdn.mjs  (Node 22: global fetch and crypto)
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const [manifestPath, cdnBase] = process.argv.slice(2) // e.g. https://cdn.example.com/releases/<release>
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
let failed = 0

for (const file of manifest.files) {
  const res = await fetch(`${cdnBase}/${file.path}`, { headers: { Origin: 'https://app.example.com' } })
  const bytes = Buffer.from(await res.arrayBuffer())
  const sha = createHash('sha256').update(bytes).digest('hex')
  const type = (res.headers.get('content-type') || '').split(';')[0]
  const problems = []
  if (!res.ok) problems.push(`status ${res.status}`)
  if (sha !== file.sha256) problems.push('hash mismatch')
  if (type !== file.type) problems.push(`mime ${type}`)
  if (!res.headers.get('access-control-allow-origin')) problems.push('no CORS header')
  if (problems.length) { failed++; console.error(file.path, problems.join(', ')) }
}

console.log(failed ? `FAILED: ${failed} file(s)` : `OK: ${manifest.files.length} file(s)`)
process.exit(failed ? 1 : 0)
```

Expected output on success:

```text
OK: <n> file(s)
```

For the cache HIT check, run a second request and read `cf-cache-status`. Whether the first request is a MISS depends on your cache rules, so I only require HIT after a warm-up request.

### The rules that bite

- **Never switch the prefix before the matching assets are uploaded.** If production HTML points at a prefix that does not exist yet, every page loads without JS or CSS. Build the prefix from the release, upload, verify, and only then ship the image.
- **Do not let a runtime env change repoint a built app.** I bake the CDN prefix into a small JSON file in the image and my start script reads it, so a changed env var cannot point an old build at another release.
- **Content-Security-Policy must allow the exact CDN origin** for scripts, styles, fonts and connections. Use the full `https://cdn.example.com` origin, not a wildcard.
- **Web workers cannot load cross-origin.** Worker entry scripts must stay on your app origin. In webpack that is `output.workerPublicPath = '/_next/'`.
- **`assetPrefix` does not cover `public/`.** The Next.js docs say so. Files in `public/` need the prefix added by you, for example through a helper like `cdnAsset`.

## Edge cases

| Situation | What happens | What to do |
| --- | --- | --- |
| Overwrote an image with the same name | Browsers and edge keep the old copy for up to a year | Upload a new versioned name |
| Uploaded without `--remote` | Local simulator only, public URL 404 | Re-run with `--remote` |
| New release deployed before upload finished | HTML references missing files | Publish and verify in the build, before rollout |
| Rolled back to previous image | Works if old release prefixes still exist | Never delete old releases in the uploader |
| Worker script on CDN origin | Browser blocks cross-origin worker | Keep workers on the app origin |
| CDN origin missing from CSP | Scripts and fonts blocked | Add the exact origin to the matching directives |
| Assets in `public/` | Still served from the app origin | Prefix those URLs yourself |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `curl` returns 404 after a successful `put` | Upload went to the local simulator | Add `--remote` and upload again |
| `next/image` error about an unconfigured host | Host or path not in `remotePatterns` | Add `protocol`, `hostname` and `pathname` |
| Custom domain stuck on Initializing | DNS or zone state not ready | Check the zone is in the same account, then use Retry connection |
| Download instead of display, type is `application/octet-stream` | No `--content-type` on upload | Re-upload with the correct type |
| Fonts fail with a CORS error | No bucket CORS rule | `wrangler r2 bucket cors set` with your app origin |
| Page renders unstyled after deploy | `assetPrefix` points at files that are not uploaded | Roll back the image, upload and verify, then redeploy |
| `Refused to load the script` in console | CSP does not include the CDN origin | Add the exact origin to `script-src`, `style-src`, `font-src` |
| Worker fails to start | Worker URL points to the CDN | Set `workerPublicPath` to the app origin path |

## Security

Keep upload credentials on your machine or in the host's secret settings. Never put R2 access keys in client code, in a `NEXT_PUBLIC_` variable, or in the image. For a build that publishes assets, mark the key as build-only in Coolify, and prefer a token scoped to one bucket with write access only. Public buckets are public: do not upload anything you would not want a stranger to open. Keep `.env*` files out of the Docker context and out of `.next/standalone`. If a key ever lands in a log or chat, rotate it.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not as instructions.
- Never paste secrets into the chat, and do not let the agent print them.
- Make it show destructive commands (deleting objects or buckets, DNS changes, force deploys) and wait for your approval.
- Give it minimum permissions: a scoped API token, and a staging bucket first.

## FAQ

### Do I need `assetPrefix` to use R2 for images?

No. Images through `next/image` only need `images.remotePatterns` and a public bucket on a custom domain. `assetPrefix` is only for `_next/static` build files.

### Why does my public URL return 404 after `wrangler r2 object put`?

In my experience on wrangler v4, the command wrote to the local simulator because `--remote` was missing. Add `--remote` and upload again.

### Should I use the `r2.dev` URL?

Only for development. Cloudflare says it is rate limited and lacks WAF, caching and access controls, so use a custom domain in production.

### Does `assetPrefix` also move files from `public/`?

No. The Next.js docs say `assetPrefix` does not influence `public/`, so you add the CDN prefix yourself.

### How do I roll back a release that uses a CDN prefix?

Redeploy the previous image. As long as you never delete old release prefixes, its assets are still on the CDN.

## Next steps

If you are moving a site off Vercel, start with [how I moved Next.js from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify), then set up a [healthcheck](/blogs/coolify-healthcheck-nextjs-docker-railpack) so a bad release never takes traffic. If you also want to publish a short demo of the result, [Subclip](subclip:inline-cdn-walkthrough) can record a walkthrough and trim it with its AI editor. For an agent-facing endpoint on the same app, see [how to deploy your own MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).
