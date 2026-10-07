# Database migrations

Run migrations explicitly with `npm run migrate:db`; the build no longer runs them as a `prebuild` hook. Before the command, verify that `.env`'s `DATABASE_URL` targets the intended database without printing its credentials. Set `BETTER_AUTH_SECRET` (or `AUTH_SECRET`) as required. This command can update the Better Auth schema and application tables, so use it during an intentional deployment or maintenance step. It does not send reminders.

The runner reads only four-digit versioned `.sql` files in this directory, sorts them by version, takes a PostgreSQL advisory lock, and applies each SQL file and its checksum record in a single transaction. `app_schema_migrations` records applied versions and SHA-256 checksums. An already-applied file is skipped; a changed checksum stops the run. Add a new numbered migration rather than editing an applied one. The runner includes Better Auth's migration step with the same JWT/MCP/CIMD schema plugins used by the app, then applies `0001_random_thoughts.sql` (the former inline migration) and subsequent app migrations.

## Accountability schema (`0002_accountability.sql`)

All accountability tables reference Better Auth's `"user"(id)` through `owner_id` with user deletion cascades. Relationships between accountability tables carry `owner_id` in their composite foreign keys, preventing cross-owner links. Application code must still authorize each request and filter queries by the authenticated owner; this schema does not enable row-level security.

- `accountability_habit_days` is the one-per-owner/habit/date projection. `accountability_habit_events` holds append-only status/detail history, including activity, duration, outreach count/channel, email drafted/sent counts, video stage, and private notes. Events reference owner-scoped SHA-256 idempotency rows. Do not purge an event-linked idempotency row unless the matching event history is also being removed. No raw idempotency key or response body is stored; `result_resource_id` is only a resource UUID and must be resolved with an owner-filtered query. Evidence joins (`accountability_habit_day_evidence`, `accountability_habit_event_evidence`) bind private media IDs to a day/event.
- No-fap status is one row per owner/date. `accountability_check_ins` stores dated slots and pending/answered/missed state, response text/time, and reminder state/IDs. `accountability_reminder_deliveries` uses an owner/slot/date unique row, hashed delivery key, claimed lease, provider delivery ID, and outcome state for cross-instance idempotency. `ACCOUNTABILITY_REMINDER_DELIVERY_ENABLED=false` keeps live delivery disabled until an adapter is configured and tested. Use disabled reminder configurations rather than hard-deleting them; hard deletion cascades dependent slot/delivery rows.
- Weight rows preserve the entered value and unit; PostgreSQL derives `weight_kg`. Image-source entries should be created `pending` and only become `confirmed` after explicit review. Only confirmed entries can be primary, with at most one per owner/date. `accountability_weight_entry_evidence` supports private source-image/supporting-asset links; the service must only associate ready assets.
- Media metadata includes local date, category, optional body-photo pose/private notes, private object key, content type, size, checksum, and pending/ready/failed/deleted status. It stores no public URL. A media association should be created only for a ready asset.
- `accountability_summary_draft_groups` allows one logical draft per owner/activity date. `accountability_summary_drafts` rows are immutable revisions: `id` is the revision ID, `draft_id` is the logical group, and edits insert a new revision row. `accountability_summary_approvals` snapshots exact text and hash; `accountability_summary_approval_media` binds a source asset/hash to the exact approved derivative asset/hash. An empty media join set is an explicit text-only approval. Publication media rows can reference only an approved derivative and must match its content hash and the corresponding Random Thoughts media row; `random_thought_media.content_sha256` is nullable for legacy items and required for this provenance link. The publication row is unique per owner/date/destination and approval. No original media URL or object key is copied into approval records. A publication row records state; it does not itself publish content.
- API keys store only a public selector and a 32-byte verifier hash, never the raw key. Allowed scopes are `content:read`, `progress:read`, `progress:write`, `check-ins:read`, `check-ins:write`, `media:read`, `media:write`, `summaries:write`, and `summaries:publish`. Fixed-window rate-limit counters have owner-level or API-key-level partial unique indexes and expiry indexes for cleanup.
- Audit rows contain only event type, owner, opaque entity UUID, and timestamp; they do not copy notes, request bodies, tokens, or raw sensitive text. Events, draft revisions, approvals, and history rows reject updates; user deletion or explicit retention cleanup can remove them.

No personal sample rows or credentials are added by these migrations.

## Local PGlite smoke test

Run `npm run test:accountability` for deterministic domain, request-contract,
media, MCP-security, reminder, summary, and safe JSON-LD serialization tests.
Run `npm run test:pglite` to apply the repository SQL migrations to an ephemeral,
in-process PGlite database and exercise selected constraints. The harness uses
only a minimal stand-in `"user"(id)` table; it does not read `.env`, invoke the
deployment migration runner, use a network database, run Better Auth schema
migrations, or load credentials. It covers owner-scoped uniqueness and event /
idempotency links, check-in delivery provenance, immutable summary revisions and
approvals, stale-approval detection after a newer revision, media ownership and
exact derivative/hash provenance links, normalized/primary weight constraints,
and opaque pre-auth rate-limit hashes with per-window uniqueness.

This is a database-schema smoke test, not a full integration-equivalence claim.
It does not test Better Auth, `pg`/`postgres` client behavior, the migration
runner's advisory-lock/checksum behavior, multi-connection concurrency, service
authorization, storage adapters, or external delivery/publication providers.
PGlite is an embedded PostgreSQL-compatible runtime. Its documented limitation
is one user/connection, so this harness cannot validate concurrent-session,
lock-contention, or multi-connection transaction behavior available in a normal
PostgreSQL server. It also does not replace testing against the deployment
PostgreSQL version and production-shaped auth schema.
