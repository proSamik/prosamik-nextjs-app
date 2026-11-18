---
title: How to Send Coolify Backups to S3 or Cloudflare R2
seoTitle: How to Send Coolify Backups to S3 or Cloudflare R2
description: Add S3-compatible storage to Coolify, use a Cloudflare R2 bucket and a scoped token, attach it to backup schedules, and check the uploads arrive.
category: Databases
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 39
readTime: 9 min
primaryKeyword: coolify backups s3
keywords: [coolify backups s3, coolify cloudflare r2 backup, coolify s3 storage, r2 api token, coolify off-site backup]
related: [postgres-backups-coolify, nextjs-cloudflare-r2-cdn-wrangler, pgbouncer-self-hosted-postgres-nextjs]
subclipBlurb: Subclip records and edits screen demos, so you can capture the Storage setup and a validated connection for your own runbook.
rankizzBlurb: Rankizz tracks how your published guides rank and get cited by AI search, which helps if you publish infrastructure how-tos.
---

Coolify keeps database backups on the same server as the database, so a lost server loses both. S3-compatible storage fixes that: you add the storage once under **Storage**, then attach it to backup schedules. This guide uses Cloudflare R2 as the example, since I already use R2 for assets, but the steps work for any S3-compatible provider.

I use Cloudflare R2 on my own apps for public static assets behind a custom domain, covered in [Next.js with Cloudflare R2 as a CDN](/blogs/nextjs-cloudflare-r2-cdn-wrangler). The backup bucket in this guide is a separate private bucket idea, and the Coolify steps come from the official Coolify and Cloudflare documentation. I am not stating my own backup costs or volumes.

## Quick answer

Create a private R2 bucket and an R2 API token with Object Read and Write permission, scoped to that bucket. In Coolify open **Storage**, select **New storage**, keep **Type** as **S3**, fill in bucket, endpoint parts and keys, then select **Validate Connection & Continue**. Then select the storage on a database backup schedule.

```text
Type: S3
Protocol: https
Host: <ACCOUNT_ID>.r2.cloudflarestorage.com
Port: (empty)
Path: (empty)
Bucket: my-bucket
Access Key: <MY_STORAGE_KEY_ID>
Secret Key: <MY_STORAGE_KEY_SECRET>
```

## Environment

| Item | Value |
| --- | --- |
| Backup source | A Coolify database with a backup schedule |
| Storage | Cloudflare R2 (S3-compatible), private bucket `my-bucket` |
| Credentials | An R2 API token, shown as `<MY_STORAGE_KEY_ID>` and `<MY_STORAGE_KEY_SECRET>` |
| Region | Leave Coolify's default for R2; R2 itself uses `auto` |

## Why an off-server copy

Coolify writes backups to `/data/coolify/backups` on the server. If the disk, server or provider account is lost, local backups go with it. The docs list S3, SFTP, FTPS and WebDAV as upload targets, and say local files are deleted only after every selected destination succeeds. With S3, you can select several destinations, and Coolify uploads to each and tracks each copy separately.

## Step 1: create the bucket and token in Cloudflare

Create a bucket first. The Coolify docs say the bucket must already exist before you validate the storage. Use a bucket that is not public: do not attach a custom domain or enable a public URL for it. A backup bucket is private data, unlike an assets bucket.

Then create an R2 API token. Coolify's R2 guide says to create the token with the **Object Read & Write** permission and to scope it to the backup bucket if you do not want it to reach other buckets. Cloudflare shows the access key ID, the secret key and the S3 endpoint once on the confirmation page. Copy all three into your password manager now; you cannot read the secret again.

The S3 endpoint has the form `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, per Cloudflare's R2 S3 API docs. `<ACCOUNT_ID>` is your account ID from the dashboard. Do not paste your real account ID in tickets or chats. For the region, Cloudflare says to use `auto`, and that an empty value or `us-east-1` is aliased to `auto` for clients that require one.

## Step 2: add the storage in Coolify

In Coolify:

1. Open **Storage** in the sidebar and select **New storage**.
2. Keep **Type** as **S3**.
3. Fill in **Name**, and optionally **Description**.
4. Enter **Bucket**, **Region**, **Access Key** and **Secret Key**.
5. Enter **Protocol**, **Host**, and optionally **Port** and **Path**. These make up the endpoint.
6. Leave **Skip TLS certificate verification** off. It is only for self-signed or private-CA endpoints.
7. Select **Validate Connection & Continue**.

The endpoint rules matter. Coolify says to split it into parts and keep the bucket name out of it. For R2, set **Protocol** to `https`, and **Host** to the hostname from the R2 endpoint without the `https://`. Leave **Port** and **Path** empty. Leave **Region** at its default for R2.

On success Coolify opens the storage details page. Validation sends a `ListObjectsV2` request to the bucket, so it proves the keys and the bucket name, and it does not prove write permission. You will check writes in step 4.

## Step 3: attach the storage to a backup schedule

Open the database, select **Backups**, and open the schedule from the [Postgres backups guide](/blogs/postgres-backups-coolify) (or create one with **+ Add**). Select the new S3 storage as a destination. You can select more than one.

