# Private accountability deployment checklist

This feature is source-only until the owner configures a private deployment.
Do not add real values to the repository or PR. Copy the placeholder names from
`.env.example` into the deployment's secret store and keep them server-side.

## Required private configuration

- Set `AUTH_ADMIN_EMAIL` to the exact Google account that should own the admin
  area. An empty value intentionally fails closed; sign-in and all private
  routes remain unavailable until it is configured.
- Set `BETTER_AUTH_URL` to the canonical HTTPS application origin and configure
  `BETTER_AUTH_SECRET` with a fresh high-entropy secret. Keep the existing
  Google OAuth client ID and secret in the deployment secret store.
- Set `DATABASE_URL` to the intended PostgreSQL database. Review the target
  without printing credentials before running the migration command.
- Set `SECURE_BUCKET` to the private `prosamik-secure-bucket` bucket and ensure
  it is distinct from `R2_BUCKET_NAME`. Verify that bucket access is private,
  credentials are limited to the required objects, and browser upload CORS
  permits only the deployed application origin and signed PUT headers.
- Keep the existing R2 endpoint/access credentials server-only. The app fails
  closed when private R2 configuration is missing or points at the public
  Random Thoughts bucket.
- Leave `MCP_RESOURCE_URL` blank to derive the canonical
  `https://<application-origin>/api/mcp`, or set that exact HTTPS endpoint.
  The reverse proxy must preserve the client-facing host/scheme and overwrite
  the header configured by `MCP_TRUSTED_CLIENT_IP_HEADER` (Cloudflare defaults
  to `cf-connecting-ip`). Do not trust a caller-controlled forwarded header.
- Keep `ACCOUNTABILITY_REMINDER_DELIVERY_ENABLED=false`. No supported provider,
  scheduler, or proactive ChatGPT delivery connection is configured by this
  code. State tools do not send notifications.

## Safe rollout order

1. Configure a disposable staging environment with a staging PostgreSQL
   database, private R2 bucket, canonical HTTPS URL, and the owner allowlist.
2. Verify R2 privacy and CORS, OAuth/JWKS discovery, `/api/mcp` host/origin
   handling, one-time API-key display/revocation, private no-store responses,
   and owner isolation using test data only.
3. Run `npm run migrate:db` only after confirming the staging `DATABASE_URL`.
   The build no longer runs migrations. The migration command runs the
   Better Auth plugin schema migration and versioned SQL changes.
4. Run the authenticated end-to-end checks against staging, including upload,
   finalized private media, review-only derivative preparation, stale summary
   approval rejection, API-key revocation, and reminder claim/result state.
5. Only after staging review, plan a separate production migration/deployment
   step and verify the production database, R2 bucket, OAuth metadata, and
   deployment environment before changing production state.

No live credentials, API keys, OAuth grants, personal records, media uploads,
production migrations, or deployment actions are included in this change.
