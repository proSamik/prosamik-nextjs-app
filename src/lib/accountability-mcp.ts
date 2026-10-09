import {
    FoodEntryRequestSchema,
    FoodEntryCorrectRequestSchema,
} from '@/lib/accountability-contract';
import { getFoodEntries, saveFoodEntry } from '@/lib/accountability-food';
import { readOwnerPrivateImageForPreparation } from '@/lib/accountability-media';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { requireMcpAuth } from '@better-auth/mcp';
import {
    createMcpHandler,
    McpServer,
    requireScopes,
    type AuthInfo,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';
import {
    ActivityDateSchema,
    CheckInAnswerRequestSchema,
    HabitUpdateRequestSchema,
    NoFapUpdateRequestSchema,
    SummaryApproveRequestSchema,
    SummaryCreateRequestSchema,
    SummaryEditRequestSchema,
    SummaryPublishRequestSchema,
    WeightEntryCorrectRequestSchema,
} from '@/lib/accountability-contract';
import {
    SummaryMediaListQuerySchema,
    SummaryMediaPrepareRequestSchema,
    SummaryPublicMediaSelectionSchema,
} from '@/lib/accountability-summary-contract';
import {
    ClaimCheckInReminderMcpInputSchema,
    isReminderDeliveryEnabled,
    ListPrivateMediaMcpInputSchema,
    PreflightCheckInReminderMcpInputSchema,
    RecordWeightEntryMcpInputSchema,
    RecordCheckInReminderDeliveryMcpInputSchema,
    SummaryStatusMcpInputSchema,
} from '@/lib/accountability-mcp-contract';
import { assertActivityDate } from '@/lib/accountability-domain';
import {
    ACCOUNTABILITY_MEDIA_TYPES,
    createAccountabilityMediaReadUrl,
    finalizeAccountabilityMediaUpload,
    initiateAccountabilityMediaUpload,
    listOwnerPrivateMedia,
} from '@/lib/accountability-media';
import {
    answerCheckIn,
    claimCheckInReminder,
    correctWeightEntry,
    createWeightEntry,
    getCheckIns,
    getDueCheckInReminders,
    getProgress,
    getTodayActivityDate,
    getWeightEntries,
    preflightCheckInReminderDelivery,
    recordHabitUpdate,
    recordCheckInReminderDelivery,
    recordNoFapStatus,
    shiftActivityDate,
    type HabitUpdate,
    type WeightEntryInput,
} from '@/lib/accountability-service';
import {
    consumeAccountabilityRateLimit,
    consumePreAuthMcpRateLimit,
} from '@/lib/accountability-rate-limit';
import { getDatabase } from '@/lib/database';
import { listRandomThoughtsPage } from '@/lib/random-thoughts';
import {
    approveSummaryRevision,
    createSummaryDraft,
    editSummaryDraft,
    getSummaryStatus,
    listSummaryMediaSources,
    prepareSummaryMediaDerivative,
    publishSummaryApproval,
} from '@/lib/accountability-summary-service';
import {
    principalFromVerifiedMcpClaims,
    isPersonalApiKeyAuthorization,
    parsePersonalApiKeyAuthorization,
    resolveAccountabilityMcpResourceUrl,
    validateAccountabilityMcpRequest,
    type VerifiedMcpPrincipal,
} from '@/lib/accountability-mcp-security';

const DateRangeInputSchema = z
    .object({
        fromDate: ActivityDateSchema.optional(),
        toDate: ActivityDateSchema.optional(),
    })
    .strict();

const IdempotencyInputSchema = z.string().trim().min(1).max(180);
const ProgressUpdateSchema = z.discriminatedUnion('type', [
    HabitUpdateRequestSchema,
    NoFapUpdateRequestSchema,
]);

const RecordProgressInputSchema = z
    .object({
        update: ProgressUpdateSchema,
        idempotencyKey: IdempotencyInputSchema,
    })
    .strict();

const AnswerCheckInInputSchema = z
    .object({
        answer: CheckInAnswerRequestSchema,
        idempotencyKey: IdempotencyInputSchema,
    })
    .strict();

const WeightCorrectionInputSchema = z
    .object({
        correction: WeightEntryCorrectRequestSchema,
        idempotencyKey: IdempotencyInputSchema,
    })
    .strict();

const MediaUploadInputSchema = z
    .object({
        localDate: ActivityDateSchema,
        category: z.enum(['body', 'habit_evidence', 'general']),
        pose: z
            .enum(['front', 'back', 'left_side', 'right_side', 'other'])
            .nullable()
            .optional(),
        privateNotes: z.string().trim().max(2000).nullable().optional(),
        displayName: z.string().trim().max(255).nullable().optional(),
        contentType: z.enum(ACCOUNTABILITY_MEDIA_TYPES),
        byteSize: z
            .number()
            .int()
            .positive()
            .max(100 * 1024 * 1024),
        idempotencyKey: IdempotencyInputSchema,
    })
    .strict();

const MediaAssetInputSchema = z.object({ assetId: z.string().uuid() }).strict();
const EmptyInputSchema = z.object({}).strict();
const SummaryEditInputSchema = SummaryEditRequestSchema.extend({
    revisionNumber: z.number().int().positive(),
}).strict();
const SummaryApproveInputSchema = SummaryApproveRequestSchema.extend({
    publicMedia: z.array(SummaryPublicMediaSelectionSchema).max(8),
}).strict();
const PublicThoughtsPageInputSchema = z
    .object({
        page: z.number().int().positive().max(10000).default(1),
        pageSize: z.number().int().min(1).max(20).default(5),
    })
    .strict();

function scopedToolResult(data: Record<string, unknown>) {
    return {
        content: [{ type: 'text' as const, text: JSON.stringify(data) }],
        structuredContent: data,
    };
}

function scopedToolError(message: string) {
    return {
        isError: true,
        content: [{ type: 'text' as const, text: message }],
    };
}

function sourceFor(principal: VerifiedMcpPrincipal) {
    return { kind: 'mcp' as const, id: principal.sourceId };
}

function boundedDateRange(
    input: z.infer<typeof DateRangeInputSchema>,
    defaultDays: number,
    maxDays: number,
): {
    fromDate: ReturnType<typeof assertActivityDate>;
    toDate: ReturnType<typeof assertActivityDate>;
} {
    const today = getTodayActivityDate();
    const toDate = input.toDate ? assertActivityDate(input.toDate) : today;
    const fromDate = input.fromDate
        ? assertActivityDate(input.fromDate)
        : shiftActivityDate(toDate, -(defaultDays - 1));
    const earliestAllowed = shiftActivityDate(toDate, -(maxDays - 1));
    if (toDate > today || fromDate > toDate || fromDate < earliestAllowed) {
        throw new RangeError(
            'The requested date range is invalid or exceeds the tool limit.',
        );
    }
    return { fromDate, toDate };
}

function addProgressTools(
    server: McpServer,
    principal: VerifiedMcpPrincipal,
): void {
    server.registerTool(
        'get_progress',
        {
            title: 'Read accountability progress',
            description:
                'Read habit, no-fap and weight progress for a date range of up to 365 days. Dates are IST calendar dates.',
            inputSchema: DateRangeInputSchema,
            scopeChallenge: requireScopes('progress:read'),
        },
        async (input) => {
            try {
                const { fromDate, toDate } = boundedDateRange(input, 30, 365);
                const progress = await getProgress(
                    principal.ownerId,
                    fromDate,
                    toDate,
                );
                return scopedToolResult({
                    fromDate,
                    toDate,
                    habits: progress.habits,
                    // Keep returned rows inside the requested range while retaining
                    // the server-calculated streak summary.
                    habitHistory: progress.habitHistory.filter(
                        (day) => day.date >= fromDate && day.date <= toDate,
                    ),
                    habitStreaks: progress.habitStreaks,
                    noFapDays: progress.noFapDays,
                    noFapWeek: progress.noFapWeek,
                    noFapStreak: progress.noFapStreak,
                    weights: progress.weights,
                });
            } catch {
                return scopedToolError(
                    'Unable to read progress. Check the date range and try again.',
                );
            }
        },
    );

    server.registerTool(
        'record_progress',
        {
            title: 'Record accountability progress',
            description:
                'Record one habit or no-fap status update. Habit context can be supplied as optional free-text notes for that habit and date; no structured activity fields are required. Future dates are not accepted; include a fresh idempotency key for each intended update.',
            inputSchema: RecordProgressInputSchema,
            scopeChallenge: requireScopes('progress:write'),
        },
        async ({ update, idempotencyKey }) => {
            try {
                const activityDate = assertActivityDate(update.activityDate);
                if (activityDate > getTodayActivityDate())
                    return scopedToolError(
                        'Progress cannot be recorded for a future date.',
                    );
                if (update.type === 'habit') {
                    const { type, ...habitUpdate } = update;
                    if (type !== 'habit')
                        return scopedToolError('Invalid progress update.');
                    const data = await recordHabitUpdate(
                        principal.ownerId,
                        sourceFor(principal),
                        idempotencyKey,
                        { ...habitUpdate, activityDate } as HabitUpdate,
                    );
                    return scopedToolResult(data);
                }

                const data = await recordNoFapStatus(
                    principal.ownerId,
                    sourceFor(principal),
                    idempotencyKey,
                    activityDate,
                    update.status,
                );
                return scopedToolResult({ data });
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'IDEMPOTENCY_CONFLICT'
                ) {
                    return scopedToolError(
                        'That idempotency key was already used for a different update.',
                    );
                }
                return scopedToolError(
                    'Unable to record progress. Check the update and try again.',
                );
            }
        },
    );

    server.registerTool(
        'get_weight_entries',
        {
            title: 'Read weight entries',
            description:
                'Read owner-scoped weight measurements for a date range of up to 366 days. Dates are IST calendar dates.',
            inputSchema: DateRangeInputSchema,
            scopeChallenge: requireScopes('progress:read'),
        },
        async (input) => {
            try {
                const { fromDate, toDate } = boundedDateRange(input, 30, 366);
                return scopedToolResult(
                    await getWeightEntries(
                        principal.ownerId,
                        fromDate,
                        toDate,
                        {
                            includeEvidenceAssetIds:
                                principal.scopes.includes('media:read'),
                        },
                    ),
                );
            } catch {
                return scopedToolError(
                    'Unable to read weight entries. Check the date range and try again.',
                );
            }
        },
    );

    server.registerTool(
        'record_weight_entry',
        {
            title: 'Record a weight entry',
            description:
                'Record an owner-scoped measurement. Image-derived readings must include media:read scope, a private still-image asset, and remain pending until owner confirmation.',
            inputSchema: RecordWeightEntryMcpInputSchema,
            scopeChallenge: requireScopes('progress:write'),
        },
        async ({ idempotencyKey, ...input }) => {
            try {
                if (
                    input.source === 'image' &&
                    !principal.scopes.includes('media:read')
                ) {
                    return scopedToolError(
                        'Image-derived weight entries require the separate media:read scope.',
                    );
                }
                const activityDate = assertActivityDate(input.activityDate);
                if (activityDate > getTodayActivityDate())
                    return scopedToolError(
                        'A measurement cannot be recorded for a future date.',
                    );
                const entry: WeightEntryInput = { ...input, activityDate };
                const data = await createWeightEntry(
                    principal.ownerId,
                    sourceFor(principal),
                    idempotencyKey,
                    entry,
                );
                return scopedToolResult(data);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'IDEMPOTENCY_CONFLICT'
                ) {
                    return scopedToolError(
                        'That idempotency key was already used for a different measurement.',
                    );
                }
                return scopedToolError(
                    'Unable to record the measurement. Check the entry and try again.',
                );
            }
        },
    );

    server.registerTool(
        'correct_weight_entry',
        {
            title: 'Correct a weight entry',
            description:
                'Correct an existing owner-scoped non-image measurement using its entry ID and an idempotency key. Image-derived measurements must be corrected or confirmed in the admin dashboard.',
            inputSchema: WeightCorrectionInputSchema,
            scopeChallenge: requireScopes('progress:write'),
        },
        async ({ correction, idempotencyKey }) => {
            try {
                const activityDate = correction.activityDate
                    ? assertActivityDate(correction.activityDate)
                    : undefined;
                if (activityDate && activityDate > getTodayActivityDate())
                    return scopedToolError(
                        'A measurement cannot be corrected to a future date.',
                    );
                const data = await correctWeightEntry(
                    principal.ownerId,
                    sourceFor(principal),
                    idempotencyKey,
                    {
                        ...correction,
                        ...(activityDate ? { activityDate } : {}),
                    },
                );
                return scopedToolResult(data);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'IDEMPOTENCY_CONFLICT'
                ) {
                    return scopedToolError(
                        'That idempotency key was already used for a different correction.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'WEIGHT_ENTRY_NOT_FOUND'
                )
                    return scopedToolError('Measurement not found.');
                if (error instanceof RangeError)
                    return scopedToolError(error.message);
                return scopedToolError(
                    'Unable to correct the measurement. Check the correction and try again.',
                );
            }
        },
    );
}

