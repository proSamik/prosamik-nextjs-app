import { z } from 'zod';
import { HABITS, CHECK_IN_SLOTS } from './accountability-constants.ts';

export const ActivityDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const HabitKeySchema = z.enum(
    HABITS.map((habit) => habit.key) as [
        (typeof HABITS)[number]['key'],
        ...(typeof HABITS)[number]['key'][],
    ],
);
export const HabitStatusSchema = z.enum(['complete', 'incomplete', 'unknown']);
export const CheckInSlotIdSchema = z.enum(
    CHECK_IN_SLOTS.map((slot) => slot.id) as [
        (typeof CHECK_IN_SLOTS)[number]['id'],
        ...(typeof CHECK_IN_SLOTS)[number]['id'][],
    ],
);
export const ACCOUNTABILITY_SCOPES = [
    'content:read',
    'progress:read',
    'progress:write',
    'check-ins:read',
    'check-ins:write',
    'media:read',
    'media:write',
    'summaries:write',
    'summaries:publish',
    'food:read',
    'food:write',
] as const;

export const HabitUpdateRequestSchema = z
    .object({
        type: z.literal('habit'),
        habitKey: HabitKeySchema,
        activityDate: ActivityDateSchema,
        status: HabitStatusSchema,
        activity: z.string().trim().max(200).nullable().optional(),
        durationMinutes: z
            .number()
            .int()
            .min(0)
            .max(1440)
            .nullable()
            .optional(),
        outreachCount: z.number().int().min(0).max(999).nullable().optional(),
        outreachChannel: z
            .enum(['email', 'linkedin', 'phone', 'in_person', 'other'])
            .nullable()
            .optional(),
        emailDraftedCount: z
            .number()
            .int()
            .min(0)
            .max(10000)
            .nullable()
            .optional(),
        emailSentCount: z
            .number()
            .int()
            .min(0)
            .max(10000)
            .nullable()
            .optional(),
        videoStage: z
            .enum([
                'idea',
                'planned',
                'scripted',
                'recorded',
                'edited',
                'published',
            ])
            .nullable()
            .optional(),
        notes: z.string().trim().max(4000).nullable().optional(),
    })
    .strict()
    .superRefine((value, context) => {
        if ((value.outreachCount ?? 0) > 0 && !value.outreachChannel) {
            context.addIssue({
                code: 'custom',
                path: ['outreachChannel'],
                message: 'Choose an outreach channel when recording outreach.',
            });
        }
    });

export const NoFapUpdateRequestSchema = z
    .object({
        type: z.literal('no-fap'),
        activityDate: ActivityDateSchema,
        status: z.enum(['success', 'relapse', 'not_tracked']),
    })
    .strict();

export const CheckInAnswerRequestSchema = z
    .object({
        activityDate: ActivityDateSchema,
        slotId: CheckInSlotIdSchema,
        response: z.string().trim().min(1).max(4000),
    })
    .strict();

export const WeightEntryRequestSchema = z
    .object({
        activityDate: ActivityDateSchema,
        measuredAt: z.string().datetime({ offset: true }).optional(),
        originalValue: z.number().positive().max(1000),
        originalUnit: z.enum(['kg', 'lb', 'st']),
        notes: z.string().trim().max(2000).nullable().optional(),
        source: z
            .enum(['manual', 'imported', 'device', 'image'])
            .default('manual'),
        confirmationStatus: z
            .enum(['pending', 'confirmed', 'rejected'])
            .default('confirmed'),
        isPrimary: z.boolean().default(false),
        evidenceAssetIds: z.array(z.string().uuid()).max(5).default([]),
    })
    .strict()
    .superRefine((value, context) => {
        if (value.source === 'image' && value.evidenceAssetIds.length === 0) {
            context.addIssue({
                code: 'custom',
                path: ['evidenceAssetIds'],
                message:
                    'Image-derived readings require a private source image.',
            });
        }
        if (
            value.source === 'image' &&
            value.confirmationStatus !== 'pending'
        ) {
            context.addIssue({
                code: 'custom',
                path: ['confirmationStatus'],
                message:
                    'Image-derived readings must remain pending owner confirmation.',
            });
        }
        if (value.source !== 'image' && value.evidenceAssetIds.length > 0) {
            context.addIssue({
                code: 'custom',
                path: ['evidenceAssetIds'],
                message:
                    'Source images are only valid for image-derived readings.',
            });
        }
    });
