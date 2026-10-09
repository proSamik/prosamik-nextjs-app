import postgres from 'postgres';

type DatabaseClient = ReturnType<typeof postgres>;

const TRANSIENT_DATABASE_ERROR_CODES = new Set([
    'CONNECT_TIMEOUT',
    'CONNECTION_CLOSED',
    'CONNECTION_ENDED',
    'ECONNREFUSED',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EPIPE',
    'ETIMEDOUT',
]);

const DATABASE_RETRY_ATTEMPTS = 2;
const DATABASE_RETRY_DELAY_MS = 750;

const globalDatabase = globalThis as typeof globalThis & {
    consistencyDatabase?: DatabaseClient;
    consistencyDatabasePoolMax?: number;
};

export function getDatabase() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured.');
    }

    const poolMax = Math.max(1, Math.min(6, Math.floor(Number(process.env.DATABASE_POOL_MAX) || 4)));
    if (globalDatabase.consistencyDatabase && globalDatabase.consistencyDatabasePoolMax !== poolMax) {
        // A dev hot reload can change pool settings while preserving globals.
        // Drain the old pool without cancelling its in-flight queries.
        void globalDatabase.consistencyDatabase.end();
        globalDatabase.consistencyDatabase = undefined;
    }
    if (!globalDatabase.consistencyDatabase) {
        globalDatabase.consistencyDatabase = postgres(databaseUrl, {
            max: poolMax,
            idle_timeout: 20,
            connect_timeout: 15,
            prepare: false,
            onnotice: () => undefined,
        });
    }

    globalDatabase.consistencyDatabasePoolMax = poolMax;
    return globalDatabase.consistencyDatabase;
}

function getErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) return undefined;

    const candidate = error as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === 'string') return candidate.code;

    return candidate.cause === error ? undefined : getErrorCode(candidate.cause);
}

export async function withDatabaseRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= DATABASE_RETRY_ATTEMPTS; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            const code = getErrorCode(error);
            const shouldRetry = code !== undefined
                && TRANSIENT_DATABASE_ERROR_CODES.has(code)
                && attempt < DATABASE_RETRY_ATTEMPTS;

            if (!shouldRetry) throw error;

            console.warn(
                `[database] ${operationName} failed with ${code}; retrying `
                + `(${attempt + 1}/${DATABASE_RETRY_ATTEMPTS}).`
            );
            await new Promise((resolve) => setTimeout(resolve, DATABASE_RETRY_DELAY_MS));
        }
    }

    throw new Error(`Database operation "${operationName}" exhausted its retry attempts.`);
}