function addCheckInTools(
    server: McpServer,
    principal: VerifiedMcpPrincipal,
): void {
    server.registerTool(
        'list_due_check_in_reminders',
        {
            title: 'List due check-in reminders',
            description:
                'List this owner’s due check-in reminder slots for today only. This does not claim or send any reminder.',
            inputSchema: EmptyInputSchema,
            scopeChallenge: requireScopes('check-ins:read'),
        },
        async () => {
            try {
                const reminders = await getDueCheckInReminders(
                    principal.ownerId,
                );
                return scopedToolResult({ reminders: reminders.slice(0, 4) });
            } catch {
                return scopedToolError(
                    'Unable to list due check-in reminders.',
                );
            }
        },
    );

    server.registerTool(
        'claim_check_in_reminder',
        {
            title: 'Claim a due check-in reminder',
            description:
                'Claim one of today’s due reminder slots and return a short-lived claim token plus provider idempotency key for a separate authorized adapter. This MCP endpoint does not send notifications.',
            inputSchema: ClaimCheckInReminderMcpInputSchema,
            scopeChallenge: requireScopes('check-ins:write'),
        },
        async ({ activityDate, slotId, provider }) => {
            if (!isReminderDeliveryEnabled()) {
                return scopedToolError(
                    'Reminder delivery is disabled; no claim was created.',
                );
            }
            try {
                const date = assertActivityDate(activityDate);
                if (date !== getTodayActivityDate())
                    return scopedToolError(
                        'Only today’s due reminder slots can be claimed.',
                    );
                const claim = await claimCheckInReminder(
                    principal.ownerId,
                    date,
                    slotId,
                    provider,
                );
                return scopedToolResult(
                    claim ? { claimed: true, ...claim } : { claimed: false },
                );
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'REMINDER_DELIVERY_DISABLED'
                ) {
                    return scopedToolError(
                        'Reminder delivery is disabled; no claim was created.',
                    );
                }
                return scopedToolError(
                    'Unable to claim this reminder. It may not be due or may already be claimed.',
                );
            }
        },
    );

    server.registerTool(
        'preflight_check_in_reminder_delivery',
        {
            title: 'Preflight a check-in reminder claim',
            description:
                'Recheck an owner-scoped claim immediately before a separate delivery adapter acts. Returns false while delivery is disabled; this tool never sends a notification.',
            inputSchema: PreflightCheckInReminderMcpInputSchema,
            scopeChallenge: requireScopes('check-ins:write'),
        },
        async ({ deliveryId, claimToken }) => {
            if (!isReminderDeliveryEnabled()) {
                return scopedToolResult({
                    canDeliver: false,
                    reason: 'delivery_disabled',
                });
            }
            try {
                return scopedToolResult({
                    canDeliver: await preflightCheckInReminderDelivery(
                        principal.ownerId,
                        deliveryId,
                        claimToken,
                    ),
                });
            } catch {
                return scopedToolError(
                    'Unable to preflight this reminder claim.',
                );
            }
        },
    );

    server.registerTool(
        'record_check_in_reminder_delivery',
        {
            title: 'Record a check-in reminder result',
            description:
                'Persist a separate provider’s sent/failed result for an owner-scoped claim. A sent result requires a provider delivery ID; this tool never contacts a provider or sends a notification.',
            inputSchema: RecordCheckInReminderDeliveryMcpInputSchema,
            scopeChallenge: requireScopes('check-ins:write'),
        },
        async ({
            deliveryId,
            claimToken,
            outcome,
            providerDeliveryId,
            errorCode,
        }) => {
            try {
                const result = await recordCheckInReminderDelivery(
                    principal.ownerId,
                    deliveryId,
                    claimToken,
                    outcome,
                    providerDeliveryId,
                    errorCode,
                );
                return scopedToolResult(result);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'REMINDER_CLAIM_INVALID'
                ) {
                    return scopedToolError(
                        'Reminder claim not found or no longer valid.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'CHECK_IN_NOT_FOUND'
                ) {
                    return scopedToolError('Check-in slot not found.');
                }
                return scopedToolError('Unable to record the reminder result.');
            }
        },
    );

    server.registerTool(
        'get_check_ins',
        {
            title: 'Read accountability check-ins',
            description:
                'Read owner-scoped check-ins for a date range of up to 90 days. Dates are IST calendar dates.',
            inputSchema: DateRangeInputSchema,
            scopeChallenge: requireScopes('check-ins:read'),
        },
        async (input) => {
            try {
                const { fromDate, toDate } = boundedDateRange(input, 7, 90);
                return scopedToolResult(
                    await getCheckIns(principal.ownerId, fromDate, toDate),
                );
            } catch {
                return scopedToolError(
                    'Unable to read check-ins. Check the date range and try again.',
                );
            }
        },
    );

    server.registerTool(
        'answer_check_in',
        {
            title: 'Answer an accountability check-in',
            description:
                'Answer one scheduled check-in. Future dates are not accepted; include a fresh idempotency key for each intended answer.',
            inputSchema: AnswerCheckInInputSchema,
            scopeChallenge: requireScopes('check-ins:write'),
        },
        async ({ answer, idempotencyKey }) => {
            try {
                const activityDate = assertActivityDate(answer.activityDate);
                if (activityDate > getTodayActivityDate())
                    return scopedToolError(
                        'A check-in cannot be answered for a future date.',
                    );
                const data = await answerCheckIn(
                    principal.ownerId,
                    sourceFor(principal),
                    idempotencyKey,
                    activityDate,
                    answer.slotId,
                    answer.response,
                );
                return scopedToolResult(data);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'IDEMPOTENCY_CONFLICT'
                ) {
                    return scopedToolError(
                        'That idempotency key was already used for a different response.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'CHECK_IN_NOT_FOUND'
                )
                    return scopedToolError('Check-in slot not found.');
                return scopedToolError(
                    'Unable to answer the check-in. Check the answer and try again.',
                );
            }
        },
    );
}

