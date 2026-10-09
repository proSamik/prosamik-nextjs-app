import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
// These service tests use only an in-process PGlite database over a local,
// single-connection Postgres-protocol socket. No .env or external DB is read.
const database = new PGlite();
await database.exec('CREATE TABLE "user" (id TEXT PRIMARY KEY);');
for (const migration of ['0001_random_thoughts.sql', '0002_accountability.sql', '0003_auth_account_issuer_compatibility.sql']) {
    await database.exec(await readFile(new URL(`./migrations/${migration}`, import.meta.url), 'utf8'));
}

const port = Number(process.env.PGLITE_SERVICE_TEST_PORT || 55441);
const socketServer = new PGLiteSocketServer({ db: database, host: '127.0.0.1', port });
await socketServer.start();
process.env.DATABASE_URL = `postgres://test:test@127.0.0.1:${port}/accountability_service_test`;

const [{ getDatabase }, accountability, summaries] = await Promise.all([
    import('../src/lib/database.ts'),
    import('../src/lib/accountability-service.ts'),
    import('../src/lib/accountability-summary-service.ts'),
]);
const sql = getDatabase();

test('primary accountability service reads/writes use owner-scoped transactional schema', async () => {
    const ownerId = 'pglite-service-owner';
    await sql`INSERT INTO "user" (id) VALUES (${ownerId})`;
    const date = accountability.getTodayActivityDate();
    const source = { kind: 'admin', id: 'test-admin' };

    const firstHabit = await accountability.recordHabitUpdate(ownerId, source, 'habit-1', {
        habitKey: 'video_content', activityDate: date, status: 'complete',
        activity: 'Example task recorded',
    });
    const duplicateHabit = await accountability.recordHabitUpdate(ownerId, source, 'habit-1', {
        habitKey: 'video_content', activityDate: date, status: 'complete',
        activity: 'Example task recorded',
    });
    assert.equal(firstHabit.duplicate, false);
    assert.equal(duplicateHabit.duplicate, true);
    const progress = await accountability.getProgress(ownerId, date, date);
    assert.equal(progress.habits.length, 1);
    assert.equal(progress.habits[0].status, 'complete');

    assert.deepEqual(progress.noFapDays, []);

    const checkIns = await accountability.getCheckIns(ownerId, date, date);
    assert.equal(checkIns.slots.length, 4);
    const answered = await accountability.answerCheckIn(
        ownerId, source, 'checkin-1', date, 'slot_0600', 'Example update received.',
    );
    assert.equal(answered.slot.status, 'answered');
    const checkInsAfterAnswer = await accountability.getCheckIns(ownerId, date, date);
    assert.equal(checkInsAfterAnswer.slots.find((slot) => slot.slotId === 'slot_0600')?.reminderStatus, 'suppressed');

    const weightEntries = await accountability.getWeightEntries(ownerId, date, date, { includeEvidenceAssetIds: true });
    assert.deepEqual(weightEntries.entries, []);

    const draft = await summaries.createSummaryDraft(ownerId, date);
    const logicalDraftId = draft.draft.draftId;
    const edited = await summaries.editSummaryDraft(
        ownerId, logicalDraftId, draft.draft.revisionNumber,
        `Daily Summary ${date} IST`, 'Example daily report.\n\nposted by Example Assistant',
    );
    const approval = await summaries.approveSummaryRevision(ownerId, logicalDraftId, edited.draft.revisionNumber, []);
    const summaryStatus = await summaries.getSummaryStatus(ownerId);
    assert.equal(summaryStatus.drafts[0]?.revisionNumber, edited.draft.revisionNumber);
    assert.equal(summaryStatus.approvals[0]?.isCurrent, true);

    const publication = await summaries.publishSummaryApproval({
        id: ownerId, email: 'owner@example.invalid', name: 'Integration Test',
    }, approval.approvalId);
    assert.equal(publication.duplicate, false);
    const retry = await summaries.publishSummaryApproval({
        id: ownerId, email: 'owner@example.invalid', name: 'Integration Test',
    }, approval.approvalId);
    assert.equal(retry.duplicate, true);
});

