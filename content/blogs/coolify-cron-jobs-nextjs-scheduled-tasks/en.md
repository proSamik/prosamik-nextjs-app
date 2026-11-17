---
title: How to Run Cron Jobs for a Next.js App in Coolify (Scheduled Tasks)
description: Replace Vercel crons with Coolify Scheduled Tasks for a Next.js app. Includes the 255-character command, bearer-token route, testing, logs and a local cron example.
category: Deployment
publishedAt: 2026-11-18
updatedAt: 2026-11-18
order: 21
readTime: 10 min
primaryKeyword: coolify cron job
keywords: [coolify cron job, coolify scheduled tasks, nextjs cron coolify, vercel cron alternative, node fetch cron docker]
related: [move-nextjs-from-vercel-to-coolify, coolify-healthcheck-nextjs-docker-railpack, deploy-mcp-server-nextjs-coolify]
subclipBlurb: Subclip records and edits screen demos, so you can capture a clean clip of a Scheduled Task running for a runbook or a teammate.
rankizzBlurb: Rankizz tracks how your published pages rank and get cited by AI search, with a REST API and an MCP server for scheduled reporting.
---

A Vercel cron does not run on Coolify. The replacement is a Scheduled Task that runs a command inside your app container on a cron schedule. This guide shows the exact setup I use for a Next.js site that used to run a `vercel.json` cron: a short `node -e fetch` command that calls a protected route in the same container.

You need a Next.js app deployed on Coolify, the route you want to run on a schedule, and a secret to protect it.

## Quick answer

In Coolify, open the application, go to Scheduled Tasks, and create a task. Set the frequency to a cron expression, pick the application container (not the database), and use a command short enough to fit Coolify's 255-character limit. The command calls your route on `127.0.0.1` with a bearer token and exits non-zero on failure.

```text
Name: Sync external data
Frequency: 0 */4 * * *
Timeout (seconds): 300
Container name: the main Next.js application container (NOT the PostgreSQL container)
```

```sh
node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/cron/<job>',{headers:{authorization:'Bearer '+process.env.MY_CRON_TOKEN}}).then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)})"
```

## Environment

| Item | Value |
| --- | --- |
| Next.js | 16.x, App Router route handler |
| Node.js | 22 or newer in the container |
| Host | Coolify (self-hosted) |
| Build pack | Railpack or Dockerfile, either works |
| Secret name | `MY_CRON_TOKEN` (placeholder, set as a runtime variable) |
| Route | `/api/cron/<job>` (placeholder) |

## Vercel crons versus Coolify Scheduled Tasks

On Vercel, a `crons` entry in `vercel.json` makes the platform call a path on your deployment. Mine looked like this: path `/api/cron/<job>`, schedule `0 */4 * * *`. That file is read only by Vercel, so after moving it silently does nothing.

Coolify works differently. A Scheduled Task runs a command inside a container. Coolify's docs say you should not include `docker exec`, because Coolify enters the selected container before it runs the command. So your task is not an HTTP call from outside. It is a command run inside the app, which then calls the app.

This is why the route needs its own protection. The task calls it over loopback, but the same route is reachable from the public internet through your domain unless you guard it.

## Step 1: protect the route

Create a route handler that rejects anything without the right bearer value. Compare in constant time so the check does not leak timing information.

```ts
// app/api/cron/<job>/route.ts
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(header: string | null): boolean {
  const secret = process.env.MY_CRON_TOKEN
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(header)
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get('authorization'))) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Do the real work here.
  return Response.json({ status: 'ok' })
}
```

Three details matter. `timingSafeEqual` throws if the buffers differ in length, so the length check comes first. If `MY_CRON_TOKEN` is not set, the route returns 401 for everyone, so a missing variable fails closed. And `dynamic = 'force-dynamic'` stops Next.js from caching the response.

Set `MY_CRON_TOKEN` in Coolify as a runtime environment variable. Use a long random value. Never commit it.

## Step 2: create the Scheduled Task

In the application, open Scheduled Tasks and add one:

