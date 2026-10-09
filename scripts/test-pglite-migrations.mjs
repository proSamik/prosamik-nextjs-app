import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// This harness is deliberately self-contained. It does not read .env, invoke
// the deployment migration runner, create a network connection, or load secrets.
const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');
const db = new PGlite();
const hash = (byte) => Buffer.alloc(32, byte);
const uniqueId = () => randomUUID();

async function runMigrations() {
    // The application migrations only reference Better Auth's user.id. A tiny
    // stand-in keeps this a schema smoke test rather than an auth integration.
    await db.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY);');

    for (const name of ['0001_random_thoughts.sql', '0002_accountability.sql', '0003_auth_account_issuer_compatibility.sql', '0004_food_log.sql', '0005_mcp_access_logs.sql']) {
        const sql = await readFile(resolve(migrationsDirectory, name), 'utf8');
        await db.exec(sql);
    }
}

async function insertUser(id) {
    await db.query('INSERT INTO "user" (id) VALUES ($1)', [id]);
}

async function insertHabitDay(ownerId, id = uniqueId(), localDate = '2026-10-07') {
    await db.query(
        `INSERT INTO accountability_habit_days (id, owner_id, habit_key, local_date)
         VALUES ($1, $2, 'exercise', $3)`,
        [id, ownerId, localDate],
    );
    return id;
}

async function insertReminder(ownerId, id = uniqueId(), slotId = 'morning') {
    await db.query(
        `INSERT INTO accountability_reminders (id, owner_id, slot_id, local_time)
         VALUES ($1, $2, $3, '08:00')`,
        [id, ownerId, slotId],
    );
    return id;
}

async function insertDelivery(ownerId, reminderId, slotId, localDate, id = uniqueId()) {
    await db.query(
        `INSERT INTO accountability_reminder_deliveries
            (id, owner_id, reminder_id, slot_id, local_date, delivery_key_hash, provider, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'in_app', 'suppressed')`,
        [id, ownerId, reminderId, slotId, localDate, hash(1)],
    );
    return id;
}

