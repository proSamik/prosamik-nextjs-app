---
title: How to Use PgBouncer with Self-Hosted Postgres and Next.js
seoTitle: How to Use PgBouncer with Self-Hosted Postgres and Next.js
description: Put PgBouncer in front of self-hosted Postgres for a Next.js app: transaction pooling, a minimal config, migrations on a direct URL, and the limits.
category: Databases
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 37
readTime: 10 min
primaryKeyword: pgbouncer nextjs
keywords: [pgbouncer nextjs, pgbouncer self hosted postgres, postgres connection pooling nextjs, pgbouncer transaction pooling, pgbouncer docker]
related: [postgres-backups-coolify, move-nextjs-from-vercel-to-coolify, coolify-healthcheck-nextjs-docker-railpack]
subclipBlurb: Subclip records and edits screen demos, so you can capture a clean clip of a pool-size change and the resulting connection counts for a runbook.
rankizzBlurb: Rankizz tracks how a published guide like this ranks and gets cited by AI search, so you can see whether the database content reaches readers.
---

PgBouncer is a connection pooler that sits between your app and Postgres. Many app connections share a small set of real Postgres connections, so a Next.js app with several instances, or a burst of requests, does not exhaust the server. This guide covers when you need it, a minimal configuration, how to point a Next.js app at it, and what stops working in transaction pooling.

My own setup is a Next.js site on Coolify with Postgres as a separate Coolify resource, and I talk to Postgres directly. Everything about PgBouncer below comes from the official PgBouncer, Prisma, node-postgres and Coolify documentation, not from a production PgBouncer deployment of mine. Where I could not verify something, I say so.

## Quick answer

Run PgBouncer as its own container next to Postgres, set `pool_mode = transaction`, and give your app the PgBouncer URL (port 6432) for runtime queries. Keep a second, direct Postgres URL for migrations, because migration tools hold session state. Avoid session features in app code: `SET`, `LISTEN`, session advisory locks, and SQL-level `PREPARE`.

```ini
[databases]
my_app = host=my-postgres port=5432 dbname=my_app

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
default_pool_size = 20
max_client_conn = 200
```

Runtime variable `MY_DB_URL` points at PgBouncer. A second variable such as `MY_DIRECT_DB_URL` points at Postgres and is used only for migrations.

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router, Node.js route handlers |
| Postgres | Self-hosted, for example a Coolify PostgreSQL resource |
| PgBouncer | Any current release; a container next to Postgres |
| Driver | `pg` (node-postgres), or Prisma with a driver adapter |
| Variables | `MY_DB_URL` (pooled), `MY_DIRECT_DB_URL` (direct), both runtime secrets |

## Do you need PgBouncer?

You need it when the number of Postgres connections your app opens approaches the server's connection limit. For a single Next.js instance with one `pg` pool you usually do not.

node-postgres documents `max` as 10 by default for a `Pool`, and `idleTimeoutMillis` as 10 seconds. One instance therefore holds at most ten connections. The problem starts when you multiply: several app instances, preview or staging copies, a worker process, a cron job, and a migration run. Each has its own pool. Add them up and compare with Postgres' `max_connections`.

Check the current numbers before you add a component:

```sql
SHOW max_connections;
SELECT count(*) FROM pg_stat_activity;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

If the count stays far below the limit, skip PgBouncer. If you see many `idle` connections from several apps, a pooler fixes it. Plunk's own self-hosting docs describe the same split: a pooled `DATABASE_URL` "typically through PgBouncer" for runtime and a `DIRECT_DATABASE_URL` that "must bypass any connection pooler" for Prisma migrations.

## Step 1: pick the pool mode

PgBouncer has three pool modes, and the choice decides what your app can do. From the PgBouncer config reference:

| Mode | When the server connection is released | Notes |
| --- | --- | --- |
| `session` | When the client disconnects | The default. Least surprising, saves the least. |
| `transaction` | When the transaction ends | Best sharing. Session features break. |
| `statement` | After each query | Multi-statement transactions are not allowed. |

For a Next.js app that runs short queries per request, `transaction` is the usual choice. The default `pool_mode` is `session`, so you must set it yourself.

## Step 2: write the configuration

Create `pgbouncer.ini`. The `[databases]` section maps the name clients ask for to a real Postgres target. The `host`, `port` and `dbname` keys are documented; `port` defaults to 5432 and `dbname` defaults to the client-side name.

```ini
[databases]
my_app = host=my-postgres port=5432 dbname=my_app

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
default_pool_size = 20
max_client_conn = 200
max_prepared_statements = 200
admin_users = my_admin
```

What the key settings mean, with the documented defaults:

| Setting | Default | What it does |
| --- | --- | --- |
| `listen_port` | 6432 | Port clients connect to. |
| `default_pool_size` | 20 | Max server connections per user and database pair. |
| `max_client_conn` | 100 | Max client connections PgBouncer accepts. May need higher OS file descriptor limits when raised. |
| `auth_type` | md5 | Use `scram-sha-256` if your Postgres roles use SCRAM. |
| `max_prepared_statements` | 200 | Tracks protocol-level prepared statements in transaction mode. `0` disables the support. |

`max_client_conn` can be much larger than `default_pool_size`. That is the point: hundreds of client connections share twenty server connections. Keep `default_pool_size` below Postgres' `max_connections`, and remember the limit is per user and database pair.

The `auth_file` lists users, one per line, with the name and password or hash in double quotes:

```text
"my_app_user" "SCRAM-SHA-256$<iterations>:<salt>$<storedkey>:<serverkey>"
```

You can use a plain password or an MD5 hash depending on `auth_type`, but the SCRAM secret from Postgres is the better choice because no cleartext password sits in the file. The PgBouncer docs also describe `auth_query`, which looks users up in Postgres, and recommend a `SECURITY DEFINER` function over direct `pg_authid` access. Whatever you pick, mount the file as a secret and keep it out of the repository.

## Step 3: run it next to Postgres

Run PgBouncer on the same Docker network as the database so the app reaches both by container name and nothing is public. On Coolify, the PostgreSQL docs say port 5432 is internal by default and that a public port is optional. The Coolify PostgreSQL page does not mention PgBouncer or any pooler, so I cannot tell you Coolify has built-in support. I am not claiming it does.

The generic path I would take: add PgBouncer as a separate container or compose-based resource on the same destination network as Postgres, mount `pgbouncer.ini` and the auth file, and expose only port 6432 internally. I have not verified the exact steps for a specific PgBouncer image on Coolify, so follow that image's documentation for where it reads its config.

Do not publish 6432 to the internet unless an external client truly needs it.

## Step 4: point the Next.js app at it

For runtime queries use the PgBouncer host and port. With `pg`:

```ts
// lib/db.ts
import { Pool } from 'pg'

