# Daily build-cache cleanup

`scripts/clear-build-cache.sh` deletes `.next/cache` and `.next/dev/cache` for this app. It is safe to run while the server is up (it never removes `.next` itself or any source); the cache is rebuilt on demand, so the next build or first request after a run is a little slower.

Installed in the user crontab (daily at 04:00 local time, output appended to `~/Library/Logs/prosamik-clear-build-cache.log`):

```cron
0 4 * * * /Users/licofis/prosamik-nextjs-app/scripts/clear-build-cache.sh >> $HOME/Library/Logs/prosamik-clear-build-cache.log 2>&1
```

- If the Mac is asleep at 04:00 the run is skipped; the next day's run covers it.
- A failed run is harmless. It only logs and exits non-zero.
- Check it: `crontab -l` and `tail ~/Library/Logs/prosamik-clear-build-cache.log`.
- Remove it: `crontab -l | grep -v clear-build-cache | crontab -`.
- On Coolify (production) use a Scheduled Task instead, with command `rm -rf /app/.next/cache` against the application container. Adjust the path to the image's working directory.
