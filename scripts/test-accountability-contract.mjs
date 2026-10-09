import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    ACCOUNTABILITY_SCOPES,
    ApiEnvelopeSchema,
    ApiKeyCreateRequestSchema,
    CheckInAnswerRequestSchema,
    HabitUpdateRequestSchema,
    SummaryPublishRequestSchema,
    WeightEntryRequestSchema,
} from '../src/lib/accountability-contract.ts';

test('progress mutation contract requires exact habit key, activity date and explicit state', () => {
    assert.equal(HabitUpdateRequestSchema.safeParse({
        type: 'habit',
        habitKey: 'email_writing',
        activityDate: '2026-10-07',
        status: 'complete',
        emailDraftedCount: 3,
        emailSentCount: 1,
    }).success, true);
    assert.equal(HabitUpdateRequestSchema.safeParse({
        type: 'habit',
        habitKey: 'email_writing',
        activityDate: '2026-10-07',
        status: 'complete',
        outreachCount: 2,
    }).success, false, 'marketing counts require an explicit channel');
    assert.equal(HabitUpdateRequestSchema.safeParse({
        type: 'habit',
        habitKey: 'email_writing',
        activityDate: '2026-10-07',
        status: 'complete',
        ownerId: 'client-supplied-owner',
    }).success, false, 'client-supplied ownership is rejected');
});

test('check-in response contract requires one explicit slot and bounded response', () => {
    assert.equal(CheckInAnswerRequestSchema.safeParse({
        activityDate: '2026-10-07',
        slotId: 'slot_0600',
        response: 'Nothing done yet',
    }).success, true);
    assert.equal(CheckInAnswerRequestSchema.safeParse({
        activityDate: '2026-10-07',
        slotId: 'slot_0000',
        response: 'Not a configured slot',
    }).success, false);
});

test('weight contract keeps original unit and pending image confirmation explicit', () => {
    const evidenceAssetId = '1a5f004a-24c4-4bc4-a0d1-64f3a8fc22c6';
    const parsed = WeightEntryRequestSchema.safeParse({
        activityDate: '2026-10-07',
        originalValue: 160,
        originalUnit: 'lb',
        source: 'image',
        confirmationStatus: 'pending',
        isPrimary: false,
        evidenceAssetIds: [evidenceAssetId],
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data?.confirmationStatus, 'pending');
    assert.equal(parsed.data?.originalUnit, 'lb');
    assert.equal(WeightEntryRequestSchema.safeParse({
        activityDate: '2026-10-07', originalValue: 160, originalUnit: 'lb',
        source: 'image', confirmationStatus: 'pending',
    }).success, false, 'image-derived candidates need a source image');
    assert.equal(WeightEntryRequestSchema.safeParse({
        activityDate: '2026-10-07', originalValue: 160, originalUnit: 'lb',
        source: 'image', confirmationStatus: 'confirmed', evidenceAssetIds: [evidenceAssetId],
    }).success, false, 'image-derived candidates cannot be auto-confirmed');
});

test('summary publish contract accepts only a server-side approval ID, never client text', () => {
    assert.equal(SummaryPublishRequestSchema.safeParse({ approvalId: 'd2719cf4-663a-4b2b-aed3-6d6eb993cd34' }).success, true);
    assert.equal(SummaryPublishRequestSchema.safeParse({
        approvalId: 'd2719cf4-663a-4b2b-aed3-6d6eb993cd34',
        text: 'client-controlled public content',
        approvedText: 'pretend approval',
    }).success, false);
});

test('API key scope contract uses separate read/write/publish grants and private envelope', () => {
    assert.equal(ACCOUNTABILITY_SCOPES.includes('progress:read'), true);
    assert.equal(ACCOUNTABILITY_SCOPES.includes('progress:write'), true);
    assert.equal(ACCOUNTABILITY_SCOPES.includes('summaries:publish'), true);
    const key = ApiKeyCreateRequestSchema.safeParse({ label: 'Assistant', scopes: ['progress:read'] });
    assert.equal(key.success, true);
    assert.equal(key.data?.expiresInDays, 90);
    assert.equal(ApiEnvelopeSchema.safeParse({ data: [] }).success, true);
    assert.equal(ApiEnvelopeSchema.safeParse({ data: [], ownerId: 'unexpected' }).success, false);
});

test('API keys support precise durations and reject conflicting expiration settings', () => {
    const settings = { label: 'Temporary client', scopes: ['food:read'] };
    assert.equal(ApiKeyCreateRequestSchema.parse({...settings,expiresInMinutes:60}).expiresInMinutes,60);
    assert.equal(ApiKeyCreateRequestSchema.safeParse({...settings,expiresInMinutes:0}).success,false);
    assert.equal(ApiKeyCreateRequestSchema.safeParse({...settings,expiresInMinutes:1.5}).success,false);
    assert.equal(ApiKeyCreateRequestSchema.safeParse({...settings,expiresInMinutes:525601}).success,false);
    assert.equal(ApiKeyCreateRequestSchema.safeParse({...settings,expiresInMinutes:60,expiresInDays:90}).success,false);
    assert.equal(ApiKeyCreateRequestSchema.safeParse({...settings,expiresAt:'2026-10-09T18:00:00+05:30'}).success,true);
});
