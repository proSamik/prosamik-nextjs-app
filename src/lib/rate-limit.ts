// Sliding-window limiter kept in memory (per server process). It blunts loops and cheap bots; it is NOT
// DDoS protection. Volumetric attacks must be stopped before they reach Node: keep the site behind
// Cloudflare and add a rate-limiting rule for /api/newsletter there (see docs/newsletter.md).
export interface Limit { limit: number; windowMs: number }

export class SlidingWindowLimiter {
    private hits = new Map<string, number[]>();
    private maxKeys: number;
    constructor(maxKeys = 5000) { this.maxKeys = maxKeys; }

    /** Records a hit and returns true when the key is over its limit. */
    hit(key: string, { limit, windowMs }: Limit, now = Date.now()): boolean {
        const recent = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs);
        recent.push(now);
        this.hits.set(key, recent);
        if (this.hits.size > this.maxKeys) this.prune(windowMs, now);
        return recent.length > limit;
    }

    private prune(windowMs: number, now: number) {
        for (const [key, times] of this.hits) if (times.every((time) => now - time >= windowMs)) this.hits.delete(key);
        // Still too many live keys (a flood of unique callers): drop the oldest half rather than grow.
        if (this.hits.size > this.maxKeys) {
            let drop = Math.floor(this.hits.size / 2);
            for (const key of this.hits.keys()) { if (drop-- <= 0) break; this.hits.delete(key); }
        }
    }
}
