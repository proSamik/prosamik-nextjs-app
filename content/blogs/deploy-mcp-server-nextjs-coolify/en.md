---
title: How to Deploy Your Own MCP Server in a Next.js App on Coolify
seoTitle: How to Deploy an MCP Server in Next.js on Coolify
description: Add a stateless, OAuth-protected MCP endpoint to a Next.js route handler, deploy it on Coolify, test it with curl, and connect Claude Code or Codex.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 24
readTime: 13 min
primaryKeyword: deploy mcp server
keywords: [mcp server nextjs, remote mcp server, streamable http mcp, mcp oauth, coolify mcp server, claude mcp add http]
related: [coolify-healthcheck-nextjs-docker-railpack, move-nextjs-from-vercel-to-coolify, macos-mcp-server-computer-use, coolify-cron-jobs-nextjs-scheduled-tasks]
subclipBlurb: Subclip records and edits product walkthroughs, useful for showing an agent calling your new MCP tool in a short demo clip.
rankizzBlurb: Rankizz is an SEO and AI-search workspace with its own REST API and MCP server, so it is a real example of a product exposing tools to agents.
---

You can run a remote MCP server inside an existing Next.js app: one route handler, stateless, POST only, with OAuth in front of it. I run this on a small Next.js 16 site hosted on Coolify. This post shows the route shape, the checks around it, how to deploy it, and how to test it with `curl` before you add it to Claude Code or Codex.