function addFoodTools(
    server: McpServer,
    principal: VerifiedMcpPrincipal,
): void {
    server.registerTool(
        'get_food_entries',
        {
            title: 'Read food log and daily calorie totals',
            description:
                'Read private food entries and estimated daily calories, with unknown calorie counts. Image IDs require media:read; image contents are available through read_private_image.',
            inputSchema: DateRangeInputSchema,
            scopeChallenge: requireScopes('food:read'),
        },
        async (input) => {
            try {
                const { fromDate, toDate } = boundedDateRange(input, 365, 3660);
                return scopedToolResult(
                    await getFoodEntries(
                        principal.ownerId,
                        fromDate,
                        toDate,
                        principal.scopes.includes('media:read'),
                    ),
                );
            } catch {
                return scopedToolError(
                    'Unable to read food entries. Check the range.',
                );
            }
        },
    );
    for (const editing of [false, true])
        server.registerTool(
            editing ? 'correct_food_entry' : 'record_food_entry',
            {
                title: editing ? 'Correct food entry' : 'Record food entry',
                description:
                    'Log a food item, IST date/time, portion and optional estimated calories. Calories can be null when unknown. Optional same-day image IDs additionally require media:read. Read an image with read_private_image before submitting an estimate; images are not automatically analyzed by the server.',
                inputSchema: z
                    .object({
                        entry: editing
                            ? FoodEntryCorrectRequestSchema
                            : FoodEntryRequestSchema,
                        idempotencyKey: IdempotencyInputSchema,
                    })
                    .strict(),
                scopeChallenge: requireScopes('food:write'),
            },
            async ({ entry, idempotencyKey }) => {
                if (
                    entry.evidenceAssetIds.length &&
                    !principal.scopes.includes('media:read')
                )
                    return scopedToolError(
                        'media:read is required to attach images.',
                    );
                try {
                    return scopedToolResult(
                        await saveFoodEntry(
                            principal.ownerId,
                            sourceFor(principal),
                            idempotencyKey,
                            entry,
                        ),
                    );
                } catch (error) {
                    return scopedToolError(
                        error instanceof RangeError
                            ? error.message
                            : 'Unable to save food. Check the entry and idempotency key.',
                    );
                }
            },
        );
}

