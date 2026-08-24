import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { betterAuth } from 'better-auth';
import pg from 'pg';

const { Pool } = pg;

function loadEnvFile() {
    const envFilePath = resolve(process.cwd(), '.env');
    if (!existsSync(envFilePath)) {
        return;
    }

    const envContents = readFileSync(envFilePath, 'utf8');
    envContents.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const delimiter = trimmed.indexOf('=');
        if (delimiter === -1) return;

        const key = trimmed.slice(0, delimiter).trim();
        let value = trimmed.slice(delimiter + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    });
}

function createDatabasePool(databaseUrl) {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    const usesLibpqCompatibility = parsedUrl.searchParams.get('uselibpqcompat') === 'true';

    if (!usesLibpqCompatibility && sslMode && ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
        parsedUrl.searchParams.set('sslmode', 'verify-full');
    }

    return new Pool({
        connectionString: parsedUrl.toString(),
        max: 2,
    });
}

function createRandomThoughtsMigration() {
    return `
        CREATE TABLE IF NOT EXISTS random_thoughts (
            id BIGSERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            media_url TEXT,
            media_type TEXT,
            created_by_email TEXT NOT NULL,
            created_by_name TEXT NOT NULL,
            created_by_avatar TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT random_thoughts_media_type_check
                CHECK (media_type IS NULL OR media_type IN ('image', 'video'))
        );

        ALTER TABLE random_thoughts
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

        CREATE TABLE IF NOT EXISTS random_thought_media (
            id BIGSERIAL PRIMARY KEY,
            thought_id BIGINT NOT NULL REFERENCES random_thoughts(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            media_type TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT random_thought_media_type_check
                CHECK (media_type IN ('image', 'video'))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS random_thought_media_position_idx
            ON random_thought_media (thought_id, position);

        CREATE INDEX IF NOT EXISTS random_thought_media_thought_idx
            ON random_thought_media (thought_id);

        INSERT INTO random_thought_media (thought_id, url, media_type, position)
        SELECT id, media_url, media_type, 0
        FROM random_thoughts
        WHERE media_url IS NOT NULL
          AND media_type IN ('image', 'video')
        ON CONFLICT DO NOTHING;
    `;
}

async function runMigrations() {
    loadEnvFile();

    const databaseUrl = process.env.DATABASE_URL;
    const betterAuthSecret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
    const betterAuthBaseURL = process.env.BETTER_AUTH_URL
        || process.env.NEXT_PUBLIC_APP_URL
        || process.env.NEXT_PUBLIC_SITE_URL
        || 'http://localhost:3000';

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required for migration.');
    }

    if (!betterAuthSecret) {
        throw new Error('BETTER_AUTH_SECRET is required for migration.');
    }

    const pool = createDatabasePool(databaseUrl);
    try {
        const auth = betterAuth({
            database: pool,
            secret: betterAuthSecret,
            baseURL: betterAuthBaseURL,
            emailAndPassword: {
                enabled: false,
            },
        });

        const authContext = await auth.$context;
        await authContext.runMigrations();
        await pool.query(createRandomThoughtsMigration());
        await pool.query('CREATE INDEX IF NOT EXISTS random_thoughts_created_at_idx ON random_thoughts (created_at DESC);');
    } finally {
        await pool.end();
    }
}

runMigrations()
    .then(() => {
        console.log('[migrate-db] Database migration completed.');
    })
    .catch((error) => {
        console.error('[migrate-db] Database migration failed.', error);
        process.exit(1);
    });
