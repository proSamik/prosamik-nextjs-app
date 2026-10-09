'use client';

// Private data stays in this browser tab's memory, never localStorage or disk.
// Entries expire after one minute and every successful write invalidates them.
const entries = new Map<string, { data: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
let generation = 0;
export function clearAccountabilityCache(signOut = false) {
    generation += 1;
    entries.clear();
    pending.clear();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('accountability-cache-cleared'));
        if (signOut) window.dispatchEvent(new Event('accountability-signed-out'));
    }
}
export function peekAccountabilityCache(endpoint: string): unknown {
    const entry = entries.get(endpoint);
    if (entry && entry.expires <= Date.now()) entries.delete(endpoint);
    return entry && entry.expires > Date.now() ? entry.data : undefined;
}
export async function readAccountabilityCache(endpoint: string, loader: () => Promise<unknown>, refresh = false) {
    const cached = peekAccountabilityCache(endpoint);
    if (!refresh && cached !== undefined) return cached;
    const existing = pending.get(endpoint);
    if (existing) return existing;
    const started = generation;
    const request = loader().then(data => {
        if (started === generation) {
            for (const [key, entry] of entries) if (entry.expires <= Date.now()) entries.delete(key);
            entries.set(endpoint, { data, expires: Date.now() + 60_000 });
            while (entries.size > 50) entries.delete(entries.keys().next().value!);
        }
        return data;
    }).finally(() => { if (pending.get(endpoint) === request) pending.delete(endpoint); });
    pending.set(endpoint, request);
    return request;
}