function addMediaTools(
    server: McpServer,
    principal: VerifiedMcpPrincipal,
): void {
    server.registerTool(
        'read_private_image',
        {
            title: 'Read private image content',
            description:
                'Return verified owner-owned JPEG, PNG or WebP image content to the model. Use for food context or weight review. Requires media:read and never publishes the image.',
            inputSchema: MediaAssetInputSchema,
            scopeChallenge: requireScopes('media:read'),
        },
        async ({ assetId }) => {
            try {
                const image = await readOwnerPrivateImageForPreparation(
                    principal.ownerId,
                    assetId,
                );
                return {
                    content: [
                        {
                            type: 'image' as const,
                            data: image.bytes.toString('base64'),
                            mimeType: image.contentType,
                        },
                    ],
                };
            } catch {
                return scopedToolError(
                    'Private image not found or unavailable.',
                );
            }
        },
    );

    server.registerTool(
        'get_private_media_read_url',
        {
            title: 'Get a private media read URL',
            description:
                'Create a short-lived, owner-scoped URL for an existing private accountability asset.',
            inputSchema: MediaAssetInputSchema,
            scopeChallenge: requireScopes('media:read'),
        },
        async ({ assetId }) => {
            try {
                return scopedToolResult({
                    assetId,
                    ...(await createAccountabilityMediaReadUrl(
                        principal.ownerId,
                        assetId,
                    )),
                });
            } catch {
                return scopedToolError(
                    'Private media asset not found or unavailable.',
                );
            }
        },
    );

    server.registerTool(
        'list_private_media',
        {
            title: 'List private accountability media',
            description:
                'List up to 100 owner-scoped private asset metadata records with a stable cursor. This does not return storage keys, signed URLs, or public URLs; use the separate read-URL tool for an asset you can access.',
            inputSchema: ListPrivateMediaMcpInputSchema,
            scopeChallenge: requireScopes('media:read'),
        },
        async (input) => {
            try {
                return scopedToolResult(
                    await listOwnerPrivateMedia(principal.ownerId, input),
                );
            } catch (error) {
                if (error instanceof RangeError)
                    return scopedToolError(
                        'Invalid media date range, page size or cursor.',
                    );
                return scopedToolError('Unable to list private media.');
            }
        },
    );

    server.registerTool(
        'initiate_private_media_upload',
        {
            title: 'Initiate a private media upload',
            description:
                'Create a short-lived, owner-scoped upload URL for a private accountability image or video. Include an idempotency key and reuse it when retrying the same upload request.',
            inputSchema: MediaUploadInputSchema,
            scopeChallenge: requireScopes('media:write'),
        },
        async ({ idempotencyKey, ...input }) => {
            try {
                const localDate = assertActivityDate(input.localDate);
                if (localDate > getTodayActivityDate())
                    return scopedToolError(
                        'A private media upload cannot use a future date.',
                    );
                return scopedToolResult(
                    await initiateAccountabilityMediaUpload(
                        principal.ownerId,
                        { ...input, localDate },
                        sourceFor(principal),
                        idempotencyKey,
                    ),
                );
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'IDEMPOTENCY_CONFLICT'
                ) {
                    return scopedToolError(
                        'That idempotency key was already used for a different upload request.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'MEDIA_UPLOAD_NOT_RETRYABLE'
                ) {
                    return scopedToolError(
                        'This upload is already associated with a failed or unavailable asset. Start a new upload with a fresh idempotency key.',
                    );
                }
                return scopedToolError(
                    'Unable to initiate the private media upload. Check the metadata and file size.',
                );
            }
        },
    );

    server.registerTool(
        'finalize_private_media_upload',
        {
            title: 'Finalize a private media upload',
            description:
                'Verify and finalize a pending owner-scoped private upload after the client uploads it.',
            inputSchema: MediaAssetInputSchema,
            scopeChallenge: requireScopes('media:write'),
        },
        async ({ assetId }) => {
            try {
                return scopedToolResult(
                    await finalizeAccountabilityMediaUpload(
                        principal.ownerId,
                        assetId,
                    ),
                );
            } catch {
                return scopedToolError(
                    'Unable to finalize the private media upload.',
                );
            }
        },
    );
}