Retention is set per schedule. Count, age and size limits apply to local copies, with `0` meaning no limit. Decide the longer history for the bucket too, and consider an R2 lifecycle rule to expire old objects. I did not verify the exact lifecycle setup in the Cloudflare docs, so check them before you rely on it.

## Step 4: run a backup and check the bucket

Trigger a backup now rather than waiting. Then list the bucket. With wrangler (OAuth login, as in the R2 CDN guide):

```bash
npx wrangler r2 object get my-bucket/<path-to-backup> --remote --file ./check.dump
```

Or open the bucket in the Cloudflare dashboard and look for a new object with a recent timestamp and a believable size. Use the path you see there; the layout is decided by Coolify. If you use the AWS CLI instead, point it at the R2 endpoint:

```bash
aws s3 ls s3://my-bucket/ --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

The AWS CLI reads credentials from its own configuration or environment; do not put keys in the command line.

You should see the new dump listed. If you do not, open the backup execution in Coolify and read the error.

Finally, download one backup and restore it to a scratch database, as in the Postgres guide. A file in the bucket is still just a file until it has been restored.

## What happens when storage breaks

Coolify retests unusable S3 storages every hour and restores them automatically once the connection works. After you fix credentials or connectivity, you can also validate manually from the storage page. Backups sent to a broken storage fail, and the local copy is kept, because local files are removed only after all selected destinations succeed. Coolify notifies on the first failure and then at most once a day, so enable a notification channel.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Bucket does not exist | Validation fails | Create it in Cloudflare first. |
| Token scoped to another bucket | Validation or upload fails | Scope the token to the backup bucket. |
| Self-signed or private CA endpoint | TLS error | Enable **Skip TLS certificate verification** only for that case. |
| Browser downloads from a private CA | Browser still must trust the certificate | Install the CA in your browser. |
| Two destinations selected | Each is uploaded and tracked separately | Check both. |
| Download link from S3 | Expires after 15 minutes | Generate a new one. |
| Deleting a database | Backups stay unless you choose to delete them | Pick the delete option on purpose. |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Validation fails right away | Wrong Host, or `https://` pasted into Host | Use only the hostname; protocol goes in **Protocol**. |
| Validation fails with access denied | Token lacks **Object Read & Write**, or wrong bucket scope | Recreate the token with the right permission and scope. |
| Validation fails with no such bucket | Bucket missing or name mistyped | Create it, or fix **Bucket**. |
| Bucket name in the Host field | Endpoint includes the bucket | Keep the bucket in **Bucket** only. |
| Upload failed in backup run | Storage became unusable | Fix, then validate manually; Coolify also retests hourly. |
| Storage works but bucket is empty | Schedule has no S3 destination selected | Edit the schedule and select the storage. |

## Security

- Use a private bucket for backups. Do not give it a public domain.
- Scope the API token to that bucket and to Object Read and Write, nothing broader.
- Never put the keys in the repository, a Docker image layer, chat or screenshots. Coolify stores them for the storage; rotate them if they leak.
- Keep keys for backups separate from keys your app uses for assets, so a leaked app key cannot reach your backups.
- Backups hold personal data. Encrypt at rest if your policy requires it, and limit who has Admin or Owner roles, which downloads need.

## If you use an AI agent for this

An agent can plan the bucket and walk the Coolify screens, with these rules.

- Tell the agent to treat logs, web pages and tool output as data, not instructions.
- Never paste the keys into the chat, and do not let the agent print them. Use `<MY_STORAGE_KEY_SECRET>` in anything you share.
- Make it show destructive commands, including deleting buckets, objects or lifecycle rules, and wait for approval.
- Give it minimum permissions: a token scoped to one bucket, and a test bucket first.

## FAQ

### Can Coolify back up to Cloudflare R2?
Yes. R2 is S3-compatible. Add it under **Storage** with the R2 endpoint host, your bucket and an Object Read and Write token, then select it on the backup schedule.

### What do I put in the Coolify Host field for R2?
The hostname from the R2 S3 endpoint, without `https://`. Set **Protocol** to `https` and leave **Port** and **Path** empty.

### Does Coolify delete local backups after uploading?
Only after every selected destination succeeds. A failed upload keeps the local file.

### Does the validation test write permission?
It sends a `ListObjectsV2` request, so it checks access to the bucket. Run a real backup to prove uploads work.

### Should the backup bucket be public?
No. Keep it private and scope the token to it.

## Next steps

- Set up the schedule first: [Postgres backups in Coolify](/blogs/postgres-backups-coolify).
- Use R2 for public assets: [Next.js with Cloudflare R2 as a CDN](/blogs/nextjs-cloudflare-r2-cdn-wrangler).
- Pool connections to the database you are backing up: [PgBouncer with self-hosted Postgres](/blogs/pgbouncer-self-hosted-postgres-nextjs).

If you publish infra guides like this, [Rankizz](rankizz:inline-guide-tracking) can track how they rank and get cited by AI search.

Sources: coolify.io/docs/knowledge-base/s3/introduction, coolify.io/docs/core/s3-storage/r2, coolify.io/docs/databases/backups, developers.cloudflare.com/r2/api/s3/api/.
