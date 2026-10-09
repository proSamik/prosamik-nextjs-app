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
for (const migration of ['0001_random_thoughts.sql', '0002_accountability.sql', '0003_auth_account_issuer_compatibility.sql', '0004_food_log.sql', '0005_mcp_access_logs.sql']) {
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
process.env.DATABASE_POOL_MAX = '1';
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
    assert.equal(summaryStatus.drafts[0]?.state, 'approved');
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
    const ownerId = 'ImageConfirmationOwnerABc123';
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
    const editedConfirmed = await accountability.correctWeightEntry(ownerId, admin, 'edit-approved', {
        id, originalValue: 80.2, originalUnit: 'kg', notes: 'Owner corrected the confirmed value.',
    });
    assert.equal(editedConfirmed.entry.weightKg, 80.2);
    assert.equal(editedConfirmed.entry.confirmationStatus, 'confirmed');
    assert.equal(editedConfirmed.entry.isPrimary, true);
    await assert.rejects(
        accountability.correctWeightEntry(ownerId, mcp, 'alter-reviewed-image', { id, originalValue: 90 }),
        /admin dashboard/,
    );
    assert.equal((await accountability.getWeightEntries(ownerId, date, date)).latest.weightKg, 80.2);
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

test('weight tracker supports older records without expanding a missing-day calendar', async () => {
    const ownerId = 'weight-history-owner';
    await sql`INSERT INTO "user" (id) VALUES (${ownerId})`;
    const date = accountability.getTodayActivityDate();
    const older = accountability.shiftActivityDate(date, -400);
    await accountability.createWeightEntry(ownerId, { kind: 'admin', id: ownerId }, 'older-reading', {
        activityDate: older, originalValue: 81, originalUnit: 'kg', isPrimary: true,
    });
    const tracker = await accountability.getWeightEntries(ownerId, older, date, { includeMissingDates: false });
    assert.equal(tracker.entries.length, 1);
    assert.equal(tracker.entries[0].date, older);
    assert.deepEqual(tracker.missingDates, []);
    await assert.rejects(accountability.getWeightEntries(ownerId, older, date), /limited to one year/);
});

test('week check-ins are initialized in bulk and preserve responses on repeated reads', async () => {
    const ownerId = 'BulkCheckInOwner';
    await sql`INSERT INTO "user" (id) VALUES (${ownerId})`;
    const date = accountability.getTodayActivityDate();
    const firstDate = accountability.shiftActivityDate(date, -6);
    const initial = await accountability.getCheckIns(ownerId, firstDate, date);
    assert.equal(initial.slots.length, 28);
    await accountability.answerCheckIn(ownerId, { kind: 'admin', id: ownerId }, 'bulk-answer', date, 'slot_0600', 'Keep this answer.');
    const again = await accountability.getCheckIns(ownerId, firstDate, date);
    assert.equal(again.slots.length, 28);
    const answer = again.slots.find(slot => slot.date === date && slot.slotId === 'slot_0600');
    assert.equal(answer.response, 'Keep this answer.');
    assert.equal(answer.reminderStatus, 'suppressed');
    const reminders = await sql`SELECT count(*)::int AS count FROM accountability_reminders WHERE owner_id = ${ownerId}`;
    assert.equal(reminders[0].count, 4);
});

test('batch media links are bounded, verified, and owner scoped', async () => {
    process.env.SECURE_BUCKET = 'private-test-bucket';
    process.env.R2_BUCKET_NAME = 'public-test-bucket';
    process.env.R2_ENDPOINT = 'https://storage.example.invalid';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
    const { createAccountabilityMediaReadUrls } = await import('../src/lib/accountability-media.ts');
    const owner = 'buffer-owner';
    const other = 'buffer-other-owner';
    await sql`INSERT INTO "user" (id) VALUES (${owner}), (${other})`;
    const assets = [randomUUID(), randomUUID(), randomUUID()];
    const date = accountability.getTodayActivityDate();
    for (let i = 0; i < assets.length; i++) {
        await sql`INSERT INTO accountability_media_assets (
            id, owner_id, local_date, category, storage_provider, object_key,
            content_type, byte_size, status, content_sha256, uploaded_at
        ) VALUES (${assets[i]}, ${i === 2 ? other : owner}, ${date}::date, 'body', 'r2',
            ${`accountability/private/v1/${assets[i]}/original.png`}, 'image/png', 100, 'ready', ${Buffer.alloc(32)}, NOW())`;
    }
    const links = await createAccountabilityMediaReadUrls(owner, assets);
    assert.equal(links.length, 2);
    assert.ok(links.every(link => link.id !== assets[2]));
    assert.ok(links.every(link => link.expiresInSeconds === 300 && new URL(link.url).hostname === 'storage.example.invalid'));
    await assert.rejects(createAccountabilityMediaReadUrls(owner, []), /one and eight/);
    await assert.rejects(createAccountabilityMediaReadUrls(owner, Array(9).fill(assets[0])), /one and eight/);
    await sql`UPDATE accountability_media_assets SET content_sha256 = NULL WHERE id = ${assets[0]}`;
    await assert.rejects(createAccountabilityMediaReadUrls(owner, [assets[0]]), /content verification/);
});

test('food log is owner scoped, retry safe, editable and preserves unknown calories', async () => {
    const {getFoodEntries,saveFoodEntry}=await import('../src/lib/accountability-food.ts');
    const owner='FoodOwnerABc'; const other='FoodOtherOwner';
    await sql`INSERT INTO "user"(id) VALUES (${owner}),(${other})`;
    const date=accountability.getTodayActivityDate();const source={kind:'mcp',id:'food-test'};
    const meal={activityDate:date,item:'Rice and vegetables',portion:'1 bowl',calories:550,calorieSource:'estimated'};
    const created=await saveFoodEntry(owner,source,'food-create',meal);
    const retried=await saveFoodEntry(owner,source,'food-create',meal);
    assert.equal(retried.id,created.id);assert.equal(retried.duplicate,true);
    await assert.rejects(saveFoodEntry(owner,source,'food-create',{...meal,calories:600}),/IDEMPOTENCY_CONFLICT/);
    await saveFoodEntry(owner,source,'food-unknown',{activityDate:date,item:'Fruit'});
    const initial=await getFoodEntries(owner,date,date,true);
    assert.equal(initial.entries.length,2);assert.equal(initial.days[0].calories,550);assert.equal(initial.days[0].unknownCalories,1);
    assert.equal((await getFoodEntries(other,date,date,true)).entries.length,0);
    await assert.rejects(saveFoodEntry(other,source,'cross-owner',{...meal,id:created.id}),/not found/);
    const image=randomUUID();
    await sql`INSERT INTO accountability_media_assets(id,owner_id,local_date,category,storage_provider,object_key,content_type,byte_size,status,content_sha256,uploaded_at) VALUES (${image},${owner},${date}::date,'general','r2',${`test/${image}.png`},'image/png',100,'ready',${Buffer.alloc(32)},NOW())`;
    await saveFoodEntry(owner,source,'food-edit',{...meal,id:created.id,calories:625,evidenceAssetIds:[image]});
    const changed=await getFoodEntries(owner,date,date,true);
    assert.equal(changed.days[0].calories,625);assert.deepEqual(changed.entries.find(entry=>entry.id===created.id).evidenceAssetIds,[image]);
    assert.ok(!(await getFoodEntries(owner,date,date)).entries[0].evidenceAssetIds);
    await assert.rejects(saveFoodEntry(other,source,'foreign-image',{...meal,evidenceAssetIds:[image]}),/owned/);
    await assert.rejects(saveFoodEntry(owner,source,'food-future',{...meal,activityDate:accountability.shiftActivityDate(date,1)}),/future/);
    await assert.rejects(saveFoodEntry(owner,source,'bad-time',{...meal,consumedAt:`${accountability.shiftActivityDate(date,-1)}T12:00:00+05:30`}),/meal time/);
});

test('summary status filters every dashboard collection to the selected day and owner', async () => {
    const owner = 'summary-filter-owner';
    await sql`INSERT INTO "user"(id) VALUES(${owner})`;
    const today=accountability.getTodayActivityDate();
    const yesterday=accountability.shiftActivityDate(today,-1);
    const prior=await summaries.createSummaryDraft(owner,yesterday);
    const current=await summaries.createSummaryDraft(owner,today);
    const all=await summaries.getSummaryStatus(owner);
    assert.equal(all.drafts.length,2);
    const selected=await summaries.getSummaryStatus(owner,today);
    assert.equal(selected.drafts.length,1);
    assert.equal(selected.drafts[0].activityDate,today);
    assert.ok(selected.revisions.every(revision=>revision.activityDate===today));
    assert.ok(selected.history.every(event=>event.activityDate===today));
    assert.notEqual(prior.draft.id,current.draft.id);
});

test('delegated summary approvals track exact revisions and preserve owner boundaries', async () => {
    const owner = 'summary-delegation-owner';
    const otherOwner = 'summary-delegation-other';
    await sql`INSERT INTO "user"(id) VALUES(${owner}), (${otherOwner})`;
    const today = accountability.getTodayActivityDate();
    const initial = await summaries.createSummaryDraft(owner, today);
    const draftId = initial.draft.draftId;
    const edited = await summaries.editSummaryDraft(
        owner, draftId, initial.draft.revisionNumber,
        `Daily Summary ${today} IST`, 'Reviewed daily summary for approval in chat.',
    );
    const firstApproval = await summaries.approveSummaryRevision(owner, draftId, edited.draft.revisionNumber, []);
    const approved = await summaries.getSummaryStatus(owner, today);
    assert.equal(approved.drafts[0].state, 'approved');
    assert.equal(approved.drafts[0].approvalId, firstApproval.approvalId);
    assert.equal(approved.approvals[0].bodySnapshot, edited.draft.body);
    assert.equal(approved.approvals[0].isCurrent, true);
    assert.equal(approved.publications.length, 0);
    const duplicate = await summaries.approveSummaryRevision(owner, draftId, edited.draft.revisionNumber, []);
    assert.equal(duplicate.approvalId, firstApproval.approvalId);
    assert.equal(duplicate.duplicate, true);

    const revised = await summaries.editSummaryDraft(
        owner, draftId, edited.draft.revisionNumber,
        edited.draft.title, 'Updated summary with the owner requested correction.',
    );
    const pending = await summaries.getSummaryStatus(owner, today);
    assert.equal(pending.drafts[0].state, 'draft');
    assert.equal(pending.drafts[0].approvalId, null);
    assert.equal(pending.approvals[0].isCurrent, false);
    assert.equal(pending.approvals[0].bodySnapshot, firstApproval.body);
    await assert.rejects(
        summaries.approveSummaryRevision(owner, draftId, edited.draft.revisionNumber, []),
        /SUMMARY_REVISION_CONFLICT/,
    );
    await assert.rejects(
        summaries.approveSummaryRevision(otherOwner, draftId, revised.draft.revisionNumber, []),
        /SUMMARY_DRAFT_NOT_FOUND/,
    );
    await assert.rejects(
        summaries.editSummaryDraft(otherOwner, draftId, revised.draft.revisionNumber, revised.draft.title, 'Wrong owner'),
        /SUMMARY_DRAFT_NOT_FOUND/,
    );
    const privateRead = await summaries.getSummaryStatus(otherOwner, today);
    for (const collection of Object.values(privateRead)) assert.equal(collection.length, 0);

    const secondApproval = await summaries.approveSummaryRevision(owner, draftId, revised.draft.revisionNumber, []);
    assert.notEqual(secondApproval.approvalId, firstApproval.approvalId);
    const final = await summaries.getSummaryStatus(owner, today);
    assert.equal(final.drafts[0].state, 'approved');
    assert.equal(final.drafts[0].body, revised.draft.body);
    assert.equal(final.approvals.filter(approval => approval.isCurrent).length, 1);
    assert.equal(final.publications.length, 0);
});

test.after(async () => {
    await sql.end({ timeout: 1 });
    await socketServer.stop();
    await database.close();
});