function addSummaryTools(
    server: McpServer,
    principal: VerifiedMcpPrincipal,
): void {
    server.registerTool(
        'get_summary_status',
        {
            title: 'Read summaries and approval details',
            description:
                'Read full summary text, revision numbers, draft/approved/published status, approval snapshots, selected images, publications and audit events for the authenticated owner. Optionally select an IST activityDate to review a specific day in chat; without a date, return the 50 most recent records in each collection.',
            inputSchema: SummaryStatusMcpInputSchema,
            scopeChallenge: requireScopes('summaries:write'),
        },
        async ({ activityDate }) => {
            try {
                const status = await getSummaryStatus(
                    principal.ownerId,
                    activityDate ? assertActivityDate(activityDate) : undefined,
                );
                return scopedToolResult({
                    drafts: status.drafts.slice(0, 50),
                    revisions: status.revisions.slice(0, 50),
                    approvals: status.approvals.slice(0, 50),
                    publications: status.publications.slice(0, 50),
                    history: status.history.slice(0, 50),
                });
            } catch {
                return scopedToolError('Unable to read summary status.');
            }
        },
    );

    server.registerTool(
        'create_summary_draft',
        {
            title: 'Create a daily summary draft',
            description:
                'Create an owner-scoped private daily draft from fixed habit status only. It does not publish the draft.',
            inputSchema: SummaryCreateRequestSchema,
            scopeChallenge: requireScopes('summaries:write'),
        },
        async ({ activityDate }) => {
            try {
                return scopedToolResult(
                    await createSummaryDraft(
                        principal.ownerId,
                        assertActivityDate(activityDate),
                    ),
                );
            } catch {
                return scopedToolError(
                    'Unable to create the summary draft. Future dates are not accepted.',
                );
            }
        },
    );

    server.registerTool(
        'edit_summary_draft',
        {
            title: 'Edit a summary draft',
            description:
                'Edit a summary for the authenticated owner, including an already approved summary. Save a new immutable draft revision, rejecting stale revision numbers. Previous approval snapshots remain unchanged; approve the new revision separately. Read get_summary_status to show the full text and current revision in chat.',
            inputSchema: SummaryEditInputSchema,
            scopeChallenge: requireScopes('summaries:write'),
        },
        async ({ draftId, revisionNumber, title, body }) => {
            try {
                return scopedToolResult(
                    await editSummaryDraft(
                        principal.ownerId,
                        draftId,
                        revisionNumber,
                        title,
                        body,
                    ),
                );
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_REVISION_CONFLICT'
                ) {
                    return scopedToolError(
                        'The summary draft changed. Read current status and review before editing again.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_DRAFT_NOT_FOUND'
                )
                    return scopedToolError('Summary draft not found.');
                return scopedToolError(
                    'Unable to edit the summary draft. Check the title and body limits.',
                );
            }
        },
    );

    server.registerTool(
        'list_summary_media_sources',
        {
            title: 'List eligible summary images',
            description:
                'List same-day private image previews eligible for explicit summary review. Preview URLs are temporary bearer capabilities.',
            inputSchema: SummaryMediaListQuerySchema,
            scopeChallenge: requireScopes('media:read'),
        },
        async ({ activityDate }) => {
            try {
                const date = assertActivityDate(activityDate);
                if (date > getTodayActivityDate())
                    return scopedToolError(
                        'A future date cannot be used to select summary media.',
                    );
                return scopedToolResult(
                    await listSummaryMediaSources(principal.ownerId, date),
                );
            } catch {
                return scopedToolError(
                    'Unable to list eligible summary images.',
                );
            }
        },
    );

    server.registerTool(
        'prepare_summary_media_derivative',
        {
            title: 'Prepare a private summary image',
            description:
                'Create a private sanitized WebP preview from one eligible same-day source image. This does not approve or publish it.',
            inputSchema: SummaryMediaPrepareRequestSchema,
            scopeChallenge: requireScopes('media:write'),
        },
        async ({ activityDate, sourceMediaAssetId }) => {
            try {
                const date = assertActivityDate(activityDate);
                if (date > getTodayActivityDate())
                    return scopedToolError(
                        'A future date cannot be used to prepare summary media.',
                    );
                return scopedToolResult(
                    await prepareSummaryMediaDerivative(
                        principal.ownerId,
                        date,
                        sourceMediaAssetId,
                    ),
                );
            } catch {
                return scopedToolError(
                    'Unable to prepare a sanitized summary image.',
                );
            }
        },
    );

    server.registerTool(
        'approve_summary_revision',
        {
            title: 'Approve a summary revision',
            description:
                'When the owner asks you to approve on their behalf, mark their selected latest summary revision as approved. Use get_summary_status to read and show its full text and current revision in chat, then approve that exact revision and explicit sanitized public image selections. Returns the approved text and status. Approval does not publish; edits require a new revision and approval.',
            inputSchema: SummaryApproveInputSchema,
            scopeChallenge: requireScopes('summaries:write'),
        },
        async ({ draftId, revisionNumber, publicMedia }) => {
            try {
                const approval = await approveSummaryRevision(
                    principal.ownerId,
                    draftId,
                    revisionNumber,
                    publicMedia,
                );
                return scopedToolResult({
                    ...approval,
                    draftId,
                    revisionNumber,
                    state: 'approved',
                });
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_REVISION_CONFLICT'
                ) {
                    return scopedToolError(
                        'The summary changed. Read get_summary_status again and approve the latest revision.',
                    );
                }
                if (
                    error instanceof Error &&
                    (error.message === 'SUMMARY_REVISION_NOT_FOUND' ||
                        error.message === 'SUMMARY_DRAFT_NOT_FOUND')
                )
                    return scopedToolError('Summary revision not found.');
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_APPROVAL_CONFLICT'
                ) {
                    return scopedToolError(
                        'That revision was already approved with different text or image selections.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_PUBLIC_MEDIA_INVALID'
                ) {
                    return scopedToolError(
                        'One or more selected public image derivatives are no longer eligible.',
                    );
                }
                return scopedToolError(
                    'Unable to approve this summary revision. Review the text and image selection.',
                );
            }
        },
    );

    server.registerTool(
        'publish_approved_summary',
        {
            title: 'Publish an approved summary',
            description:
                'Publish only a previously approved immutable summary snapshot and its selected sanitized derivatives. Stale approvals are refused; successful publication creates a public Random Thought and URL.',
            inputSchema: SummaryPublishRequestSchema,
            scopeChallenge: requireScopes('summaries:publish'),
        },
        async ({ approvalId }) => {
            try {
                const context = await auth.$context;
                const owner = await context.internalAdapter.findUserById(
                    principal.ownerId,
                );
                if (
                    !owner ||
                    !owner.email ||
                    !isAllowedAdminEmail(owner.email)
                ) {
                    return scopedToolError(
                        'The authorized owner could not be verified.',
                    );
                }
                const data = await publishSummaryApproval(
                    {
                        id: owner.id,
                        email: owner.email,
                        name: owner.name ?? null,
                    },
                    approvalId,
                );
                return scopedToolResult(data);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_APPROVAL_STALE'
                ) {
                    return scopedToolError(
                        'The approved content changed after review. Re-read the current summary and approve the exact revision again before publishing.',
                    );
                }
                if (
                    error instanceof Error &&
                    error.message === 'SUMMARY_APPROVAL_NOT_FOUND'
                )
                    return scopedToolError('Approved summary not found.');
                if (
                    error instanceof Error &&
                    (error.message === 'SUMMARY_DAILY_PUBLICATION_EXISTS' ||
                        error.message === 'SUMMARY_PUBLICATION_NOT_AVAILABLE')
                ) {
                    return scopedToolError(
                        'A publication already exists for that date or approval.',
                    );
                }
                return scopedToolError(
                    'Unable to publish the approved summary.',
                );
            }
        },
    );
}