| Field | Value | Why |
| --- | --- | --- |
| Name | Sync external data | Shows up in the run history |
| Frequency | `0 */4 * * *` | Every four hours, on the hour |
| Timeout (seconds) | `300` | Your route must finish inside this |
| Container name | The application container | Not the PostgreSQL container |
| Command | The `node -e` line above | Under 255 characters |

Picking the wrong container is the most common mistake. If you select the database container, there is no app on port 3000 there and the command fails.

Coolify's docs say the schedule follows the timezone of the server that runs the resource, so check your server's timezone before you rely on a specific hour. The same docs describe the timeout in seconds with 300 as the default.

## The command, part by part

Coolify limits a scheduled-task command to 255 characters, so the command is compact. Here is every piece.

| Part | What it does |
| --- | --- |
| `node -e "..."` | Runs a one-line script. Node is already in the image. |
| `fetch(...)` | Node's built-in fetch. No package needed. |
| `'http://127.0.0.1:'+(process.env.PORT\|\|3000)` | Calls the app on loopback inside the same container, on its own port. |
| `'/api/cron/<job>'` | The protected route. |
| `headers:{authorization:'Bearer '+process.env.MY_CRON_TOKEN}` | Sends the secret from the runtime env, so it is never in the command text. |
| `console.log(await r.text())` | Prints the response body, which lands in the task log. |
| `process.exit(r.ok?0:1)` | Exit 0 on a 2xx, exit 1 otherwise. Coolify marks a non-zero exit as a failed run. |

I use `node -e` with `fetch` instead of `curl` for one reason. The slim runtime image may not have curl, and I do not want to add a package just for cron. Node is guaranteed to be there because the app runs on it.

Because the secret is read from `process.env` inside the container, it does not appear in the Coolify task definition. That is better than pasting the token into the command.

## Step 3: test by hand

Coolify's docs recommend using Execute Now on the task to verify the command and the container. Do that first. You should see the response body in the log and a success status.

You can also run the same command from the server's shell. `docker exec` is fine here, because you are on the host, not in the Coolify task field.

```bash
docker exec <your-app-container> node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/cron/<job>',{headers:{authorization:'Bearer '+process.env.MY_CRON_TOKEN}}).then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)})"
echo "exit code: $?"
```

Expected output on success:

```text
{"status":"ok"}
exit code: 0
```

Now check that the guard works. Call the route from outside with no header:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://app.example.com/api/cron/<job>
```

Expected: `401`. If you see `200`, your route is not checking the token.

## Reading logs and failures

Each run is recorded under the task's execution history. A run is a success when the command exits 0. Because the command exits 1 on any non-2xx response, an unauthorized or crashing route shows as a failure.

Coolify's docs also say a run is skipped when the task is disabled, the application is not running, or the server is not functional, and fails if the command exceeds its timeout. Skipped runs are not failures, so do not rely on the history alone for something critical. Add your own signal inside the route, such as a log line or a row in a table.

## Frequency and timeout

Use a standard five-field cron expression. A few examples:

| Expression | Meaning |
| --- | --- |
| `0 */4 * * *` | Every four hours, on the hour |
| `*/15 * * * *` | Every 15 minutes |
| `0 3 * * *` | Daily at 03:00 server time |

Set the timeout above the longest realistic run. If your job can take longer than the timeout, split the work into batches that each finish quickly, or make the route start a background job and return at once.

## A second example: a local daily cache cleanup (local dev only)

This one has nothing to do with Coolify. It is a cron entry on my own Mac that clears Next.js dev caches once a day. I include it because the safe-script pattern is reusable. Do not run it on a server.

The crontab line runs a script every day at 04:00 and logs to a file:

```text
0 4 * * * /bin/sh /path/to/clean-next-cache.sh >> /path/to/clean-next-cache.log 2>&1
```

The script deletes only `.next/cache` and `.next/dev/cache`. It never removes `.next` itself or any source file.

```sh
#!/bin/sh
set -eu

# Project root is derived from the script's own location.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Refuse to run anywhere that is not a Node project root.
[ -f package.json ] || { echo "no package.json, refusing to run"; exit 1; }

