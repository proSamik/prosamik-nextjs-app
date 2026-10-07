import { z } from 'zod';
import { ActivityDateSchema, CheckInSlotIdSchema } from './accountability-contract.ts';

export function isReminderDeliveryEnabled(value = process.env.ACCOUNTABILITY_REMINDER_DELIVERY_ENABLED): boolean {
    return value === 'true';
}

export const ClaimCheckInReminderMcpInputSchema = z.object({
    activityDate: ActivityDateSchema,
    slotId: CheckInSlotIdSchema,
    provider: z.enum(['in_app', 'email', 'push']),
}).strict();

export const PreflightCheckInReminderMcpInputSchema = z.object({
    deliveryId: z.string().uuid(),
    claimToken: z.string().uuid(),
}).strict();

export const RecordCheckInReminderDeliveryMcpInputSchema = z.object({
    deliveryId: z.string().uuid(),
    claimToken: z.string().uuid(),
    outcome: z.enum(['sent', 'failed']),
    providerDeliveryId: z.string().trim().min(1).max(255).regex(/^[\x21-\x7E]+$/).optional(),
    errorCode: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict().superRefine((value, context) => {
    if (value.outcome === 'sent' && !value.providerDeliveryId) {
        context.addIssue({ code: 'custom', path: ['providerDeliveryId'], message: 'A provider delivery ID is required for a sent result.' });
    }
    if (value.outcome === 'failed' && !value.errorCode) {
        context.addIssue({ code: 'custom', path: ['errorCode'], message: 'A provider error code is required for a failed result.' });
    }
});

export const ListPrivateMediaMcpInputSchema = z.object({
    fromDate: ActivityDateSchema.optional(),
    toDate: ActivityDateSchema.optional(),
    pageSize: z.number().int().min(1).max(100).default(25),
    cursor: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();

export const RecordWeightEntryMcpInputSchema = z.object({
    activityDate: ActivityDateSchema,
    measuredAt: z.string().datetime({ offset: true }).optional(),
    originalValue: z.number().positive().max(1000),
    originalUnit: z.enum(['kg', 'lb', 'st']),
    notes: z.string().trim().max(2000).nullable().optional(),
    source: z.enum(['manual', 'imported', 'device', 'image']).default('manual'),
    confirmationStatus: z.enum(['pending', 'confirmed', 'rejected']).default('confirmed'),
    isPrimary: z.boolean().default(false),
    evidenceAssetIds: z.array(z.string().uuid()).max(5).default([]),
    idempotencyKey: z.string().trim().min(1).max(180),
}).strict().superRefine((value, context) => {
    if (value.source === 'image' && value.evidenceAssetIds.length === 0) {
        context.addIssue({ code: 'custom', path: ['evidenceAssetIds'], message: 'Image-derived readings need a private source image.' });
    }
    if (value.source === 'image' && (value.confirmationStatus !== 'pending' || value.isPrimary)) {
        context.addIssue({ code: 'custom', path: ['confirmationStatus'], message: 'Image-derived readings stay pending and cannot be primary until owner confirmation.' });
    }
    if (value.source !== 'image' && value.evidenceAssetIds.length > 0) {
        context.addIssue({ code: 'custom', path: ['evidenceAssetIds'], message: 'Source images are only valid for image-derived readings.' });
    }
});