function addPublicContentTools(server: McpServer): void {
    server.registerTool(
        'get_public_random_thoughts_page',
        {
            title: 'Read public Random Thoughts',
            description:
                'Read one bounded page of already-public Random Thoughts content. This does not access private drafts or accountability records.',
            inputSchema: PublicThoughtsPageInputSchema,
            scopeChallenge: requireScopes('content:read'),
        },
        async ({ page, pageSize }) => {
            try {
                return scopedToolResult(
                    await listRandomThoughtsPage(page, pageSize),
                );
            } catch {
                return scopedToolError(
                    'Unable to read public Random Thoughts content.',
                );
            }
        },
    );
}

function buildMcpPrincipal(
    request: Request,
    claims: Record<string, unknown>,
    issuer: string,
    resource: URL,
): VerifiedMcpPrincipal | null {
    return principalFromVerifiedMcpClaims(
        claims,
        request.headers.get('authorization'),
        issuer,
        resource,
    );
}

function createAccountabilityMcpHandler(principal: VerifiedMcpPrincipal) {
    return createMcpHandler(
        () => {
            const server = new McpServer({
                name: 'prosamik-accountability',
                version: '1.0.0',
            });
            addProgressTools(server, principal);
            addCheckInTools(server, principal);
            addMediaTools(server, principal);
            addFoodTools(server, principal);
            addSummaryTools(server, principal);
            addPublicContentTools(server);
            return server;
        },
        {
            legacy: 'stateless',
            responseMode: 'auto',
            maxRequestBodySize: 64 * 1024,
            maxSubscriptions: 0,
        },
    );
}

