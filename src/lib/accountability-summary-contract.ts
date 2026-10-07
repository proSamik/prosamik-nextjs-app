import { z } from 'zod';
import {
    SummaryApproveRequestSchema,
    SummaryCreateRequestSchema,
    SummaryEditRequestSchema,
    SummaryPublishRequestSchema,
} from './accountability-contract.ts';

/** A user-selected source plus its server-prepared sanitized WebP derivative. */
export const SummaryPublicMediaSelectionSchema = z.object({
    sourceMediaAssetId: z.string().uuid(),
    approvedMediaAssetId: z.string().uuid(),
}).strict();

const SummaryCreateActionSchema = SummaryCreateRequestSchema.extend({ action: z.literal('create') });
const SummaryEditActionSchema = SummaryEditRequestSchema.extend({
    action: z.literal('edit'),
    revisionNumber: z.number().int().positive(),
});
const SummaryPublicMediaSelectionsSchema = z.array(SummaryPublicMediaSelectionSchema).max(8).superRefine((items, context) => {
    const sources = new Set<string>();
    const derivatives = new Set<string>();
    items.forEach((item, index) => {
        if (item.sourceMediaAssetId === item.approvedMediaAssetId) {
            context.addIssue({ code: 'custom', path: [index], message: 'A sanitized derivative must be a distinct asset.' });
        }
        if (sources.has(item.sourceMediaAssetId) || derivatives.has(item.approvedMediaAssetId)) {
            context.addIssue({ code: 'custom', path: [index], message: 'Each source and derivative can be selected only once.' });
        }
        sources.add(item.sourceMediaAssetId);
        derivatives.add(item.approvedMediaAssetId);
    });
});

const SummaryApproveActionSchema = SummaryApproveRequestSchema.extend({
    action: z.literal('approve'),
    publicMedia: SummaryPublicMediaSelectionsSchema,
});
const SummaryPublishActionSchema = SummaryPublishRequestSchema.extend({ action: z.literal('publish') });

export const SummaryActionRequestSchema = z.discriminatedUnion('action', [
    SummaryCreateActionSchema,
    SummaryEditActionSchema,
    SummaryApproveActionSchema,
    SummaryPublishActionSchema,
]);

export const SummaryMediaListQuerySchema = z.object({
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

export const SummaryMediaPrepareRequestSchema = z.object({
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sourceMediaAssetId: z.string().uuid(),
}).strict();
