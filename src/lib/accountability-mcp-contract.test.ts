import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ClaimCheckInReminderMcpInputSchema,
    isReminderDeliveryEnabled,
    ListPrivateMediaMcpInputSchema,
    PreflightCheckInReminderMcpInputSchema,
    RecordCheckInReminderDeliveryMcpInputSchema,
    RecordWeightEntryMcpInputSchema,
    SummaryStatusMcpInputSchema,
} from './accountability-mcp-contract.ts';

test('summary reads support a selected date without accepting another owner', () => {
    assert.deepEqual(SummaryStatusMcpInputSchema.parse({}), {});
    assert.deepEqual(SummaryStatusMcpInputSchema.parse({ activityDate: '2026-10-07' }), { activityDate: '2026-10-07' });
    assert.equal(SummaryStatusMcpInputSchema.safeParse({ activityDate: '07/10/2026' }).success, false);
    assert.equal(SummaryStatusMcpInputSchema.safeParse({ ownerId: 'another-user' }).success, false);
});

test('reminder claim and preflight gate is fail-closed unless explicitly enabled', () => {
    assert.equal(isReminderDeliveryEnabled(undefined), false);
    assert.equal(isReminderDeliveryEnabled('false'), false);
    assert.equal(isReminderDeliveryEnabled('TRUE'), false);
    assert.equal(isReminderDeliveryEnabled('true'), true);
});

test('claim input accepts only a bounded owner-slot-date-provider selection', () => {
    assert.equal(ClaimCheckInReminderMcpInputSchema.safeParse({
        activityDate: '2026-10-07', slotId: 'slot_1200', provider: 'email',
    }).success, true);
    assert.equal(ClaimCheckInReminderMcpInputSchema.safeParse({
        activityDate: '2026-10-07', slotId: 'slot_1200', provider: 'webhook',
    }).success, false);
    assert.equal(ClaimCheckInReminderMcpInputSchema.safeParse({
        activityDate: '2026-10-07', slotId: 'slot_1200', provider: 'email', ownerId: 'another-user',
    }).success, false);
});

test('preflight requires UUID delivery and claim identifiers, never a client owner ID', () => {
    const value = {
        deliveryId: '11111111-1111-4111-8111-111111111111',
        claimToken: '22222222-2222-4222-8222-222222222222',
    };
    assert.equal(PreflightCheckInReminderMcpInputSchema.safeParse(value).success, true);
    assert.equal(PreflightCheckInReminderMcpInputSchema.safeParse({ ...value, claimToken: 'not-a-token' }).success, false);
    assert.equal(PreflightCheckInReminderMcpInputSchema.safeParse({ ...value, ownerId: 'another-user' }).success, false);
});

test('delivery result records only sent or failed outcomes with required provider evidence', () => {
    const identity = {
        deliveryId: '11111111-1111-4111-8111-111111111111',
        claimToken: '22222222-2222-4222-8222-222222222222',
    };
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'sent', providerDeliveryId: 'provider-msg-8',
    }).success, true);
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'sent',
    }).success, false);
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'failed', errorCode: 'PROVIDER_TIMEOUT',
    }).success, true);
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'failed',
    }).success, false);
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'cancelled',
    }).success, false);
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'sent', providerDeliveryId: 'x'.repeat(256),
    }).success, false);
    assert.equal(RecordCheckInReminderDeliveryMcpInputSchema.safeParse({
        ...identity, outcome: 'failed', errorCode: 'provider timeout',
    }).success, false);
});

test('private media listing accepts bounded pages and rejects owner-supplied filters', () => {
    assert.equal(ListPrivateMediaMcpInputSchema.safeParse({}).success, true);
    assert.equal(ListPrivateMediaMcpInputSchema.safeParse({ pageSize: 100, fromDate: '2026-01-01', toDate: '2026-12-31' }).success, true);
    assert.equal(ListPrivateMediaMcpInputSchema.safeParse({ pageSize: 101 }).success, false);
    assert.equal(ListPrivateMediaMcpInputSchema.safeParse({ pageSize: 0 }).success, false);
    assert.equal(ListPrivateMediaMcpInputSchema.safeParse({ cursor: 'not base64!' }).success, false);
    assert.equal(ListPrivateMediaMcpInputSchema.safeParse({ ownerId: 'another-user' }).success, false);
});

test('image-derived MCP weight entries require a private evidence ID and remain pending', () => {
    const imageEvidence = '1a5f004a-24c4-4bc4-a0d1-64f3a8fc22c6';
    const base = {
        activityDate: '2026-10-07', originalValue: 70, originalUnit: 'kg',
        source: 'image', confirmationStatus: 'pending', evidenceAssetIds: [imageEvidence],
        isPrimary: false, idempotencyKey: 'weight-image-1',
    };
    assert.equal(RecordWeightEntryMcpInputSchema.safeParse(base).success, true);
    assert.equal(RecordWeightEntryMcpInputSchema.safeParse({ ...base, evidenceAssetIds: [] }).success, false);
    assert.equal(RecordWeightEntryMcpInputSchema.safeParse({ ...base, confirmationStatus: 'confirmed' }).success, false);
    assert.equal(RecordWeightEntryMcpInputSchema.safeParse({ ...base, ownerId: 'another-user' }).success, false);
});