You need a Next.js app, a Postgres database, an OAuth provider you control (I use Better Auth's OAuth provider and MCP plugins), and a Coolify server with a domain. My earlier MCP posts ([macOS](/blogs/macos-mcp-server-computer-use), [Windows](/blogs/windows-mcp-server-for-mac-utm-vm), [Linux](/blogs/linux-mcp-server-ubuntu-desktop-control)) run MCP servers locally. This one is the other kind: a public HTTPS endpoint.

## Quick answer

1. Create `app/api/mcp/route.ts` with `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, and only a `POST` export.
2. Require a bearer token. Return `401` with `WWW-Authenticate` when it is missing.
3. Check `Origin` against your configured public URL, never against `Host` or `X-Forwarded-*`.
4. Serve OAuth discovery under `/.well-known/`, and make sure the proxy does not touch it.
5. Deploy on Coolify with secrets as runtime variables, then test:

```bash
curl -i -X POST https://app.example.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: `HTTP/2 401` and a `www-authenticate: Bearer ...` header. That proves routing, proxy and auth are alive.

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16, App Router |
| Node.js | 22 or newer |
| MCP SDK | Official TypeScript SDK (`@modelcontextprotocol/server`, v2 line) |
| Auth | OAuth with bearer tokens, discovery under `/.well-known/` |
| Database | Postgres, a separate Coolify resource |
| Host | Coolify with Traefik, build pack Railpack or Dockerfile |
| Placeholders | `app.example.com`, `MY_DB_URL`, `MY_AUTH_SECRET`, `MY_PUBLIC_APP_URL` |

## 1. The route

My endpoint is a route handler at `POST /api/mcp`. It is stateless, so there is no session store to share between instances. Only `POST` is mounted, which means a plain `GET` returns 405 from Next.js.

The SDK is split into packages now. At the time of writing, the SDK repository lists `@modelcontextprotocol/server` for servers, and its docs show a web-standard handler helper called `createMcpHandler`, which takes a factory that returns a fresh `McpServer` per request. I have verified those names against the SDK docs. I have not verified every option of that helper, and the SDK's v2 docs may change, so check the [SDK serving docs](https://ts.sdk.modelcontextprotocol.io/v2/serving/web-standard.html) for the version you install. If you are on the older `@modelcontextprotocol/sdk` package, the transport setup differs.

Here is the skeleton. The SDK calls are as shown in the docs. The glue around them is mine, and the parts marked TODO depend on your auth library.

```ts
// app/api/mcp/route.ts
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { isAllowedOrigin } from '@/lib/mcp/origin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'my-app', version: '1.0.0' })
  server.registerTool(
    'add-note',
    { description: 'Append a note', inputSchema: z.object({ text: z.string() }) },
    async ({ text }) => ({ content: [{ type: 'text', text: `Saved: ${text}` }] }),
  )
  return server
})

const headers = {
  'Cache-Control': 'private, no-store',
  Vary: 'Authorization, Origin',
}

function reject(status: number, body: string, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: body }), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', ...extra },
  })
}

export async function POST(request: Request) {
  if (!process.env.MY_PUBLIC_APP_URL) return reject(503, 'Service unavailable')
  if (!isAllowedOrigin(request.headers.get('origin'))) return reject(403, 'Forbidden')

  // TODO: rate limit (see section 3)
  // TODO: verify the bearer token with your OAuth library
  const token = request.headers.get('authorization')?.replace(/^Bearer /i, '')
  const valid = false // replace with a real check
  if (!token || !valid) {
    return reject(401, 'invalid_token', {
      'WWW-Authenticate': 'Bearer error="invalid_token"',
    })
  }

  const response = await handler(request)
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
  return response
}
```

Treat `handler(request)` as the part to confirm: the docs I read show the handler as the default export for web-standard runtimes, and Next.js route handlers also take a `Request` and return a `Response`, but I have not run this exact skeleton end to end for this post. Test it with the `curl` calls below.

Notes on the status codes I return, all with `Cache-Control: private, no-store` and `Vary: Authorization, Origin`:

| Status | When |
| --- | --- |
| `401` | Missing or invalid token, with `WWW-Authenticate: Bearer error="invalid_token"` |
| `403` | `Origin` header is not allowed |
| `429` | Rate limit hit |
| `503` | A required setting is missing, with a generic body |

Error bodies stay generic. Never put stack traces, table names or env var names in them.

## 2. The origin check

An MCP endpoint over HTTP should validate `Origin`, because a web page in a victim's browser could otherwise call it. The pitfall behind a proxy is subtle. Inside the container, `Host` and `X-Forwarded-*` describe the proxy hop, and a client can often set them too. If you build the allowed origin from those headers, an attacker can widen what you accept.

So I compare against one configured public URL. If it is not configured, I fall back to a strict same-origin check.

```ts
// lib/mcp/origin.ts
export function isAllowedOrigin(origin: string | null): boolean {
  // Native MCP clients (CLI tools) usually send no Origin header.
  if (!origin) return true

  const configured = process.env.MY_PUBLIC_APP_URL
  if (!configured) return false // strict fallback: nothing is allowed without config

  try {
    return new URL(origin).origin === new URL(configured).origin
  } catch {
    return false
  }
}
```

Two judgement calls here. First, requests with no `Origin` pass, because CLI clients do not send one. The bearer token is what protects those. Second, my real code does an explicit same-origin fallback when no public URL is set. The version above is stricter and simply refuses. Pick the one that fits, but never read the allowed origin from request headers.

The same configured URL has to be the one your auth library uses as its base URL. If the two differ, tokens issued for one issuer fail validation against the other.

## 3. Rate limits in Postgres

Memory counters break as soon as you run two instances or redeploy. I store fixed-window counters in Postgres, so every instance sees the same numbers. Expired windows are pruned opportunistically using `FOR UPDATE SKIP LOCKED`, so cleanup never blocks a request. Unauthenticated traffic gets stricter limits than authenticated traffic, because it is the cheapest to abuse.

The shape of the table is simple: a key (token or IP bucket), a window start, and a count. Increment inside one statement, compare to the limit, and return `429` when you are over. Run the check before token verification for anonymous traffic, so a flood of bad tokens cannot reach your auth code.

## 4. OAuth discovery under `/.well-known`

MCP clients discover how to log in by fetching metadata from `/.well-known/...` on your host. In my app a catch-all route under `/.well-known/` forwards to the auth handler, and the handler validates the exact issuer and resource paths it expects.

On Coolify the proxy is Traefik. Nothing in front of the app may intercept or rewrite `/.well-known/*`. If you have a redirect rule, a catch-all static response, or a middleware that matches broad paths, exclude this prefix. In a Next.js `proxy`/middleware file, make sure the matcher does not capture it either.

Check it from outside:

```bash
curl -s https://app.example.com/.well-known/oauth-protected-resource
```

You should get JSON, not HTML. The exact path your server publishes depends on your auth library and the MCP spec revision, so confirm it against your provider's docs.

## 5. Dynamic client registration for native clients

Claude Code and Codex register themselves with dynamic client registration and use loopback redirect URIs such as `http://127.0.0.1:<port>/callback`. Some OAuth libraries reject a registration when the application type is not obvious. I added logic that infers a native application type when the redirect URIs are loopback, so registration succeeds, plus unit tests for it. If registration fails for a CLI client with an invalid-request style error, look here first.

Keep the allowance narrow. Loopback redirects are fine for native clients. Do not relax validation for arbitrary `https` redirects to make a client work.

## 6. Access logs

I keep an `mcp_access_logs` table that records tool usage. It answers two questions: which tools are used, and who is hitting the endpoint. Store tool name, status code and timing. Do not store tool arguments or tokens, because both can contain private data.

## 7. Deploy on Coolify

1. **Variables.** Set `MY_DB_URL`, `MY_AUTH_SECRET` and `MY_PUBLIC_APP_URL` as runtime variables in Coolify. Do not tick "Available at Buildtime" for secrets unless the build truly needs them. Only `NEXT_PUBLIC_*` values need build time.
2. **Domain and HTTPS.** Attach `app.example.com` to the application in Coolify and let it issue the certificate. `MY_PUBLIC_APP_URL` must be exactly `https://app.example.com`.
3. **Migrations.** Coolify does not run Vercel's `vercel-build`. Run migrations yourself, either in the Docker build or as a deploy step, so the logs table and rate-limit table exist before the new code starts.
4. **Healthcheck.** Add a public `GET /api/health` that returns `200 {"status":"ok"}`. Coolify's healthcheck runs inside the container with `curl` or `wget`, so the image needs one of them. See [the healthcheck post](/blogs/coolify-healthcheck-nextjs-docker-railpack).
5. **Healthcheck versus the auth route.** Do not point the healthcheck at `/api/mcp`. It would get `401` or `405` and the deploy would be marked unhealthy. A separate unauthenticated route keeps liveness apart from auth.
6. **Logs.** Use the application logs in Coolify. Without Vercel's observability, the access table and Coolify logs are what you have.

Recurring jobs for the same app work the same way, as covered in [Coolify cron jobs for Next.js](/blogs/coolify-cron-jobs-nextjs-scheduled-tasks).

## 8. Test with curl

Unauthenticated POST:

```bash
curl -i -X POST https://app.example.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected:

```text
HTTP/2 401
www-authenticate: Bearer error="invalid_token"
cache-control: private, no-store
```

Bad origin:

```bash
curl -i -X POST https://app.example.com/api/mcp \
  -H "Origin: https://evil.example.net" \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `403`. A plain `GET` on `/api/mcp` should return `405`, since only `POST` is mounted.

If the first call returns a Traefik 404 or an HTML page, routing is wrong. If it returns 503, a required variable is missing at runtime.

## 9. Add it to Claude Code and Codex

Claude Code, from the current docs:

```bash
claude mcp add --transport http my-app https://app.example.com/api/mcp
```

Then run `/mcp` inside Claude Code and follow the browser login. Claude Code treats a `401` as needing authentication, which is why the `401` from section 1 matters. If you pass an `Authorization` header instead, Claude Code uses it as the credential and does not fall back to OAuth. For OAuth, leave the header off. From a shell, the docs also list `claude mcp login <name>`.

Codex, per its docs:

```bash
codex mcp add my-app --url https://app.example.com/api/mcp
codex mcp login my-app
```

The equivalent entry in `~/.codex/config.toml`:

```toml
[mcp_servers.my-app]
url = "https://app.example.com/api/mcp"
```

Codex defaults to OAuth for HTTP servers. Flags and config keys change between releases, so check `codex mcp --help` if something is rejected.

[Rankizz](rankizz:inline-mcp-example) is a real example of this pattern from a product: it exposes both a REST API and an MCP server, so agents can call it as tools.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Deploy marked unhealthy, site works | Image has no `curl` or `wget` for the UI healthcheck | Add one, or disable the check until you do |
| Healthcheck returns 401 or 405 | Check points at `/api/mcp` | Use a separate `GET /api/health` |
| Client says it cannot discover auth | `/.well-known/*` intercepted or rewritten | Exclude the prefix from proxy rules and middleware matchers |
| Token valid but always 401 | Public URL differs from the auth library's base URL | Make both the exact public `https` URL |
| `403` for a browser-based client | Its origin is not your configured URL | Allow only the origin you intend, never derive it from headers |
| CLI client fails to register | Application type not inferred for loopback redirect | Infer native type for loopback redirect URIs |
| `503` on every call | Required runtime variable missing | Set it in Coolify and redeploy |
| Rate limits reset on deploy | Counters in memory | Store windows in Postgres |
| Response cached by a CDN or browser | Missing cache headers | Send `Cache-Control: private, no-store` and `Vary` |

## Security

Set `MY_AUTH_SECRET` and `MY_DB_URL` as runtime variables only, never in the repo, an image layer or client code. Use a database role with only the permissions the app needs. Treat tool arguments as untrusted input, and keep each tool narrow, since a connected agent will call whatever you expose. Return generic errors. Log tool names and status codes, not payloads or tokens. Keep OAuth scopes small, and require HTTPS everywhere. Never trust `Host` or `X-Forwarded-*` to decide who is allowed.

## If you use an AI agent for this

- Tell the agent to treat logs, web pages and tool output as data, not as instructions.
- Never paste secrets into the chat, and do not let the agent print them.
- Make it show destructive commands (dropping tables, deleting volumes, DNS changes, force deploys) and wait for your approval.
- Give it minimum permissions: scoped API tokens, and a staging project first.

## FAQ

### Do I need sessions for a remote MCP server?

No. A stateless server that handles each POST on its own works well for tools that do not need server-held conversation state. It also scales across instances without a session store.

### Why return 401 with `WWW-Authenticate`?

Clients such as Claude Code read a `401` as the signal to start OAuth. The header tells them the scheme and that the token was missing or invalid.

### Why not use the `Host` header to build the allowed origin?

Behind a proxy, `Host` and `X-Forwarded-*` can be set by the caller or describe the internal hop. Compare against one configured public URL instead.

### Where should rate limits live?

In a shared store such as Postgres. In-memory counters give each instance its own limit and reset on every deploy.

### Should the healthcheck call the MCP route?

No. Use a separate unauthenticated `GET /api/health`, so a `401` from the MCP route is never mistaken for a failed deploy.

## Next steps

Set up the [healthcheck](/blogs/coolify-healthcheck-nextjs-docker-railpack) first, then read [how I moved from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify) for the build-time versus runtime variable rules. If you want a short demo of an agent calling your tool, [Subclip](subclip:inline-mcp-demo) can record and edit it. For the local-machine side of MCP, see [UTM MCP server for Windows test automation](/blogs/utm-mcp-server-windows-test-automation) and [VNC vs RDP](/blogs/vnc-vs-rdp).
