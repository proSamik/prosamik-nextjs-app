# Accountability MCP endpoint

The OAuth-protected remote endpoint is `POST /api/mcp`. It uses the installed
Better Auth MCP integration and MCP TypeScript SDK directly; it does not mount
the OAuth provider a second time.

## Request boundary

- `requireMcpAuth(auth, handler, { resource })` verifies the OAuth access-token
  signature through Better Auth's JWKS and checks issuer, audience and expiry.
- Application code then binds the verified token subject (`sub`) as the owner,
  requires the OAuth `client_id`, and rechecks issuer, exact resource audience
  and expiry before any accountability service is called. Owner IDs are never
  accepted as tool arguments.
- The endpoint accepts only POST requests. The route is stateless and uses the
  installed SDK's `createMcpHandler` with `legacy: 'reject'`, a 64 KiB request
  limit, and no subscriptions. It uses the SDK's own modern Streamable HTTP
  request parser and tool argument validation.
- The configured canonical resource is `MCP_RESOURCE_URL`, or `/api/mcp` under
  Better Auth's resolved base URL. It must be an HTTPS URL without credentials,
  query or fragment; HTTP is accepted for loopback development only.
- Before authentication, request `Host` and URL origin/path must match that
  canonical resource. If an `Origin` header is present, it must match the
  resource origin exactly; native clients may omit it. Do not rewrite host or
  scheme headers at the proxy unless the client-facing canonical URL remains
  the same as `MCP_RESOURCE_URL`.
- A durable pre-auth limiter runs before JWT/JWKS and personal-key validation:
  120 requests/minute for the trusted client-IP digest plus a 10,000/minute
  host-wide bucket. If no valid client IP is supplied, a host-scoped fallback
  is limited to 3,000/minute. Only a keyed digest is stored; raw IP/header
  values are not persisted. `MCP_TRUSTED_CLIENT_IP_HEADER` defaults to
  `cf-connecting-ip`; set `x-real-ip` or `x-forwarded-for` only if a trusted
  proxy overwrites it. Authenticated owner/client/key limits still run after
  token validation.
- Expired pre-auth and authenticated rate-limit rows are pruned opportunistically
  in indexed batches of at most 250 rows per table, no more often than every
  128 process-local limiter calls; active windows are retained.
- Authenticated requests use the existing shared PostgreSQL rate-limit window:
  120 MCP HTTP requests per OAuth client and owner per 60 seconds. If rate-limit
  storage is unavailable, the endpoint fails closed.
- Responses are private, non-cacheable and marked `noindex`. Tool failures do
  not return SQL, internal exceptions, credentials or owner identifiers.

## Current tool-to-scope map

- `get_progress`, `get_weight_entries`: `progress:read`
- `record_progress`, `record_weight_entry`, `correct_weight_entry`:
  `progress:write`
- `get_check_ins`: `check-ins:read`
- `list_due_check_in_reminders`: `check-ins:read`
- `answer_check_in`, `claim_check_in_reminder`,
  `preflight_check_in_reminder_delivery`, `record_check_in_reminder_delivery`:
  `check-ins:write`
- `list_private_media`, `get_private_media_read_url`: `media:read`
- `initiate_private_media_upload`, `finalize_private_media_upload`:
  `media:write`
- `get_summary_status`, `create_summary_draft`, `edit_summary_draft`,
  `approve_summary_revision`: `summaries:write`
- `publish_approved_summary`: `summaries:publish`
- `list_summary_media_sources`: `media:read`
- `prepare_summary_media_derivative`: `media:write`
- `get_public_random_thoughts_page`: `content:read`

Date-based reads are bounded (365 days for progress, 366 days for weight and
private media, 90 days for check-ins). Media listing returns at most 100
metadata-only rows per keyset page; the stable cursor contains no owner
identifier, storage key, or URL. A signed read URL remains a separate
owner-scoped tool. Writes reject future dates and use explicit idempotency
keys. Image-derived weight entries may reference up to five owner-owned still
images only when the principal also has `media:read`; they are always created as
pending and cannot be primary until owner confirmation. MCP does not perform
OCR or infer weight from appearance; the transcribed value remains the caller's
explicit input. Private media tools return existing short-lived presigned URLs;
clients should treat those URLs as temporary bearer capabilities and never log
or share them.

The due-reminder tool lists only today's owner-scoped due slots; the existing
service may initialize today's check-in projection while reading. Claim,
preflight and result tools only manage owner-scoped reminder state. Claims fail
closed unless `ACCOUNTABILITY_REMINDER_DELIVERY_ENABLED=true`; preflight returns
`canDeliver: false` while disabled. A sent result requires a bounded provider
delivery ID, and failed requires a bounded error code. The MCP endpoint contains
no notification provider call and never sends a notification. The checked-in
environment example keeps delivery disabled, and this checkout has no proactive
reminder scheduler or delivery provider configured; enabling claims alone does
not add or configure a sender.

`content:read` exposes a bounded page of already-public Random Thoughts only;
it does not expose private accountability drafts, internal admin content, or
raw database records. Summary status returns only the newest 50 records per
category, and publishing requires a previously approved immutable summary
snapshot plus the separate `summaries:publish` scope; stale approval snapshots
are rejected and require a fresh review. Media upload tools only
initiate/finalize the existing private R2 flow; the MCP endpoint does not proxy
file bytes or expose storage credentials.

## Personal API keys

The endpoint also accepts the existing personal API-key format as a bearer
credential: `psamik_<keyId>.<secret>`. Only that exact prefixed form uses the
API-key path. Other bearer values, including JWTs, continue through
`requireMcpAuth` and must pass OAuth JWT verification. The API-key verifier
looks up the selector, hashes the complete presented key with SHA-256, compares
the 32-byte hash in constant time, checks revocation/expiry, loads only
owner-bound scope rows, and updates `last_used_at`. The raw key is never stored,
logged, returned or forwarded into the MCP SDK context. API-key traffic is rate
limited by the key's database record ID.

## Installed SDK evidence

This integration follows the installed package contracts, not a hand-written
MCP wire parser:

- `@better-auth/mcp` 1.7.7 documents `mcp()` as the OAuth provider and
  `requireMcpAuth()` as the verifier for resource-server routes. Its local
  README explicitly recommends the MCP SDK handler with `legacy: 'reject'`
  and POST-only HTTP mounting.
- `@modelcontextprotocol/server` 2.3.1 exports `createMcpHandler`,
  `requireScopes`, `McpServer`, and Zod-based `registerTool` input schemas. Its
  handler docs state that transport does not verify tokens itself, so this
  endpoint supplies only the `AuthInfo` constructed after Better Auth
  verification.

Official references: [Better Auth MCP plugin](https://www.better-auth.com/docs/plugins/mcp),
[MCP TypeScript SDK HTTP serving](https://ts.sdk.modelcontextprotocol.io/v2/serving/http),
and [MCP TypeScript SDK tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools).