// Image-derived readings are provenance-backed candidates. They remain pending
// until the owner confirms the transcribed number and unit in the admin UI.

export const WeightEntryCorrectRequestSchema = z
    .object({
        id: z.string().uuid(),
        activityDate: ActivityDateSchema.optional(),
        measuredAt: z.string().datetime({ offset: true }).optional(),
        originalValue: z.number().positive().max(1000).optional(),
        originalUnit: z.enum(['kg', 'lb', 'st']).optional(),
        notes: z.string().trim().max(2000).nullable().optional(),
        confirmationStatus: z
            .enum(['pending', 'confirmed', 'rejected'])
            .optional(),
        isPrimary: z.boolean().optional(),
    })
    .strict()
    .refine(
        (value) => Object.keys(value).length > 1,
        'Provide a measurement correction.',
    );

export const SummaryCreateRequestSchema = z
    .object({
        activityDate: ActivityDateSchema,
    })
    .strict();

export const SummaryEditRequestSchema = z
    .object({
        draftId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        body: z.string().max(50000),
    })
    .strict();

export const SummaryApproveRequestSchema = z
    .object({
        draftId: z.string().uuid(),
        revisionNumber: z.number().int().positive(),
    })
    .strict();

export const SummaryPublishRequestSchema = z
    .object({
        approvalId: z.string().uuid(),
    })
    .strict();

export const ApiKeyCreateRequestSchema = z
    .object({
        label: z.string().trim().min(1).max(80),
        scopes: z
            .array(z.enum(ACCOUNTABILITY_SCOPES))
            .min(1)
            .max(ACCOUNTABILITY_SCOPES.length),
        expiresInDays: z.number().int().min(1).max(365).optional(),
        expiresInMinutes: z.number().int().min(1).max(525600).optional(),
        expiresAt: z.string().datetime({ offset: true }).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (
            [
                value.expiresInDays,
                value.expiresInMinutes,
                value.expiresAt,
            ].filter((v) => v !== undefined).length > 1
        )
            ctx.addIssue({
                code: 'custom',
                message: 'Choose one expiration setting.',
            });
    })
    .transform((value) =>
        value.expiresInDays === undefined &&
        value.expiresInMinutes === undefined &&
        value.expiresAt === undefined
            ? { ...value, expiresInDays: 90 }
            : value,
    );

export const ApiKeyRevokeRequestSchema = z
    .object({ id: z.string().uuid() })
    .strict();
export const ApiEnvelopeSchema = z.object({ data: z.unknown() }).strict();

export type HabitUpdateRequest = z.infer<typeof HabitUpdateRequestSchema>;
export type NoFapUpdateRequest = z.infer<typeof NoFapUpdateRequestSchema>;
export type CheckInAnswerRequest = z.infer<typeof CheckInAnswerRequestSchema>;
export type WeightEntryRequest = z.infer<typeof WeightEntryRequestSchema>;
export type WeightEntryCorrectRequest = z.infer<
    typeof WeightEntryCorrectRequestSchema
>;
export type SummaryCreateRequest = z.infer<typeof SummaryCreateRequestSchema>;
export type SummaryEditRequest = z.infer<typeof SummaryEditRequestSchema>;
export type SummaryApproveRequest = z.infer<typeof SummaryApproveRequestSchema>;
export type SummaryPublishRequest = z.infer<typeof SummaryPublishRequestSchema>;
export type ApiKeyCreateRequest = z.infer<typeof ApiKeyCreateRequestSchema>;

export const FoodEntryRequestSchema = z
    .object({
        activityDate: ActivityDateSchema,
        consumedAt: z.string().datetime({ offset: true }).optional(),
        item: z.string().trim().min(1).max(200),
        portion: z.string().trim().max(200).nullable().optional(),
        calories: z.number().min(0).max(20000).nullable().default(null),
        calorieSource: z
            .enum(['estimated', 'label', 'measured', 'unknown'])
            .default('estimated'),
        notes: z.string().trim().max(2000).nullable().optional(),
        evidenceAssetIds: z.array(z.string().uuid()).max(5).default([]),
    })
    .strict()
    .superRefine((value, ctx) => {
        if (value.calories !== null && value.calorieSource === 'unknown')
            ctx.addIssue({
                code: 'custom',
                path: ['calorieSource'],
                message: 'Choose a source for known calories.',
            });
    });
export const FoodEntryCorrectRequestSchema = FoodEntryRequestSchema.extend({
    id: z.string().uuid(),
});
