import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { betterAuth } from 'better-auth';
import { jwt } from 'better-auth/plugins';
import { cimd } from '@better-auth/cimd';
import { fetchClientMetadataResource } from '@better-auth/cimd/node';
import { mcp } from '@better-auth/mcp';
import pg from 'pg';

const { Pool } = pg;
const ACCOUNTABILITY_MCP_SCOPES = [
    'openid',
    'offline_access',
    'content:read',
    'progress:read',
    'progress:write',
    'check-ins:read',
    'check-ins:write',
    'media:read',
    'media:write',
    'summaries:write',
    'summaries:publish',
    'food:read',
    'food:write',
];
const MIGRATIONS_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');
const MIGRATION_LOCK_NAME = 'prosamik:app-schema-migrations';

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

function loadVersionedMigrations() {
    if (!existsSync(MIGRATIONS_DIRECTORY)) {
        throw new Error(`Migration directory is missing: ${MIGRATIONS_DIRECTORY}`);
    }

    const sqlEntries = readdirSync(MIGRATIONS_DIRECTORY, { withFileTypes: true })
        .filter((entry) => entry.name.endsWith('.sql'));
    const migrations = sqlEntries.map((entry) => {
        if (!entry.isFile()) {
            throw new Error(`Migration SQL must be a regular repository file: ${entry.name}`);
        }

        const match = /^(\d{4})_([a-z0-9][a-z0-9_-]*)\.sql$/.exec(entry.name);
        if (!match) {
            throw new Error(`Migration filename must be versioned as NNNN_name.sql: ${entry.name}`);
        }

        const sql = readFileSync(resolve(MIGRATIONS_DIRECTORY, entry.name), 'utf8');
        return {
            version: match[1],
            name: entry.name.slice(0, -'.sql'.length),
            checksum: createHash('sha256').update(sql, 'utf8').digest('hex'),
            sql,
        };
    }).sort((first, second) => first.version.localeCompare(second.version));

    for (let index = 1; index < migrations.length; index += 1) {
        if (migrations[index - 1].version === migrations[index].version) {
            throw new Error(`Duplicate migration version: ${migrations[index].version}`);
        }
    }

    if (migrations.length === 0) {
        throw new Error('No versioned SQL migrations were found.');
    }

    return migrations;
}

async function applyTrackedMigration(pool, migration) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [MIGRATION_LOCK_NAME]);
        await client.query(`
            CREATE TABLE IF NOT EXISTS app_schema_migrations (
                version VARCHAR(4) PRIMARY KEY,
                name TEXT NOT NULL,
                checksum_sha256 CHAR(64) NOT NULL
                    CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        const applied = await client.query(
            'SELECT name, checksum_sha256 FROM app_schema_migrations WHERE version = $1',
            [migration.version],
        );
        if (applied.rows.length > 0) {
            const record = applied.rows[0];
            if (record.name !== migration.name || record.checksum_sha256.trim() !== migration.checksum) {
                throw new Error(
                    `Applied migration ${migration.version} does not match its repository file. `
                    + 'Do not edit a migration that has already been applied; add a new version instead.',
                );
            }

            await client.query('COMMIT');
            console.log(`[migrate-db] Skipped already-applied ${migration.name}.`);
            return false;
        }

        await client.query(migration.sql);
        await client.query(
            `INSERT INTO app_schema_migrations (version, name, checksum_sha256)
             VALUES ($1, $2, $3)`,
            [migration.version, migration.name, migration.checksum],
        );
        await client.query('COMMIT');
        console.log(`[migrate-db] Applied ${migration.name}.`);
        return true;
    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // Preserve the original migration error if the connection is already unusable.
        }
        throw error;
    } finally {
        client.release();
    }
}

async function runMigrations() {
    loadEnvFile();

    const databaseUrl = process.env.DATABASE_URL;
    const betterAuthSecret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET;
    const betterAuthBaseURL = process.env.BETTER_AUTH_URL
        || process.env.NEXT_PUBLIC_APP_URL
        || process.env.NEXT_PUBLIC_SITE_URL
        || 'http://localhost:3000';
    const mcpResourceUrl = process.env.MCP_RESOURCE_URL?.trim()
        || new URL('/api/mcp', betterAuthBaseURL).toString();

    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required for migration.');
    }

    if (!betterAuthSecret) {
        throw new Error('BETTER_AUTH_SECRET is required for migration.');
    }

    const migrations = loadVersionedMigrations();
    const pool = createDatabasePool(databaseUrl);
    try {
        const auth = betterAuth({
            database: pool,
            secret: betterAuthSecret,
            baseURL: betterAuthBaseURL,
            emailAndPassword: {
                enabled: false,
            },
            plugins: [
                jwt(),
                mcp({
                    loginPage: '/sign-in',
                    consentPage: '/oauth-consent',
                    resource: mcpResourceUrl,
                    scopes: ACCOUNTABILITY_MCP_SCOPES,
                    refreshTokenReuseInterval: 30,
                    allowDynamicClientRegistration: false,
                }),
                cimd({
                    fetchClientMetadataResource,
                    metadataProfile: 'mcp-2026-07-28',
                    metadataRevalidationInterval: '1h',
                    maxCacheEntries: 256,
                    metadataFetchPolicy: {
                        minimumFetchInterval: '30s',
                        maximumConcurrentFetches: 16,
                        maximumConcurrentFetchesPerOrigin: 4,
                        maximumFetchesPerMinute: 120,
                        maximumFetchesPerOriginPerMinute: 30,
                    },
                }),
            ],
        });

        const authContext = await auth.$context;
        await authContext.runMigrations();

        for (const migration of migrations) {
            await applyTrackedMigration(pool, migration);
        }
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
