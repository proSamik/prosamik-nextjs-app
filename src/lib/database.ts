import postgres from 'postgres';

type DatabaseClient = ReturnType<typeof postgres>;

const globalDatabase = globalThis as typeof globalThis & {
    consistencyDatabase?: DatabaseClient;
};

export function getDatabase() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured.');
    }

    if (!globalDatabase.consistencyDatabase) {
        globalDatabase.consistencyDatabase = postgres(databaseUrl, {
            max: 1,
            idle_timeout: 20,
            connect_timeout: 15,
            prepare: false,
        });
    }

    return globalDatabase.consistencyDatabase;
}