test('only the admin can confirm or change an image-derived reading', async () => {
    const ownerId = 'image-confirmation-owner';
    await sql`INSERT INTO "user" (id) VALUES (${ownerId})`;
    const date = accountability.getTodayActivityDate();
    const assetId = randomUUID();
    await sql`
        INSERT INTO accountability_media_assets (
            id, owner_id, local_date, category, storage_provider, object_key,
            content_type, byte_size, status, content_sha256, uploaded_at
        ) VALUES (
            ${assetId}, ${ownerId}, ${date}::date, 'general', 'r2', ${`test/${assetId}.png`},
            'image/png', 100, 'ready', ${Buffer.alloc(32)}, NOW()
        )
    `;
    const mcp = { kind: 'mcp', id: 'test-client' };
    const admin = { kind: 'admin', id: ownerId };
    const candidate = await accountability.createWeightEntry(ownerId, mcp, 'image-candidate', {
        activityDate: date, originalValue: 80, originalUnit: 'kg', source: 'image',
        confirmationStatus: 'pending', evidenceAssetIds: [assetId], isPrimary: false,
    });
    const id = candidate.entry.id;
    await assert.rejects(
        accountability.correctWeightEntry(ownerId, mcp, 'image-confirm', {
            id, confirmationStatus: 'confirmed', isPrimary: true,
        }),
        /admin dashboard/,
    );
    assert.equal((await accountability.getWeightEntries(ownerId, date, date)).entries[0].confirmationStatus, 'pending');
    // The rejected attempt rolls back its idempotency reservation too.
    await assert.rejects(
        accountability.correctWeightEntry(ownerId, mcp, 'image-confirm', {
            id, confirmationStatus: 'confirmed', isPrimary: true,
        }),
        /admin dashboard/,
    );
    const confirmed = await accountability.correctWeightEntry(ownerId, admin, 'owner-confirm', {
        id, confirmationStatus: 'confirmed', isPrimary: true,
    });
    assert.equal(confirmed.entry.confirmationStatus, 'confirmed');
    assert.equal(confirmed.entry.isPrimary, true);
    await assert.rejects(
        accountability.correctWeightEntry(ownerId, mcp, 'alter-reviewed-image', { id, originalValue: 90 }),
        /admin dashboard/,
    );
    assert.equal((await accountability.getWeightEntries(ownerId, date, date)).latest.weightKg, 80);
    const manual = await accountability.createWeightEntry(ownerId, mcp, 'manual-weight', {
        activityDate: date, originalValue: 81, originalUnit: 'kg', source: 'manual',
    });
    const corrected = await accountability.correctWeightEntry(ownerId, mcp, 'correct-manual', {
        id: manual.entry.id, originalValue: 82,
    });
    assert.equal(corrected.entry.weightKg, 82);
});

test('weight corrections can move primary entries between dates', async () => {
    const ownerId = 'weight-date-owner';
    await sql`INSERT INTO "user" (id) VALUES (${ownerId})`;
    const source = { kind: 'admin', id: ownerId };
    const date = accountability.getTodayActivityDate();
    const yesterday = accountability.shiftActivityDate(date, -1);
    const first = await accountability.createWeightEntry(ownerId, source, 'first-primary', {
        activityDate: yesterday, originalValue: 80, originalUnit: 'kg', isPrimary: true,
    });
    await accountability.createWeightEntry(ownerId, source, 'second-primary', {
        activityDate: date, originalValue: 81, originalUnit: 'kg', isPrimary: true,
    });
    await accountability.correctWeightEntry(ownerId, source, 'move-primary', {
        id: first.entry.id, activityDate: date, measuredAt: `${date}T08:00:00+05:30`,
    });
    const readings = await accountability.getWeightEntries(ownerId, yesterday, date);
    assert.equal(readings.primaryMeasurements.length, 1);
    assert.equal(readings.latest.id, first.entry.id);
    assert.deepEqual(readings.missingDates, [yesterday]);
});

test.after(async () => {
    await sql.end({ timeout: 1 });
    await socketServer.stop();
    await database.close();
});
