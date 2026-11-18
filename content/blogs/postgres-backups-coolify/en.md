---
title: How to Back Up Postgres in Coolify and Test the Restore
seoTitle: How to Back Up Postgres in Coolify and Test a Restore
description: Set up scheduled Postgres backups in Coolify, set retention, then restore a dump into a disposable database with pg_restore to prove it works.
category: Databases
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 38
readTime: 10 min
primaryKeyword: postgres backups coolify
keywords: [postgres backups coolify, coolify database backup, pg_dump restore, pg_restore test, coolify scheduled backup]
related: [coolify-backups-s3-r2, pgbouncer-self-hosted-postgres-nextjs, move-nextjs-from-vercel-to-coolify]
subclipBlurb: Subclip records and edits screen demos, so a restore drill can become a short clip that a teammate can follow.
rankizzBlurb: Rankizz tracks how your published pages rank and get cited by AI search, with an API for reporting on a backup runbook you publish.
---

A Postgres database on Coolify is not backed up until you schedule a backup, send a copy off the server, and restore it once. Coolify has a built-in scheduled backup for PostgreSQL. This guide shows how to turn it on, what retention to set, and how to prove the dump restores with `pg_restore`.

My setup is a Next.js site on Coolify with Postgres as a separate Coolify resource. The Coolify behavior below comes from the official Coolify backup documentation, and the restore commands come from the PostgreSQL documentation. I have not published numbers about my own backup sizes or timings, because I do not have verified ones to share.

## Quick answer

Open the Postgres resource in Coolify, select **Backups**, select **+ Add**, enter a cron expression or a named frequency such as `daily`, and select **Add schedule**. Set retention, add an off-server destination, then restore a copy into a throwaway database and check your app's tables. A backup you have never restored is only a file.

```bash
# restore drill, in a disposable database
createdb -T template0 restore_test
pg_restore -O -d restore_test my-backup.dump
psql -d restore_test -c "SELECT count(*) FROM <your_table>;"
```

## Environment

| Item | Value |
| --- | --- |
| Platform | Coolify (self-hosted), Postgres as a database resource |
| Backup tool | Coolify scheduled backups |
| Restore tools | `pg_restore` and `psql` from PostgreSQL |
| Off-server copy | S3-compatible storage (see the companion guide) |
| Names used | `my-backup.dump`, `restore_test`, `my-app` (placeholders) |

## What Coolify backs up

Coolify's database backup feature supports PostgreSQL, MySQL, MariaDB, MongoDB, ClickHouse and SQLite. It does not support Redis, Dragonfly or KeyDB. Backups run on the database's server and only while the database is running.

For a Postgres resource you can back up all databases or select specific ones. Files are written on the server under `/data/coolify/backups`. That path is on the same machine as the database, which is the first thing to fix: a copy on the same disk does not survive losing the server.

## Step 1: create the schedule

In Coolify, open your project, then the PostgreSQL resource. Then:

1. Select **Backups**.
2. Select **+ Add**.
3. Enter a frequency. You can type a cron expression or use a named option: `hourly`, `daily`, `weekly`, `monthly` or `yearly`.
4. Select **Add schedule**.

A standard five-field cron works. `0 3 * * *` is daily at 03:00 in the server's timezone; check that timezone before you rely on an hour. The default job timeout in the docs is 3600 seconds.

Pick a frequency from how much data you can afford to lose. Daily means you can lose up to a day. If that is too much, schedule more often, or add point-in-time recovery with WAL archiving, which Coolify's scheduled backups do not provide (they are logical dumps).

## Step 2: set retention

Coolify can limit local backups by count, by age and by storage size, and `0` means no limit. Set at least a count or an age limit, or the backup folder grows until the disk fills. A full disk then breaks the database it was meant to protect.

A reasonable starting point is a few days of local copies and a longer history in object storage. The numbers depend on your database size and your disk, so size them from your own data.

## Step 3: add an off-server destination

Coolify can upload to S3, SFTP, FTPS or WebDAV storage. Per the docs, local files are deleted only after every selected destination succeeds, so a failed upload does not remove your only copy. The companion guide shows the full S3 and Cloudflare R2 setup: [Coolify backups to S3 or Cloudflare R2](/blogs/coolify-backups-s3-r2).

## Step 4: run one now and check the file

After you add the schedule, trigger a backup instead of waiting for the clock. Then check the result on the server:

```bash
ls -lh /data/coolify/backups
```

You should see a dump file with a plausible size and a recent timestamp. A zero-byte or tiny file means the job failed or the database is empty. Coolify notifies the team on the first failure, then at most once a day, and it never disables schedules automatically, so a broken schedule keeps failing until you fix it. Turn on a notification channel in Coolify so you actually see it.

## Step 5: restore into a disposable database

The Coolify docs say a successful backup only shows that a file was created, and recommend restoring a copy into a disposable database and confirming your app can read it. The docs I read do not describe a one-click restore in the UI, so I restore by hand with standard PostgreSQL tools.

First, find out the dump format. `pg_restore` reads archives made by `pg_dump` in custom, directory or tar format. A plain SQL dump is not handled by `pg_restore`; use `psql -f` for that. List the archive's table of contents to check which one you have:

```bash
pg_restore -l my-backup.dump | head
```

If that prints a table of contents, restore it into a fresh, empty database. Do this on a scratch Postgres, not your production resource.

```bash
createdb -T template0 restore_test
pg_restore -O -d restore_test my-backup.dump
```

`-d` restores directly into the named database, and `-O` (`--no-owner`) skips ownership statements so any role can run the restore and will own the objects. Useful extras from the `pg_restore` docs: `-e` stops at the first error, `-j n` restores with `n` parallel sessions for custom and directory formats, and `-1` wraps everything in one transaction (not combinable with `-j`).

If the command errors on some objects, read the messages instead of ignoring them. Missing extensions or roles are the usual cause.

Then check the data:

```bash
psql -d restore_test -c "\dt"
psql -d restore_test -c "SELECT count(*) FROM <your_table>;"
```

Compare the row count with production. Finally, point a staging copy of your app at `restore_test` and load a few pages. Drop the scratch database when done:

```bash
dropdb restore_test
```

## Taking a manual dump as well

Before a risky change such as a large migration, take your own dump from the database container. Replace the container name with yours; use `docker ps` to find it.

```bash
docker exec <your-postgres-container> pg_dump -U <db-user> -Fc <db-name> > pre-migration.dump
```

`-Fc` writes the custom format that `pg_restore` handles, with compression and selective restore. Store the file somewhere other than the database server, and do not commit it to Git, because it contains your data.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Database is stopped | Scheduled backups run only while it is running | Keep it running, monitor the resource. |
| Disk fills with backups | Retention was `0` (no limit) | Set count or age limits. |
| Database deleted in Coolify | Backup files are kept by default | Choose the delete-backups option only when you mean it. |
| Backup file exists but is bad | Only creation is confirmed | Restore-test on a schedule. |
| Service database (compose stack) | Credentials come from the container's env, such as `POSTGRES_PASSWORD` | Make sure those variables exist. |
| Redis in the same project | Not covered by Coolify backups | Back it up another way or treat it as a cache. |
| Dump from a newer Postgres than the restore target | Restore can fail on newer features | Restore with the same or a newer major version. |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| No backup files appear | Database not running, or schedule not saved | Start the database, check **Backups**, run one now. |
| Job fails for a service database | A needed variable is missing; the docs warn that a missing MySQL or MariaDB database-name variable can stop the job | Add the variable the docs name for your engine. |
| `pg_restore: error: input file appears to be a text format dump` | The file is a plain SQL dump | Restore with `psql -d restore_test -f file.sql`. |
| `pg_restore: error: ... already exists` | Restoring into a non-empty database | Restore into a fresh database, or use `--clean --if-exists`. |
| Restore errors on `role ... does not exist` | Dump references roles that are not on the target | Use `-O`, or create the roles first. |
| Upload to storage failed | Credentials, bucket or endpoint wrong | See the S3 guide and validate the storage. |
| Download link stopped working | S3 download links expire after 15 minutes | Generate a new one. |

## Security

- Backups contain your whole database, including personal data. Treat them as secrets.
- Use a private bucket and a token scoped to that bucket only.
- Downloads from Coolify need an Admin or Owner role; keep that group small.
- Never put dumps in Git, a public bucket or chat.
- Restore only into a scratch database that is not reachable from the internet.
- Rotate storage keys if they leak.

## If you use an AI agent for this

An agent can draft the schedule plan and the restore drill, with these rules.

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste connection strings or storage keys into the chat, and do not let the agent print them. Use `<YOUR_DB_URL>` in anything you share.
- Make it show destructive commands, including `dropdb`, `pg_restore --clean`, deleting volumes or buckets, and wait for approval.
- Give it minimum permissions: a scoped token, and a staging database for the restore drill.

## FAQ

### Does Coolify back up Postgres automatically?
Only after you add a schedule. Open the database, select **Backups**, select **+ Add**, choose a frequency and select **Add schedule**.

### Where does Coolify store database backups?
On the server under `/data/coolify/backups`, and optionally in S3, SFTP, FTPS or WebDAV storage. Keep an off-server copy.

### How do I restore a Coolify Postgres backup?
Get the dump file, create an empty database, and run `pg_restore -O -d <db> <file>` for custom-format dumps or `psql -f` for plain SQL. Test it on a scratch database first.

### How often should I back up?
As often as the data you can afford to lose. Daily is common for small apps. For less loss, schedule more often or use WAL archiving, which Coolify's scheduled dumps do not do.

### Is a successful backup job enough?
No. It only proves a file was created. Restore it and check your data.

## Next steps

- Send copies off the server: [Coolify backups to S3 or Cloudflare R2](/blogs/coolify-backups-s3-r2).
- Pool connections to the same database: [PgBouncer with self-hosted Postgres and Next.js](/blogs/pgbouncer-self-hosted-postgres-nextjs).
- The platform setup: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).

If you document your restore drill as a runbook, [Subclip](subclip:inline-restore-drill) can record the terminal session and its AI editor trims the take.