async function insertWeight(ownerId, {
    id = uniqueId(),
    localDate = '2026-10-07',
    originalValue = 70,
    originalUnit = 'kg',
    confirmationStatus = 'pending',
    confirmedAt = null,
    isPrimary = false,
} = {}) {
    await db.query(
        `INSERT INTO accountability_weight_entries
            (id, owner_id, local_date, original_value, original_unit,
             confirmation_status, confirmed_at, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, ownerId, localDate, originalValue, originalUnit, confirmationStatus, confirmedAt, isPrimary],
    );
    return id;
}

async function insertMedia(ownerId, id = uniqueId(), contentSha256 = null) {
    await db.query(
        `INSERT INTO accountability_media_assets
            (id, owner_id, local_date, category, storage_provider, object_key,
             content_type, byte_size, content_sha256)
         VALUES ($1, $2, '2026-10-07', 'general', 'r2', $3, 'image/jpeg', 128, $4)`,
        [id, ownerId, `test/${id}.jpg`, contentSha256],
    );
    return id;
}

await runMigrations();

after(async () => {
    await db.close();
});

test('legacy account issuer values survive while new inserts can omit issuer', async () => {
    await db.exec(`CREATE TABLE account (id TEXT PRIMARY KEY, issuer TEXT NOT NULL);
        INSERT INTO account (id, issuer) VALUES ('legacy-account', 'legacy-issuer');`);
    const migration = await readFile(resolve(migrationsDirectory, '0003_auth_account_issuer_compatibility.sql'), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    await db.exec("INSERT INTO account (id) VALUES ('new-account');");
    const rows = await db.query('SELECT id, issuer FROM account ORDER BY id');
    assert.deepEqual(rows.rows, [
        { id: 'legacy-account', issuer: 'legacy-issuer' },
        { id: 'new-account', issuer: null },
    ]);
});

test('owner-scoped habit uniqueness and idempotency/event consistency', async () => {
    const ownerA = `pglite-${uniqueId()}`;
    const ownerB = `pglite-${uniqueId()}`;
    await insertUser(ownerA);
    await insertUser(ownerB);

    const date = '2026-10-07';
    await insertHabitDay(ownerA, uniqueId(), date);
    await assert.rejects(
        insertHabitDay(ownerA, uniqueId(), date),
        (error) => error.code === '23505',
        'one owner cannot have two rows for the same habit/date',
    );
    await insertHabitDay(ownerB, uniqueId(), date);

    const idempotency = await db.query(
        `INSERT INTO accountability_idempotency_keys
            (owner_id, operation_key, idempotency_key_hash, request_hash)
         VALUES ($1, 'habit.set', $2, $3)
         RETURNING id`,
        [ownerA, hash(2), hash(3)],
    );
    await assert.rejects(
        db.query(
            `INSERT INTO accountability_idempotency_keys
                (owner_id, operation_key, idempotency_key_hash, request_hash)
             VALUES ($1, 'habit.set', $2, $3)`,
            [ownerA, hash(2), hash(4)],
        ),
        (error) => error.code === '23505',
        'same owner/operation/idempotency hash is unique even for a different request hash',
    );

    await db.query(
        `INSERT INTO accountability_habit_events
            (id, owner_id, habit_key, local_date, event_type, status, idempotency_key_id)
         VALUES ($1, $2, 'exercise', $3, 'status_set', 'complete', $4)`,
        [uniqueId(), ownerA, date, idempotency.rows[0].id],
    );
    await assert.rejects(
        db.query(
            `INSERT INTO accountability_habit_events
                (id, owner_id, habit_key, local_date, event_type, status, idempotency_key_id)
             VALUES ($1, $2, 'exercise', $3, 'status_set', 'complete', $4)`,
            [uniqueId(), ownerB, date, idempotency.rows[0].id],
        ),
        (error) => error.code === '23503',
        'events cannot reference another owner’s idempotency record',
    );
});

test('check-in delivery foreign key binds owner, reminder, slot, and date', async () => {
    const ownerId = `pglite-${uniqueId()}`;
    await insertUser(ownerId);
    const date = '2026-10-07';
    const reminderId = await insertReminder(ownerId);
    const deliveryId = await insertDelivery(ownerId, reminderId, 'morning', date);

    await db.query(
        `INSERT INTO accountability_check_ins
            (id, owner_id, local_date, slot_id, scheduled_local_time,
             reminder_id, reminder_delivery_id, reminder_status)
         VALUES ($1, $2, $3, 'morning', '08:00', $4, $5, 'suppressed')`,
        [uniqueId(), ownerId, date, reminderId, deliveryId],
    );
    await assert.rejects(
        db.query(
            `INSERT INTO accountability_check_ins
                (id, owner_id, local_date, slot_id, scheduled_local_time,
                 reminder_id, reminder_delivery_id, reminder_status)
             VALUES ($1, $2, $3, 'morning', '08:00', $4, $5, 'suppressed')`,
            [uniqueId(), ownerId, '2026-10-08', reminderId, deliveryId],
        ),
        (error) => error.code === '23503',
        'delivery provenance cannot be reused for a different check-in date',
    );
});

test('summary revisions and approvals are immutable; revisions are appended', async () => {
    const ownerId = `pglite-${uniqueId()}`;
    await insertUser(ownerId);
    const activityDate = '2026-10-07';
    const groupId = uniqueId();
    const revision1 = uniqueId();
    const revision2 = uniqueId();
    const approvalId = uniqueId();

    await db.query(
        `INSERT INTO accountability_summary_draft_groups (id, owner_id, activity_date)
         VALUES ($1, $2, $3)`,
        [groupId, ownerId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, title, body)
         VALUES ($1, $2, $3, $4, 1, 'Day one', 'Initial draft')`,
        [revision1, ownerId, groupId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_approvals
            (id, owner_id, draft_revision_id, draft_id, draft_revision,
             activity_date, approved_by_user_id, title_snapshot, body_snapshot, content_sha256)
         VALUES ($1, $2, $3, $4, 1, $5, $2, 'Day one', 'Initial draft', $6)`,
        [approvalId, ownerId, revision1, groupId, activityDate, hash(5)],
    );

    await assert.rejects(
        db.query('UPDATE accountability_summary_drafts SET body = $2 WHERE id = $1', [revision1, 'Edited in place']),
        (error) => /immutable/i.test(error.message),
        'draft revision updates must be rejected',
    );
    await assert.rejects(
        db.query('UPDATE accountability_summary_approvals SET body_snapshot = $2 WHERE id = $1', [approvalId, 'Changed']),
        (error) => /immutable/i.test(error.message),
        'approval snapshots must be rejected as immutable',
    );

    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, title, body)
         VALUES ($1, $2, $3, $4, 2, 'Day one', 'A new revision')`,
        [revision2, ownerId, groupId, activityDate],
    );
});

