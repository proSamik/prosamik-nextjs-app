import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SummaryActionRequestSchema } from '../src/lib/accountability-summary-contract.ts';
import {
    SUMMARY_FOOTER,
    buildDailySummaryDraft,
    normalizeSummaryBody,
    normalizeSummaryTitle,
    reuseOrCreateSummaryDerivative,
    summaryTextSha256,
} from '../src/lib/accountability-summary-domain.ts';

const sourceId = '1a5f004a-24c4-4bc4-a0d1-64f3a8fc22c6';
const derivativeId = '782c6311-8e2c-41fc-a3dd-d7d5c62ed026';
const approvalId = 'd2719cf4-663a-4b2b-aed3-6d6eb993cd34';

test('automatic draft includes only approved public habit labels and exact IST/footer markers', () => {
    const draft = buildDailySummaryDraft('2026-10-07', ['physical_workout', 'no_fap', 'weight', 'body_photo']);
    assert.equal(draft.title, 'Daily Summary — 2026-10-07 IST');
    assert.match(draft.body, /physical workout/);
    assert.equal(draft.body.endsWith(SUMMARY_FOOTER), true);
    assert.equal(/no.?fap|weight|body photo/i.test(`${draft.title}\n${draft.body}`), false);
});

test('summary edits preserve IST date in title and canonical footer at the exact end', () => {
    assert.equal(normalizeSummaryTitle('A good day', '2026-10-07'), 'A good day — 2026-10-07 IST');
    assert.equal(normalizeSummaryTitle('Daily Summary 2026-10-07', '2026-10-07'), 'Daily Summary 2026-10-07 IST');
    assert.equal(normalizeSummaryBody('Good work today  \n'), `Good work today\n\n${SUMMARY_FOOTER}`);
    assert.equal(normalizeSummaryBody(`Good work\n\n${SUMMARY_FOOTER}  `), `Good work\n\n${SUMMARY_FOOTER}`);
    assert.notDeepEqual(summaryTextSha256('Title A', 'Body'), summaryTextSha256('Title B', 'Body'));
});

test('approval requires explicit selected media pairs and rejects extra client-controlled content', () => {
    const base = { action: 'approve', draftId: sourceId, revisionNumber: 2 };
    assert.equal(SummaryActionRequestSchema.safeParse({ ...base, publicMedia: [] }).success, true);
    assert.equal(SummaryActionRequestSchema.safeParse({ ...base, publicMedia: [{ sourceMediaAssetId: sourceId, approvedMediaAssetId: derivativeId }] }).success, true);
    assert.equal(SummaryActionRequestSchema.safeParse(base).success, false, 'an explicit media selection is required, including an explicit empty choice');
    assert.equal(SummaryActionRequestSchema.safeParse({ ...base, publicMedia: [{ sourceMediaAssetId: sourceId, approvedMediaAssetId: sourceId }] }).success, false);
    assert.equal(SummaryActionRequestSchema.safeParse({ ...base, publicMedia: [], approvedText: 'untrusted' }).success, false);
});

test('publish request accepts only a server-side approval ID', () => {
    assert.equal(SummaryActionRequestSchema.safeParse({ action: 'publish', approvalId }).success, true);
    assert.equal(SummaryActionRequestSchema.safeParse({ action: 'publish', approvalId, body: 'client text' }).success, false);
    assert.equal(SummaryActionRequestSchema.safeParse({ action: 'publish', approvalId, ownerId: 'client-owner' }).success, false);
});

test('edit request carries its expected revision to reject stale clients', () => {
    assert.equal(SummaryActionRequestSchema.safeParse({
        action: 'edit', draftId: sourceId, revisionNumber: 1, title: 'Daily 2026-10-07 IST', body: SUMMARY_FOOTER,
    }).success, true);
    assert.equal(SummaryActionRequestSchema.safeParse({
        action: 'edit', draftId: sourceId, title: 'Daily 2026-10-07 IST', body: SUMMARY_FOOTER,
    }).success, false);
});

test('repeated or concurrent derivative preparation reuses the exact winning asset', async () => {
    let stored = null;
    let createdAssets = 0;
    const findExisting = async () => stored;
    const create = async () => {
        await new Promise((resolve) => setImmediate(resolve));
        if (stored) throw new Error('unique owner/source/hash constraint');
        createdAssets += 1;
        stored = { assetId: derivativeId, sourceId };
        return stored;
    };

    const [first, concurrentRetry] = await Promise.all([
        reuseOrCreateSummaryDerivative(findExisting, create),
        reuseOrCreateSummaryDerivative(findExisting, create),
    ]);
    const repeated = await reuseOrCreateSummaryDerivative(findExisting, create);

    assert.equal(first.value.assetId, derivativeId);
    assert.equal(concurrentRetry.value.assetId, derivativeId);
    assert.equal(repeated.value.assetId, derivativeId);
    assert.equal([first, concurrentRetry].filter((result) => result.created).length, 1);
    assert.equal(repeated.created, false);
    assert.equal(createdAssets, 1, 'only one derivative asset/relation is created per exact source hash');
});
