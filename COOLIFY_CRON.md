# Coolify scheduled task

The cron entry in `vercel.json` only runs on Vercel. Configure the equivalent task manually in Coolify with these values:

```text
Name: Sync GitHub and YouTube
Frequency: 0 */4 * * *
Timeout (seconds): 300
Container name: Use the main Next.js application container
```

Command:

```sh
node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/cron/consistency',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)})"
```

This compact command stays within Coolify's 255-character scheduled-task command limit.

Requirements:

- Add `CRON_SECRET` as a runtime environment variable in Coolify.
- Use the same `CRON_SECRET` value expected by `/api/cron/consistency`.
- Select the application container, not the PostgreSQL container.
- The schedule runs once every four hours.

# Coolify healthcheck

The app exposes `GET /api/health`, which returns `200 {"status":"ok"}` once the Next.js server is accepting requests. Configure it in Coolify under the application's **Healthcheck** settings:

```text
Enabled: Yes
Method: GET
Scheme: http
Host: localhost
Port: 3000
Path: /api/health
Return code: 200
Interval (seconds): 30
Timeout (seconds): 5
Retries: 3
Start period (seconds): 30
```

Coolify runs the check inside the container with `curl` or `wget`. If deployments fail the healthcheck while the site itself works, the image is missing both tools: disable the healthcheck and add `curl` to the build image before turning it back on.
