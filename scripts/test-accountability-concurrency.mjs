import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import pg from 'pg';

// Explicit test connection only: never load .env or use DATABASE_URL here.
// Each worker has its own application connection, like separate app instances.
if (!isMainThread) {
    process.env.DATABASE_URL = workerData.url;
    const { getDatabase } = await import('../src/lib/database.ts');
    try {
        const service = await import('../src/lib/accountability-service.ts');
        const source = { kind: 'admin', id: workerData.ownerId };
        const result = workerData.operation === 'create'
            ? await service.createWeightEntry(workerData.ownerId, source, randomUUID(), workerData.input)
            : await service.correctWeightEntry(workerData.ownerId, source, randomUUID(), workerData.input);
        parentPort.postMessage({ result });
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    } finally {
        await getDatabase().end({ timeout: 1 });
    }
} else {
    test('weight writes serialize before row locks across app connections', {
        skip: !process.env.ACCOUNTABILITY_TEST_DATABASE_URL,
        timeout: 30000,
    }, async () => {
        const schema = `weight_test_${randomUUID().replaceAll('-', '')}`;
        const ownerId = randomUUID();
        const firstId = randomUUID();
        const secondId = randomUUID();
        const pool = new pg.Pool({ connectionString: process.env.ACCOUNTABILITY_TEST_DATABASE_URL });
        const client = await pool.connect();
        const workers = [];
        let gateOpen = false;
        const startWorker = (operation, input) => {
            const name = `weight-worker-${randomUUID()}`;
            const url = new URL(process.env.ACCOUNTABILITY_TEST_DATABASE_URL);
            url.searchParams.set('application_name', name);
            url.searchParams.set('options', `-c search_path=${schema} -c statement_timeout=10000`);
            const worker = new Worker(new URL(import.meta.url), {
                workerData: { url: url.toString(), ownerId, operation, input },
            });
            const done = new Promise((resolve, reject) => {
                worker.once('message', (message) => message.error ? reject(new Error(message.error)) : resolve(message.result));
                worker.once('error', reject);
                worker.once('exit', (code) => { if (code) reject(new Error(`Worker exited with ${code}`)); });
            });
            // Keep failures handled while inspecting the blocked connections.
            done.catch(() => {});
            workers.push({ worker, name, done });
            return done;
        };
        try {
            await client.query(`CREATE SCHEMA ${schema}`);
            await client.query(`SET search_path TO ${schema}`);
            await client.query('CREATE TABLE "user" (id TEXT PRIMARY KEY)');
            for (const name of ['0001_random_thoughts.sql', '0002_accountability.sql', '0003_auth_account_issuer_compatibility.sql']) {
                await client.query(await readFile(new URL(`./migrations/${name}`, import.meta.url), 'utf8'));
            }
            await client.query('INSERT INTO "user" (id) VALUES ($1)', [ownerId]);
            for (const [id, date] of [[firstId, '2026-10-07'], [secondId, '2026-10-08']]) {
                await client.query(`INSERT INTO accountability_weight_entries
                    (id, owner_id, local_date, measured_at, original_value, original_unit,
                     source, confirmation_status, confirmed_at, is_primary)
                    VALUES ($1, $2, $3, $3::date + TIME '08:00' AT TIME ZONE 'Asia/Kolkata',
                        80, 'kg', 'manual', 'confirmed', NOW(), TRUE)`, [id, ownerId, date]);
            }
            await client.query('BEGIN');
            gateOpen = true;
            await client.query("SELECT pg_advisory_xact_lock(hashtext('accountability.weight'), hashtext($1))", [ownerId]);
            const correction = startWorker('correct', { id: firstId, originalValue: 81 });
            const creation = startWorker('create', {
                activityDate: '2026-10-07', originalValue: 82, originalUnit: 'kg', isPrimary: true,
            });
            const deadline = Date.now() + 8000;
            let waiting = 0;
            while (Date.now() < deadline) {
                // PostgreSQL caches activity snapshots inside a transaction.
                await client.query('SELECT pg_stat_clear_snapshot()');
                const result = await client.query(`SELECT COUNT(*)::int AS count FROM pg_stat_activity
                    WHERE application_name = ANY($1::text[]) AND wait_event_type = 'Lock' AND wait_event = 'advisory'`,
                [workers.map(({ name }) => name)]);
                waiting = result.rows[0].count;
                if (waiting === 2) break;
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            assert.equal(waiting, 2, 'both writes must wait on the owner lock before touching rows');
            await client.query('SELECT id FROM accountability_weight_entries WHERE owner_id = $1 FOR UPDATE NOWAIT', [ownerId]);
            await client.query('COMMIT');
            gateOpen = false;
            await Promise.all([correction, creation]);
            const primary = await client.query(`SELECT COUNT(*)::int AS count FROM accountability_weight_entries
                WHERE owner_id = $1 AND local_date = '2026-10-07' AND is_primary`, [ownerId]);
            assert.equal(primary.rows[0].count, 1);
            // Concurrent corrections moving between dates use the same owner lock.
            await Promise.all([
                startWorker('correct', { id: firstId, activityDate: '2026-10-08', measuredAt: '2026-10-08T08:00:00+05:30', isPrimary: true }),
                startWorker('correct', { id: secondId, activityDate: '2026-10-07', measuredAt: '2026-10-07T08:00:00+05:30', isPrimary: true }),
            ]);
            const moved = await client.query('SELECT id, local_date::text AS date FROM accountability_weight_entries WHERE id = ANY($1::uuid[])', [[firstId, secondId]]);
            assert.equal(moved.rows.find(({ id }) => id === firstId).date, '2026-10-08');
            assert.equal(moved.rows.find(({ id }) => id === secondId).date, '2026-10-07');
        } finally {
            if (gateOpen) await client.query('ROLLBACK');
            await Promise.allSettled(workers.map(({ done }) => done));
            await Promise.all(workers.map(({ worker }) => worker.terminate()));
            await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
            client.release();
            await pool.end();
        }
    });
}