// MY_DB_URL points at PgBouncer, for example:
// postgres://my_app_user:<password>@my-pgbouncer:6432/my_app
export const pool = new Pool({
  connectionString: process.env.MY_DB_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
})
```

Two choices here. `max: 5` keeps each app instance small because PgBouncer does the sharing; the node-postgres default is 10. And `connectionTimeoutMillis` is set because its default is `0`, which means no timeout, so a saturated pool can otherwise hang a request.

Create the pool once at module level, not inside a request handler, and always release clients you check out with `pool.connect()`. node-postgres warns that unreleased clients make the pool run dry.

Set `MY_DB_URL` as a runtime variable in Coolify. It holds a password, so do not mark it as available at build time unless your build truly queries the database.

## Step 5: keep migrations on the direct URL

Migration tools use session state and usually want one stable connection. Prisma's docs say Prisma Migrate is "designed to use a single connection" and does not support PgBouncer pooling, and that running migrations through PgBouncer can fail with `prepared statement "s0" already exists`. Their setup uses two variables: a pooled `DATABASE_URL` for the client and a `DIRECT_URL` for CLI commands.

Do the same with generic names:

```text
MY_DB_URL=postgres://my_app_user:<password>@my-pgbouncer:6432/my_app
MY_DIRECT_DB_URL=postgres://my_app_user:<password>@my-postgres:5432/my_app
```

Run your migration command (for example `npm run db:migrate`) with `MY_DIRECT_DB_URL` and the app with `MY_DB_URL`. On a Dockerfile build where migrations run at build time, the build needs the direct URL as a build argument. Treat that as a secret, and see the note about build-time variables in [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).

Prisma also documents `pgbouncer=true` on the URL for older PgBouncer versions, and says it recommends not setting it for PgBouncer 1.21.0 or later. Check your version before adding it.

## Step 6: verify

Connect to the admin console through the reserved `pgbouncer` database. Only users in `admin_users` or `stats_users` can; the docs say stats users are limited to `SHOW` commands.

```bash
psql "postgres://my_admin:<password>@my-pgbouncer:6432/pgbouncer" -c "SHOW POOLS;"
```

You should see a row for your database with client and server connection counts. Under load, client counts rise while server connections stay near `default_pool_size`. Then from Postgres directly, `SELECT count(*) FROM pg_stat_activity;` should stay small. The PgBouncer config page does not document `SHOW POOLS` by name, so confirm the column layout in the console docs for your version.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| `SET` or `RESET` in app code | Not supported in transaction pooling | Use `SET LOCAL` inside a transaction, or avoid it. |
| `LISTEN` / `NOTIFY` listeners | Do not work through a transaction pool | Use a direct connection for the listener. |
| Session advisory locks | Not supported | Use transaction-level advisory locks. |
| SQL `PREPARE` / `EXECUTE` | Forwarded directly, not tracked | Use protocol-level prepared statements (what most drivers do). |
| Temp tables with `PRESERVE ROWS` | Not supported | Create and use them inside one transaction. |
| `search_path` set with `SET` | Can leak to other clients before PostgreSQL 18 | Set it on the role or use schema-qualified names. |
| `server_reset_query` | Not run in transaction mode by default | Do not rely on it to clean state. |

The unsupported-feature list is from the PgBouncer features page. Build your code so that every transaction is self-contained.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `prepared statement "s0" already exists` | Migrations or a client ran through PgBouncer | Run migrations on the direct URL. |
| Client waits then times out | Pool exhausted, or `max_client_conn` reached | Raise `max_client_conn`, lower per-instance `max`, release clients. |
| Auth failure for a valid user | `auth_type` does not match the stored secret, or the user is missing from `auth_file` | Match `auth_type` to the secret format; re-export the entry. |
| `no more connections allowed (max_client_conn)` | Client count passed `max_client_conn` | Raise it, and raise the file descriptor limit if needed. |
| Settings lost between queries | Session state in transaction mode | Move `SET` into the transaction or the role. |
| Startup parameter rejected | A driver sends a parameter PgBouncer does not accept | Add it to `ignore_startup_parameters` if it is safe to ignore. |

## Security

- Keep PgBouncer on the private Docker network. Expose 6432 only when an external client needs it, and then restrict by firewall.
- Use SCRAM and keep the auth file out of Git and image layers. Mount it as a secret.
- Use a separate admin role for the console and keep it out of the app's variables.
- Give the app's role only the privileges it needs.
- Keep the direct URL for migrations out of the runtime container when you can, so the running app cannot run schema changes.

## If you use an AI agent for this

An agent can draft the config and the pool code, with these rules.

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste connection strings or the auth file into the chat, and do not let the agent print them. Use `<YOUR_DB_URL>` in anything you share.
- Make it show destructive commands, such as dropping databases, deleting volumes, editing DNS or force deploys, and wait for your approval.
- Give it minimum permissions: a scoped database role and a staging database first.

## FAQ

### Do I need PgBouncer for Next.js?
Only when your instances together open more connections than Postgres allows. One instance with a default `pg` pool holds up to ten connections, so a small site rarely needs it.

### Which pool mode should I use?
Use `transaction` for short request-style queries. It shares server connections best, but `SET`, `LISTEN`, session advisory locks and SQL-level `PREPARE` do not work in it. The default is `session`.

### Can I run Prisma migrations through PgBouncer?
No. Prisma documents that Migrate uses a single connection and does not support PgBouncer. Use a direct URL for CLI commands and the pooled URL for the client.

### Does Coolify include PgBouncer?
Its PostgreSQL docs do not mention a pooler, so I cannot confirm built-in support. Run PgBouncer as a separate container on the same network.

### What should `default_pool_size` be?
It defaults to 20 per user and database pair. Keep it below Postgres' `max_connections` with room for admin and migration connections, then adjust from what `SHOW POOLS` shows.

## Next steps

- Protect the data you are pooling: [Postgres backups in Coolify](/blogs/postgres-backups-coolify).
- Set up the platform first: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
- Keep deploys safe: [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).

If you want to track how a guide like this ranks or gets cited by AI search, [Rankizz](rankizz:inline-guide-tracking) is a workspace for that.