function privateResponse(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Vary', 'Authorization, Origin');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function privateError(
    status: number,
    message: string,
    extraHeaders?: HeadersInit,
): Response {
    const headers = new Headers(extraHeaders);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Pragma', 'no-cache');
    headers.set('Vary', 'Authorization, Origin');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return Response.json({ error: message }, { status, headers });
}

function mcpAuthInfoForPrincipal(principal: VerifiedMcpPrincipal): AuthInfo {
    return {
        token: principal.token,
        clientId: principal.clientId,
        scopes: principal.scopes,
        ...(principal.expiresAt ? { expiresAt: principal.expiresAt } : {}),
        resource: principal.resource,
    };
}

async function serveAuthenticatedRequest(
    request: Request,
    principal: VerifiedMcpPrincipal,
): Promise<Response> {
    const authContext = await auth.$context;
    const owner = await authContext.internalAdapter.findUserById(
        principal.ownerId,
    );
    if (!owner || !owner.email || !isAllowedAdminEmail(owner.email)) {
        return privateError(401, 'Unauthorized.', {
            'WWW-Authenticate': 'Bearer error="invalid_token"',
        });
    }

    const rateLimit = await consumeAccountabilityRateLimit(
        principal.ownerId,
        principal.apiKeyId
            ? 'mcp'
            : `mcp.client.${createHash('sha256').update(principal.clientId).digest('hex').slice(0, 24)}`,
        120,
        60,
        principal.apiKeyId ?? null,
    ).catch(() => null);
    if (!rateLimit)
        return privateError(503, 'MCP request is temporarily unavailable.');
    if (!rateLimit.allowed) {
        return privateError(429, 'Too many MCP requests.', {
            'Retry-After': String(rateLimit.retryAfterSeconds),
        });
    }

    const started = Date.now();
    const rpc =
        request.method === 'POST'
            ? await request
                  .clone()
                  .json()
                  .catch(() => null)
            : null;
    const method =
        typeof rpc?.method === 'string'
            ? rpc.method.slice(0, 120)
            : request.method;
    const tool =
        method === 'tools/call' && typeof rpc?.params?.name === 'string'
            ? rpc.params.name.slice(0, 120)
            : null;
    const handler = createAccountabilityMcpHandler(principal);
    const response = await handler.fetch(request, {
        authInfo: mcpAuthInfoForPrincipal(principal),
    });
    let failed = !response.ok;
    if (response.headers.get('content-type')?.includes('application/json')) {
        const result = await response
            .clone()
            .json()
            .catch(() => null);
        failed ||= Boolean(result?.error || result?.result?.isError);
    }
    // Metadata only: never persist arguments, response bodies, private text/images, or credentials.
    await getDatabase()`INSERT INTO accountability_mcp_access_logs(id,owner_id,api_key_id,client_id,method,tool_name,outcome,http_status,duration_ms) VALUES(${randomUUID()},${principal.ownerId},${principal.apiKeyId ?? null},${principal.clientId.slice(0, 200)},${method},${tool},${failed ? 'error' : 'success'},${response.status},${Date.now() - started})`.catch(
        () => {
            console.error('Unable to record MCP access metadata.');
        },
    );
    return privateResponse(response);
}

const MCP_MAX_REQUEST_BYTES = 64 * 1024;

/** Bound chunked bodies before JWT/key parsing, while retaining SDK validation. */
async function requestWithBoundedMcpBody(
    request: Request,
): Promise<Request | Response> {
    const declaredLength = request.headers.get('content-length');
    if (declaredLength !== null) {
        if (!/^\d+$/.test(declaredLength))
            return privateError(400, 'Invalid MCP request body length.');
        if (Number(declaredLength) > MCP_MAX_REQUEST_BYTES) {
            return privateError(413, 'MCP request body exceeds 64 KiB.');
        }
    }
    if (!request.body) return request;

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > MCP_MAX_REQUEST_BYTES) {
                await reader.cancel().catch(() => undefined);
                return privateError(413, 'MCP request body exceeds 64 KiB.');
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const headers = new Headers(request.headers);
    headers.delete('transfer-encoding');
    headers.set('content-length', String(total));
    return new Request(request.url, {
        method: request.method,
        headers,
        body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    });
}

