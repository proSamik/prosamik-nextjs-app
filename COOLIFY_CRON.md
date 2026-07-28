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
