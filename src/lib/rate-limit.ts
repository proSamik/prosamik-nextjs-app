type RateLimitOptions = {
    windowMs: number;
    max: number;
};

type RateLimitResult = {
    success: boolean;
    remaining: number;
    resetMs: number;
};

type Bucket = {
    count: number;
    resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

function getClientIp(headers: Headers): string {
    const directIp = headers.get('cf-connecting-ip')
        || headers.get('x-real-ip')
        || headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || '0.0.0.0';

    return directIp;
}

export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const bucket = memoryBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        const resetAt = now + options.windowMs;
        memoryBuckets.set(key, { count: 1, resetAt });
        return {
            success: true,
            remaining: options.max - 1,
            resetMs: options.windowMs,
        };
    }

    bucket.count += 1;
    memoryBuckets.set(key, bucket);

    const remaining = options.max - bucket.count;
    if (remaining < 0) {
        return {
            success: false,
            remaining: 0,
            resetMs: Math.max(1, bucket.resetAt - now),
        };
    }

    return {
        success: true,
        remaining,
        resetMs: bucket.resetAt - now,
    };
}

export function getIpFromHeaders(headers: Headers): string {
    return getClientIp(headers);
}