type ActiveApiKey = {
    id: string;
    ownerId: string;
    keyId: string;
    scopes: string[];
    expiresAt: number | undefined;
};

async function authenticatePersonalApiKey(
    request: Request,
    resource: URL,
): Promise<VerifiedMcpPrincipal | Response> {
    const parsed = parsePersonalApiKeyAuthorization(
        request.headers.get('authorization'),
    );
    if (!parsed) {
        return privateError(401, 'Unauthorized.', {
            'WWW-Authenticate': 'Bearer error="invalid_token"',
        });
    }

    try {
        const tokenHash = createHash('sha256')
            .update(parsed.token, 'utf8')
            .digest();
        const sql = getDatabase();
        const active = await sql.begin(
            async (tx): Promise<ActiveApiKey | null> => {
                const rows = await tx`
                SELECT id, owner_id, key_id, verifier_hash, expires_at
                FROM accountability_api_keys
                WHERE key_id = ${parsed.keyId}
                  AND revoked_at IS NULL
                  AND (expires_at IS NULL OR expires_at > NOW())
                FOR UPDATE
            `;
                const row = rows[0];
                if (!row) return null;
                const storedHash = Buffer.from(
                    row.verifier_hash as Buffer | Uint8Array,
                );
                if (
                    storedHash.length !== tokenHash.length ||
                    !timingSafeEqual(storedHash, tokenHash)
                )
                    return null;

                const scopeRows = await tx`
                SELECT scope FROM accountability_api_key_scopes
                WHERE owner_id = ${String(row.owner_id)} AND api_key_id = ${String(row.id)}
                ORDER BY scope
            `;
                const scopes = scopeRows.map((scopeRow) =>
                    String(scopeRow.scope),
                );
                if (scopes.length === 0) return null;

                const updated = await tx`
                UPDATE accountability_api_keys
                SET last_used_at = NOW()
                WHERE owner_id = ${String(row.owner_id)}
                  AND id = ${String(row.id)}
                  AND revoked_at IS NULL
                  AND (expires_at IS NULL OR expires_at > NOW())
                RETURNING id
            `;
                if (updated.length === 0) return null;

                return {
                    id: String(row.id),
                    ownerId: String(row.owner_id),
                    keyId: String(row.key_id),
                    scopes,
                    expiresAt: row.expires_at
                        ? Math.floor(
                              new Date(
                                  row.expires_at as Date | string,
                              ).getTime() / 1000,
                          )
                        : undefined,
                };
            },
        );
        if (!active)
            return privateError(401, 'Unauthorized.', {
                'WWW-Authenticate': 'Bearer error="invalid_token"',
            });

        return {
            ownerId: active.ownerId,
            clientId: `api-key:${active.id}`,
            sourceId: `key:${active.id}`,
            scopes: active.scopes,
            // The key secret is not passed onward as SDK auth state. Scope
            // enforcement only needs the verified identity and granted scopes.
            token: `api-key:${active.id}`,
            expiresAt: active.expiresAt,
            resource,
            apiKeyId: active.id,
        };
    } catch {
        return privateError(503, 'MCP request is temporarily unavailable.');
    }
}

export async function handleAccountabilityMcpPost(
    request: Request,
): Promise<Response> {
    const context = await auth.$context;
    let resource: URL;
    try {
        resource = resolveAccountabilityMcpResourceUrl(
            context.baseURL,
            process.env.MCP_RESOURCE_URL,
        );
    } catch {
        return privateError(503, 'MCP resource configuration is unavailable.');
    }
    if (!validateAccountabilityMcpRequest(request, resource))
        return privateError(403, 'MCP request origin is not allowed.');

    // Bound invalid OAuth and personal-key traffic before JWT/JWKS verification
    // or any API-key database lookup. The stored subject is a keyed digest.
    const preAuthLimit = await consumePreAuthMcpRateLimit(request).catch(
        () => null,
    );
    if (!preAuthLimit)
        return privateError(503, 'MCP request is temporarily unavailable.');
    if (!preAuthLimit.allowed) {
        return privateError(429, 'Too many unauthenticated MCP requests.', {
            'Retry-After': String(preAuthLimit.retryAfterSeconds),
        });
    }

    const boundedRequest = await requestWithBoundedMcpBody(request);
    if (boundedRequest instanceof Response) return boundedRequest;

    if (
        isPersonalApiKeyAuthorization(
            boundedRequest.headers.get('authorization'),
        )
    ) {
        const principal = await authenticatePersonalApiKey(
            boundedRequest,
            resource,
        );
        if (principal instanceof Response) return principal;
        return serveAuthenticatedRequest(boundedRequest, principal);
    }

    const withMcpAuth = requireMcpAuth(
        auth,
        async (authenticatedRequest, claims) => {
            const principal = buildMcpPrincipal(
                authenticatedRequest,
                claims as Record<string, unknown>,
                context.baseURL,
                resource,
            );
            if (!principal) return privateError(401, 'Unauthorized.');
            return serveAuthenticatedRequest(authenticatedRequest, principal);
        },
        { resource: resource.toString() },
    );

    return withMcpAuth(boundedRequest);
}
