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
for (const migration of ['0001_random_thoughts.sql', '0002_accountability.sql']) {
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

test.after(async () => {
    await sql.end({ timeout: 1 });
    await socketServer.stop();
    await database.close();
});