test('an approval stops being current when a newer immutable revision is inserted', async () => {
    const ownerId = `pglite-${uniqueId()}`;
    await insertUser(ownerId);
    const activityDate = '2026-10-07';
    const groupId = uniqueId();
    const revision1Id = uniqueId();
    const revision2Id = uniqueId();
    const approvalId = uniqueId();
    const publicationId = uniqueId();

    await db.query(
        `INSERT INTO accountability_summary_draft_groups (id, owner_id, activity_date)
         VALUES ($1, $2, $3)`,
        [groupId, ownerId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, body)
         VALUES ($1, $2, $3, $4, 1, 'Approved revision one')`,
        [revision1Id, ownerId, groupId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_approvals
            (id, owner_id, draft_revision_id, draft_id, draft_revision,
             activity_date, approved_by_user_id, body_snapshot, content_sha256)
         VALUES ($1, $2, $3, $4, 1, $5, $2, 'Approved revision one', $6)`,
        [approvalId, ownerId, revision1Id, groupId, activityDate, hash(27)],
    );
    await db.query(
        `INSERT INTO accountability_summary_publications
            (id, owner_id, approval_id, activity_date, idempotency_key_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [publicationId, ownerId, approvalId, activityDate, hash(28)],
    );

    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, body)
         VALUES ($1, $2, $3, $4, 2, 'Newer revision two')`,
        [revision2Id, ownerId, groupId, activityDate],
    );

    // Mirror the service's latest-revision lookup and current-approval comparison:
    // owner and logical draft scope the latest row; both revision identity and
    // revision number must match the immutable approval snapshot.
    const [latestRows, approvalRows, publicationRows] = await Promise.all([
        db.query(
            `SELECT id, revision_number
             FROM accountability_summary_drafts
             WHERE owner_id = $1 AND draft_id = $2
             ORDER BY revision_number DESC LIMIT 1`,
            [ownerId, groupId],
        ),
        db.query(
            `SELECT id AS approval_id, owner_id, draft_revision_id, draft_revision
             FROM accountability_summary_approvals
             WHERE owner_id = $1 AND id = $2`,
            [ownerId, approvalId],
        ),
        db.query(
            'SELECT status FROM accountability_summary_publications WHERE owner_id = $1 AND id = $2',
            [ownerId, publicationId],
        ),
    ]);
    assert.equal(publicationRows.rows[0].status, 'pending');
    const latest = latestRows.rows[0];
    const approval = approvalRows.rows[0];
    const approvalIsCurrent = Boolean(
        approval
        && approval.owner_id === ownerId
        && latest
        && String(latest.id) === String(approval.draft_revision_id)
        && Number(latest.revision_number) === Number(approval.draft_revision),
    );
    assert.equal(approvalIsCurrent, false);
    assert.equal(String(latest.id), revision2Id);

    const selectableAsCurrent = await db.query(
        `WITH latest_revision AS (
            SELECT id, revision_number
            FROM accountability_summary_drafts
            WHERE owner_id = $1 AND draft_id = $2
            ORDER BY revision_number DESC LIMIT 1
         )
         SELECT approval.id
         FROM accountability_summary_approvals AS approval
         JOIN latest_revision AS latest
           ON latest.id = approval.draft_revision_id
          AND latest.revision_number = approval.draft_revision
         WHERE approval.owner_id = $1 AND approval.id = $3`,
        [ownerId, groupId, approvalId],
    );
    assert.equal(selectableAsCurrent.rows.length, 0);
});

