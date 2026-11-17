#!/bin/sh
# Deletes this app's Next.js build caches. Run daily from cron (see docs/build-cache-cron.md).
# Only touches .next/cache and .next/dev/cache under the project; never the source or .next itself,
# so a running server keeps its compiled output and simply rebuilds the cache on demand.
# Exits non-zero on failure; that is fine, cron tries again tomorrow.
set -u
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR" || exit 1
[ -f package.json ] || { echo "$(date '+%F %T') not a project dir: $APP_DIR"; exit 1; }
status=0
for dir in .next/cache .next/dev/cache; do
    if [ -d "$dir" ]; then
        size="$(du -sh "$dir" 2>/dev/null | cut -f1)"
        if rm -rf "$dir"; then echo "$(date '+%F %T') removed $dir ($size)"; else echo "$(date '+%F %T') failed to remove $dir"; status=1; fi
    else
        echo "$(date '+%F %T') nothing at $dir"
    fi
done
exit $status