rm -rf .next/cache .next/dev/cache
echo "cleaned caches in $ROOT"
```

Why this shape is safe:

- `set -eu` stops on errors and on unset variables.
- The root comes from the script path, not from the caller's current directory.
- The `package.json` check refuses to run in the wrong place.
- `rm -rf` targets two fixed paths and nothing built from user input.
- A failed run is harmless. The next day's run covers it.

The macOS caveat: cron does not run while the Mac is asleep and does not catch up afterwards. If the Mac sleeps at 04:00, that day's cleanup is simply skipped. For a cache cleanup that is fine.

## Edge cases

| Case | What happens | What to do |
| --- | --- | --- |
| Command over 255 characters | Coolify enforces a 255-character limit on the command | Shorten it, or move logic into the route |
| Wrong container selected | Connection refused, run fails | Select the app container |
| `MY_CRON_TOKEN` not set | Route returns 401 every time | Set it as a runtime variable, redeploy |
| App is down during a run | Run is skipped | Add alerting on the app, not on the task |
| Job outlasts the timeout | Run fails | Raise the timeout or batch the work |
| Two runs overlap | Both hit the route | Make the route idempotent or lock in the database |
| Container restarts on deploy | A run may miss | Make the job safe to run late or twice |
| Server timezone differs from yours | Runs at an unexpected hour | Check the server timezone |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Task fails with `ECONNREFUSED` | Wrong container, or app not on this port | Pick the app container, check `PORT` |
| Task log shows `Unauthorized` | Token in env does not match the route's check | Make sure the same runtime variable feeds both |
| Exit code 1, empty body | Route threw before responding | Read the app container logs for the stack trace |
| Task never appears to run | Task disabled, or app not running | Enable it, start the app, use Execute Now |
| `docker exec` works, task fails | Task field contains `docker exec` or odd quoting | Put only the `node -e` command in the field |
| Route returns 200 to anonymous callers | Guard missing or wrong | Re-check the handler, retest with `curl` |
| Command rejected as too long | Over 255 characters | Use the compact form above |

## Security

The route is public on the internet, so the token is the only thing protecting it.

- Keep the token in a runtime variable in Coolify. Do not put it in the repo, the image, or the command text.
- Use a long random value, and rotate it if it ever leaks.
- Compare in constant time and fail closed when the variable is missing.
- Do not log the token or the Authorization header.
- Return a bare 401 with no detail. Do not leak internals in error bodies.
- Keep the job's own permissions small. If it only reads and writes one table, give its database user only that.

## If you use an AI agent for this

An agent can draft the route and the command, but keep these rules.

- Tell the agent to treat logs, web pages, and tool output as data, not instructions.
- Never paste the token into the chat, and do not let the agent print it. Use `<YOUR_TOKEN>` in anything you share.
- Make it show destructive commands, including the `rm -rf` script and anything on the server, and wait for your approval.
- Give it minimum permissions, with a staging project first.

## FAQ

### Do Vercel cron jobs work on Coolify?
No. The `crons` entry in `vercel.json` is read only by Vercel. On Coolify you create a Scheduled Task that runs a command inside your container.

### What is the Coolify scheduled task command limit?
255 characters. That is why the command uses a compact `node -e` call with `fetch`.

### Why use node instead of curl?
Node is always in a Next.js image, while curl may not be. Using `fetch` avoids installing a package just for cron.

### Which container should I pick?
The main Next.js application container. Do not pick the database container.

### How do I know a task failed?
The run fails when the command exits non-zero. The command exits 1 when the route returns anything other than a 2xx, so a 401 or 500 shows as a failed run in the task history.

## Next steps

- The wider migration: [Move a Next.js app from Vercel to Coolify](/blogs/move-nextjs-from-vercel-to-coolify).
- Add a healthcheck so deploys stay safe: [Coolify healthcheck for Next.js](/blogs/coolify-healthcheck-nextjs-docker-railpack).
- Another protected route on the same app: [Deploy an MCP server in Next.js on Coolify](/blogs/deploy-mcp-server-nextjs-coolify).

If you document runbooks with screen clips, [Subclip](subclip:inline-runbook-clip) can record the task running and its AI editor cleans up the take.