test('a stale upload failure cannot fail a publication reassigned to a newer approval', async () => {
    const ownerId = `pglite-${uniqueId()}`;
    await insertUser(ownerId);
    const activityDate = '2026-10-07';
    const groupId = uniqueId();
    const revisionAId = uniqueId();
    const revisionBId = uniqueId();
    const approvalAId = uniqueId();
    const approvalBId = uniqueId();
    const publicationId = uniqueId();

    await db.query(
        `INSERT INTO accountability_summary_draft_groups (id, owner_id, activity_date)
         VALUES ($1, $2, $3)`,
        [groupId, ownerId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, body)
         VALUES ($1, $2, $3, $4, 1, 'Approval A revision')`,
        [revisionAId, ownerId, groupId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, body)
         VALUES ($1, $2, $3, $4, 2, 'Approval B revision')`,
        [revisionBId, ownerId, groupId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_approvals
            (id, owner_id, draft_revision_id, draft_id, draft_revision,
             activity_date, approved_by_user_id, body_snapshot, content_sha256)
         VALUES ($1, $2, $3, $4, 1, $5, $2, 'Approval A revision', $6)`,
        [approvalAId, ownerId, revisionAId, groupId, activityDate, hash(32)],
    );
    await db.query(
        `INSERT INTO accountability_summary_approvals
            (id, owner_id, draft_revision_id, draft_id, draft_revision,
             activity_date, approved_by_user_id, body_snapshot, content_sha256)
         VALUES ($1, $2, $3, $4, 2, $5, $2, 'Approval B revision', $6)`,
        [approvalBId, ownerId, revisionBId, groupId, activityDate, hash(33)],
    );
    await db.query(
        `INSERT INTO accountability_summary_publications
            (id, owner_id, approval_id, activity_date, idempotency_key_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [publicationId, ownerId, approvalBId, activityDate, hash(34)],
    );

    // Mirrors failSummaryPublication: a delayed failure for approval A must
    // affect only the pending publication row still assigned to approval A.
    const staleFailure = await db.query(
        `UPDATE accountability_summary_publications
         SET status = 'failed', error_code = 'UPLOAD_FAILED', published_at = NULL, updated_at = NOW()
         WHERE owner_id = $1 AND id = $2 AND approval_id = $3 AND status = 'pending'
         RETURNING id`,
        [ownerId, publicationId, approvalAId],
    );
    assert.equal(staleFailure.rows.length, 0);

    const currentPublication = await db.query(
        'SELECT approval_id, status FROM accountability_summary_publications WHERE owner_id = $1 AND id = $2',
        [ownerId, publicationId],
    );
    assert.equal(String(currentPublication.rows[0].approval_id), approvalBId);
    assert.equal(currentPublication.rows[0].status, 'pending');
});

test('media evidence cannot cross owner boundaries', async () => {
    const ownerA = `pglite-${uniqueId()}`;
    const ownerB = `pglite-${uniqueId()}`;
    await insertUser(ownerA);
    await insertUser(ownerB);
    const mediaId = await insertMedia(ownerA);
    const weightId = await insertWeight(ownerB);

    await assert.rejects(
        db.query(
            `INSERT INTO accountability_weight_entry_evidence (owner_id, weight_entry_id, media_asset_id)
             VALUES ($1, $2, $3)`,
            [ownerB, weightId, mediaId],
        ),
        (error) => error.code === '23503',
        'owner-scoped evidence must not associate another owner’s asset',
    );
});

test('summary approval media requires an exact same-owner derivative provenance link', async () => {
    const ownerA = `pglite-${uniqueId()}`;
    const ownerB = `pglite-${uniqueId()}`;
    await insertUser(ownerA);
    await insertUser(ownerB);

    const sourceMediaId = uniqueId();
    const crossOwnerSourceId = uniqueId();
    const derivativeMediaId = uniqueId();
    const otherOwnerDerivativeId = uniqueId();
    const unlinkedDerivativeId = uniqueId();
    const sourceHash = hash(20);
    const crossOwnerSourceHash = hash(26);
    const derivativeHash = hash(21);
    const otherOwnerHash = hash(22);
    const unlinkedHash = hash(23);

    await insertMedia(ownerA, sourceMediaId, sourceHash);
    await insertMedia(ownerA, crossOwnerSourceId, crossOwnerSourceHash);
    await insertMedia(ownerA, derivativeMediaId, derivativeHash);
    await insertMedia(ownerA, unlinkedDerivativeId, unlinkedHash);
    await insertMedia(ownerB, otherOwnerDerivativeId, otherOwnerHash);

    await db.query(
        `INSERT INTO accountability_media_derivatives
            (owner_id, source_media_asset_id, source_content_sha256,
             derivative_media_asset_id, derivative_content_sha256)
         VALUES ($1, $2, $3, $4, $5)`,
        [ownerA, sourceMediaId, sourceHash, derivativeMediaId, derivativeHash],
    );

    await assert.rejects(
        db.query(
            `INSERT INTO accountability_media_derivatives
                (owner_id, source_media_asset_id, source_content_sha256,
                 derivative_media_asset_id, derivative_content_sha256)
             VALUES ($1, $2, $3, $4, $5)`,
            [ownerA, crossOwnerSourceId, crossOwnerSourceHash, otherOwnerDerivativeId, otherOwnerHash],
        ),
        (error) => error.code === '23503',
        'a derivative owned by someone else cannot be paired with this owner’s source',
    );

    const activityDate = '2026-10-07';
    const groupId = uniqueId();
    const revisionId = uniqueId();
    const approvalId = uniqueId();
    await db.query(
        `INSERT INTO accountability_summary_draft_groups (id, owner_id, activity_date)
         VALUES ($1, $2, $3)`,
        [groupId, ownerA, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_drafts
            (id, owner_id, draft_id, activity_date, revision_number, body)
         VALUES ($1, $2, $3, $4, 1, 'Approved body')`,
        [revisionId, ownerA, groupId, activityDate],
    );
    await db.query(
        `INSERT INTO accountability_summary_approvals
            (id, owner_id, draft_revision_id, draft_id, draft_revision,
             activity_date, approved_by_user_id, body_snapshot, content_sha256)
         VALUES ($1, $2, $3, $4, 1, $5, $2, 'Approved body', $6)`,
        [approvalId, ownerA, revisionId, groupId, activityDate, hash(24)],
    );

    await db.query(
        `INSERT INTO accountability_summary_approval_media
            (owner_id, approval_id, source_media_asset_id, source_content_sha256,
             approved_media_asset_id, approved_content_sha256)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [ownerA, approvalId, sourceMediaId, sourceHash, derivativeMediaId, derivativeHash],
    );
    await assert.rejects(
        db.query(
            `INSERT INTO accountability_summary_approval_media
                (owner_id, approval_id, source_media_asset_id, source_content_sha256,
                 approved_media_asset_id, approved_content_sha256)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [ownerA, approvalId, sourceMediaId, hash(25), unlinkedDerivativeId, unlinkedHash],
        ),
        (error) => error.code === '23503',
        'approval media cannot use a mismatched source hash or an unregistered derivative',
    );
});

test('weight normalization and confirmed-primary constraints', async () => {
    const ownerId = `pglite-${uniqueId()}`;
    await insertUser(ownerId);
    const date = '2026-10-07';
    const now = new Date().toISOString();

    await assert.rejects(
        insertWeight(ownerId, { localDate: date, isPrimary: true }),
        (error) => error.code === '23514',
        'pending weight entries cannot be primary',
    );

    const primaryId = await insertWeight(ownerId, {
        localDate: date,
        originalValue: 220,
        originalUnit: 'lb',
        confirmationStatus: 'confirmed',
        confirmedAt: now,
        isPrimary: true,
    });
    const normalized = await db.query('SELECT weight_kg FROM accountability_weight_entries WHERE id = $1', [primaryId]);
    assert.equal(Number(normalized.rows[0].weight_kg), 99.79);

    await insertWeight(ownerId, {
        localDate: date,
        originalValue: 221,
        originalUnit: 'lb',
        confirmationStatus: 'confirmed',
        confirmedAt: now,
    });
    await assert.rejects(
        insertWeight(ownerId, {
            localDate: date,
            originalValue: 222,
            originalUnit: 'lb',
            confirmationStatus: 'confirmed',
            confirmedAt: now,
            isPrimary: true,
        }),
        (error) => error.code === '23505',
        'at most one confirmed primary weight entry is allowed per owner/date',
    );
});

test('pre-auth rate limits persist only opaque fixed-length hashes with per-window uniqueness', async () => {
    const subjectHash = hash(29);
    const secondSubjectHash = hash(30);
    const windowStart = new Date(Date.now() - 30_000);
    const expiresAt = new Date(windowStart.getTime() + 60_000);
    const insertWindow = (digest) => db.query(
        `INSERT INTO accountability_pre_auth_rate_limit_windows
            (subject_hash, bucket_key, window_start, window_seconds, expires_at)
         VALUES ($1, 'mcp.pre_auth', $2, 60, $3)`,
        [digest, windowStart, expiresAt],
    );

    await insertWindow(subjectHash);
    const stored = await db.query(
        `SELECT subject_hash, bucket_key, window_start, window_seconds, expires_at
         FROM accountability_pre_auth_rate_limit_windows
         WHERE subject_hash = $1 AND bucket_key = 'mcp.pre_auth' AND window_start = $2`,
        [subjectHash, windowStart],
    );
    assert.deepEqual(Buffer.from(stored.rows[0].subject_hash), subjectHash);
    assert.equal(stored.rows[0].window_seconds, 60);
    assert.equal(stored.rows[0].expires_at.getTime(), expiresAt.getTime());
    await assert.rejects(
        insertWindow(subjectHash),
        (error) => error.code === '23505',
        'the same opaque subject hash has only one counter row per bucket/window',
    );
    await insertWindow(secondSubjectHash);
});

test('pre-auth expiry pruning deletes at most 250 expired rows and leaves fresh windows alone', async () => {
    const expiredRowsToSeed = 260;
    const activeSubjectHash = hash(31);
    await db.query(
        `INSERT INTO accountability_pre_auth_rate_limit_windows
            (subject_hash, bucket_key, window_start, window_seconds, expires_at)
         SELECT decode(lpad(to_hex(n), 64, '0'), 'hex'),
                'mcp.pre_auth.expiry',
                (NOW() - INTERVAL '1 day') + (n * INTERVAL '1 minute'),
                60,
                (NOW() - INTERVAL '1 day') + ((n + 1) * INTERVAL '1 minute')
         FROM generate_series(1, $1) AS series(n)`,
        [expiredRowsToSeed],
    );
    await db.query(
        `INSERT INTO accountability_pre_auth_rate_limit_windows
            (subject_hash, bucket_key, window_start, window_seconds, expires_at)
         VALUES ($1, 'mcp.pre_auth.expiry', NOW() - INTERVAL '30 seconds', 60,
                 NOW() + INTERVAL '30 seconds')`,
        [activeSubjectHash],
    );

    const expiredBefore = await db.query(
        `SELECT COUNT(*) AS count
         FROM accountability_pre_auth_rate_limit_windows
         WHERE expires_at < NOW() - INTERVAL '5 minutes'`,
    );
    assert.equal(Number(expiredBefore.rows[0].count), expiredRowsToSeed);

    // Keep this SQL equivalent to pruneExpiredRateLimitWindows in
    // accountability-rate-limit.ts. PGlite runs one connection, so this checks
    // the CTE syntax and batch bound but not multi-session lock contention.
    await db.query(
        `WITH expired AS (
            SELECT ctid
            FROM accountability_pre_auth_rate_limit_windows
            WHERE expires_at < NOW() - INTERVAL '5 minutes'
            ORDER BY expires_at ASC
            LIMIT 250
            FOR UPDATE SKIP LOCKED
         )
         DELETE FROM accountability_pre_auth_rate_limit_windows AS rate_window
         USING expired
         WHERE rate_window.ctid = expired.ctid`,
    );

    const expiredAfter = await db.query(
        `SELECT COUNT(*) AS count
         FROM accountability_pre_auth_rate_limit_windows
         WHERE expires_at < NOW() - INTERVAL '5 minutes'`,
    );
    const removed = Number(expiredBefore.rows[0].count) - Number(expiredAfter.rows[0].count);
    assert.ok(removed <= 250, `expected at most 250 expired rows removed, got ${removed}`);
    assert.equal(removed, 250, 'the cleanup CTE should remove a full batch while more than 250 rows are expired');
    assert.equal(
        Number(expiredAfter.rows[0].count),
        expiredRowsToSeed - 250,
        'ten expired rows remain after deleting a bounded batch from 260 expired rows',
    );

    const activeRow = await db.query(
        `SELECT subject_hash
         FROM accountability_pre_auth_rate_limit_windows
         WHERE subject_hash = $1 AND bucket_key = 'mcp.pre_auth.expiry'`,
        [activeSubjectHash],
    );
    assert.equal(activeRow.rows.length, 1, 'fresh active windows must not be pruned');
});

console.log('PGlite migration smoke tests run in an ephemeral in-process database.');
