import { createHash, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import {
    addActivityDays,
    assertActivityDate,
    databaseDateToActivityDate,
    calculateHabitStreak,
    calculateNoFapWeeklyStreak,
    getIstDateTime,
    summarizeNoFapWeek,
    toIstActivityDate,
    type ActivityDate,
    type HabitDayStatus,
} from '@/lib/accountability-domain';
import { getDatabase } from '@/lib/database';
import { CHECK_IN_SLOTS, HABITS, type HabitKey, type OutreachChannel, type VideoStage } from '@/lib/accountability-constants';

export { CHECK_IN_SLOTS, HABITS } from '@/lib/accountability-constants';
export type { HabitKey, OutreachChannel, VideoStage } from '@/lib/accountability-constants';

export type HabitDetails = {
    activity?: string | null;
    durationMinutes?: number | null;
    outreachCount?: number | null;
    outreachChannel?: OutreachChannel | null;
    emailDraftedCount?: number | null;
    emailSentCount?: number | null;
    videoStage?: VideoStage | null;
    notes?: string | null;
};

export type HabitUpdate = HabitDetails & {
    habitKey: HabitKey;
    activityDate: ActivityDate;
    status: HabitDayStatus;
};

export type UpdateSource = {
    /** Server-selected identity, never copied from request JSON. */
    kind: 'admin' | 'mcp';
    /** A bounded session or API-key identity, so replay keys are client-scoped. */
    id: string;
};

type ProjectionRow = {
    id: string;
    owner_id: string;
    habit_key: HabitKey;
    local_date: string;
    status: HabitDayStatus;
    activity: string | null;
    duration_minutes: number | null;
    outreach_count: number | null;
    outreach_channel: OutreachChannel | null;
    email_drafted_count: number | null;
    email_sent_count: number | null;
    video_stage: VideoStage | null;
    notes: string | null;
    updated_at: Date | string;
};

function requestDigest(value: unknown): Buffer {
    return createHash('sha256').update(JSON.stringify(value), 'utf8').digest();
}

function keyDigest(value: string): Buffer {
    return createHash('sha256').update(value, 'utf8').digest();
}

function sourceOperationId(source: UpdateSource): string {
    return `${source.kind}:${source.id}`.replace(/[^a-z0-9._:-]/gi, '_').slice(0, 72);
}

function toHabitRow(row: ProjectionRow) {
    return {
        id: row.id,
        habitKey: row.habit_key,
        date: databaseDateToActivityDate(row.local_date as Date | string),
        status: row.status,
        activity: row.activity,
        durationMinutes: row.duration_minutes,
        outreachCount: row.outreach_count,
        outreachChannel: row.outreach_channel,
        emailDraftedCount: row.email_drafted_count,
        emailSentCount: row.email_sent_count,
        videoStage: row.video_stage,
        notes: row.notes,
        updatedAt: new Date(row.updated_at).toISOString(),
    };
}

/**
 * Record one explicit status update, append its immutable event, then refresh the
 * one-per-owner/habit/date projection from the latest event. Repeated quantities
 * replace the projection value; they are never summed across retries.
 */
export async function recordHabitUpdate(
    ownerId: string,
    source: UpdateSource,
    idempotencyKey: string,
    update: HabitUpdate,
) {
    assertActivityDate(update.activityDate);
    if (!idempotencyKey.trim() || idempotencyKey.length > 180) throw new RangeError('An idempotency key is required.');

    const sql = getDatabase();
    const operationKey = `habit.${update.habitKey}.${sourceOperationId(source)}`.slice(0, 96);
    const hashedKey = keyDigest(idempotencyKey);
    const hashedRequest = requestDigest(update);
    const result = await sql.begin(async (tx) => {
        const idempotencyRows = await tx`
            INSERT INTO accountability_idempotency_keys (
                owner_id, operation_key, idempotency_key_hash, request_hash, expires_at
            ) VALUES (
                ${ownerId}, ${operationKey}, ${hashedKey}, ${hashedRequest}, NOW() + INTERVAL '30 days'
            )
            ON CONFLICT (owner_id, operation_key, idempotency_key_hash)
            DO NOTHING
            RETURNING id
        `;

        if (idempotencyRows.length === 0) {
            const priorRows = await tx`
                SELECT request_hash
                FROM accountability_idempotency_keys
                WHERE owner_id = ${ownerId}
                  AND operation_key = ${operationKey}
                  AND idempotency_key_hash = ${hashedKey}
                FOR UPDATE
            `;
            if (!priorRows[0] || !Buffer.from(priorRows[0].request_hash as Buffer).equals(hashedRequest)) {
                return { conflict: true as const };
            }

            const existing = await tx`
                SELECT * FROM accountability_habit_days
                WHERE owner_id = ${ownerId}
                  AND habit_key = ${update.habitKey}
                  AND local_date = ${update.activityDate}::date
            `;
            if (!existing[0]) return { conflict: false as const, duplicate: true as const, row: null };
            return { conflict: false as const, duplicate: true as const, row: existing[0] as ProjectionRow };
        }

        const idempotencyId = Number(idempotencyRows[0].id);
        const dayId = randomUUID();
        await tx`
            INSERT INTO accountability_habit_days (id, owner_id, habit_key, local_date, status)
            VALUES (${dayId}, ${ownerId}, ${update.habitKey}, ${update.activityDate}::date, 'unknown')
            ON CONFLICT (owner_id, habit_key, local_date) DO NOTHING
        `;
        const dayRows = await tx`
            SELECT * FROM accountability_habit_days
            WHERE owner_id = ${ownerId}
              AND habit_key = ${update.habitKey}
              AND local_date = ${update.activityDate}::date
            FOR UPDATE
        `;
        const currentProjection = dayRows[0] as ProjectionRow;
        const habitDayId = String(currentProjection.id);
        const values = {
            activity: update.activity === undefined ? currentProjection.activity : update.activity,
            durationMinutes: update.durationMinutes === undefined ? currentProjection.duration_minutes : update.durationMinutes,
            outreachCount: update.outreachCount === undefined ? currentProjection.outreach_count : update.outreachCount,
            outreachChannel: update.outreachChannel === undefined ? currentProjection.outreach_channel : update.outreachChannel,
            emailDraftedCount: update.emailDraftedCount === undefined ? currentProjection.email_drafted_count : update.emailDraftedCount,
            emailSentCount: update.emailSentCount === undefined ? currentProjection.email_sent_count : update.emailSentCount,
            videoStage: update.videoStage === undefined ? currentProjection.video_stage : update.videoStage,
            notes: update.notes === undefined ? currentProjection.notes : update.notes,
        };
        const eventId = randomUUID();
        await tx`
            INSERT INTO accountability_habit_events (
                id, owner_id, habit_key, local_date, event_type, status,
                activity, duration_minutes, outreach_count, outreach_channel,
                email_drafted_count, email_sent_count, video_stage, notes,
                idempotency_key_id
            ) VALUES (
                ${eventId}, ${ownerId}, ${update.habitKey}, ${update.activityDate}::date,
                'status_set', ${update.status},
                ${values.activity}, ${values.durationMinutes}, ${values.outreachCount}, ${values.outreachChannel},
                ${values.emailDraftedCount}, ${values.emailSentCount}, ${values.videoStage}, ${values.notes},
                ${idempotencyId}
            )
        `;

        // The daily projection row is locked above, so this latest accepted update
        // wins deterministically without relying on transaction-start timestamps.
        const projectedStatus = update.status;
        const projection = {
            activity: values.activity,
            duration_minutes: values.durationMinutes,
            outreach_count: values.outreachCount,
            outreach_channel: values.outreachChannel,
            email_drafted_count: values.emailDraftedCount,
            email_sent_count: values.emailSentCount,
            video_stage: values.videoStage,
            notes: values.notes,
        };

        const projectedRows = await tx`
            UPDATE accountability_habit_days
            SET status = ${projectedStatus},
                activity = ${projection.activity ?? null},
                duration_minutes = ${projection.duration_minutes ?? null},
                outreach_count = ${projection.outreach_count ?? null},
                outreach_channel = ${projection.outreach_channel ?? null},
                email_drafted_count = ${projection.email_drafted_count ?? null},
                email_sent_count = ${projection.email_sent_count ?? null},
                video_stage = ${projection.video_stage ?? null},
                notes = ${projection.notes ?? null},
                updated_at = NOW()
            WHERE owner_id = ${ownerId} AND id = ${habitDayId}
            RETURNING *
        `;
        await tx`
            UPDATE accountability_idempotency_keys
            SET response_status = 200
            WHERE owner_id = ${ownerId} AND id = ${idempotencyId}
        `;
        return { conflict: false as const, duplicate: false as const, row: projectedRows[0] as ProjectionRow };
    });

    if (result.conflict) throw new Error('IDEMPOTENCY_CONFLICT');
    return { duplicate: result.duplicate, habit: result.row ? toHabitRow(result.row) : null };
}

export async function getProgress(ownerId: string, fromDate: ActivityDate, toDate: ActivityDate) {
    assertActivityDate(fromDate);
    assertActivityDate(toDate);
    if (fromDate > toDate) throw new RangeError('Start date must be on or before end date.');

    const sql = getDatabase();
    const [historyRows, rangeRows, noFapRows, weightRows] = await Promise.all([
        sql`
            SELECT habit_key, local_date, status
            FROM accountability_habit_days
            WHERE owner_id = ${ownerId}
              AND local_date <= ${toDate}::date
            ORDER BY local_date DESC
            LIMIT 12000
        `,
        sql`
            SELECT * FROM accountability_habit_days
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ORDER BY local_date DESC, habit_key
        `,
        sql`
            SELECT local_date, status FROM accountability_no_fap_days
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ORDER BY local_date DESC
        `,
        sql`
            SELECT id, local_date, measured_at, original_value, original_unit, weight_kg,
                   notes, source, confirmed_at, is_primary
            FROM accountability_weight_entries
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ORDER BY local_date DESC, measured_at DESC
        `,
    ]);

    const history = historyRows.map((row) => ({
        date: databaseDateToActivityDate(row.local_date as Date | string),
        habitKey: row.habit_key as HabitKey,
        status: row.status as HabitDayStatus,
    }));
    const today = toDate;
    const streaks = Object.fromEntries(HABITS.map(({ key }) => [
        key,
        calculateHabitStreak(
            history.filter((row) => row.habitKey === key).map(({ date, status }) => ({ date, status })),
            today,
        ),
    ]));
    const allNoFapSuccess = await sql`
        SELECT local_date FROM accountability_no_fap_days
        WHERE owner_id = ${ownerId} AND status = 'success' AND local_date <= ${toDate}::date
        ORDER BY local_date DESC LIMIT 10000
    `;
    const noFapDates = allNoFapSuccess.map((row) => databaseDateToActivityDate(row.local_date as Date | string));
    const noFapWeek = summarizeNoFapWeek(noFapDates, today);
    const noFapStreak = calculateNoFapWeeklyStreak(noFapDates, today);

    return {
        fromDate,
        toDate,
        habits: rangeRows.map((row) => toHabitRow(row as ProjectionRow)),
        habitHistory: history,
        habitStreaks: streaks,
        noFapDays: noFapRows.map((row) => ({ date: databaseDateToActivityDate(row.local_date as Date | string), status: row.status })),
        noFapWeek,
        noFapStreak,
        weights: weightRows.map((row) => ({
            id: row.id,
            date: databaseDateToActivityDate(row.local_date as Date | string),
            measuredAt: new Date(row.measured_at as Date | string).toISOString(),
            originalValue: row.original_value,
            originalUnit: row.original_unit,
            weightKg: row.weight_kg,
            notes: row.notes,
            source: row.source,
            confirmedAt: row.confirmed_at ? new Date(row.confirmed_at as Date | string).toISOString() : null,
            isPrimary: row.is_primary,
        })),
    };
}

export async function recordNoFapStatus(
    ownerId: string,
    source: UpdateSource,
    idempotencyKey: string,
    activityDate: ActivityDate,
    status: 'success' | 'relapse' | 'not_tracked',
) {
    assertActivityDate(activityDate);
    if (!idempotencyKey.trim() || idempotencyKey.length > 180) throw new RangeError('An idempotency key is required.');
    const operationKey = `no-fap.${sourceOperationId(source)}`.slice(0, 96);
    const hashedKey = keyDigest(idempotencyKey);
    const hashedRequest = requestDigest({ activityDate, status });
    const sql = getDatabase();

    const rows = await sql.begin(async (tx) => {
        const inserted = await tx`
            INSERT INTO accountability_idempotency_keys (
                owner_id, operation_key, idempotency_key_hash, request_hash, expires_at
            ) VALUES (
                ${ownerId}, ${operationKey}, ${hashedKey}, ${hashedRequest}, NOW() + INTERVAL '30 days'
            )
            ON CONFLICT (owner_id, operation_key, idempotency_key_hash)
            DO NOTHING
            RETURNING id
        `;
        if (inserted.length === 0) {
            const previous = await tx`
                SELECT request_hash FROM accountability_idempotency_keys
                WHERE owner_id = ${ownerId} AND operation_key = ${operationKey}
                  AND idempotency_key_hash = ${hashedKey}
                FOR UPDATE
            `;
            if (!previous[0] || !Buffer.from(previous[0].request_hash as Buffer).equals(hashedRequest)) {
                throw new Error('IDEMPOTENCY_CONFLICT');
            }
            return await tx`
                SELECT * FROM accountability_no_fap_days
                WHERE owner_id = ${ownerId} AND local_date = ${activityDate}::date
            `;
        }

        const result = await tx`
            INSERT INTO accountability_no_fap_days (id, owner_id, local_date, status)
            VALUES (${randomUUID()}, ${ownerId}, ${activityDate}::date, ${status})
            ON CONFLICT (owner_id, local_date)
            DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
            RETURNING *
        `;
        await tx`
            UPDATE accountability_idempotency_keys SET response_status = 200
            WHERE owner_id = ${ownerId} AND id = ${Number(inserted[0].id)}
        `;
        return result;
    });

    return rows[0] ? { date: databaseDateToActivityDate(rows[0].local_date as Date | string), status: rows[0].status } : null;
}

export async function ensureCheckInSlots(
    ownerId: string,
    fromDate: ActivityDate,
    toDate: ActivityDate,
): Promise<void> {
    assertActivityDate(fromDate);
    assertActivityDate(toDate);
    if (fromDate > toDate) throw new RangeError('Start date must be on or before end date.');

    const sql = getDatabase();
    await sql.begin(async (tx) => {
        for (const slot of CHECK_IN_SLOTS) {
            await tx`
                INSERT INTO accountability_reminders (
                    id, owner_id, slot_id, local_time, time_zone, enabled
                ) VALUES (
                    ${randomUUID()}, ${ownerId}, ${slot.id}, ${slot.reminderLocalTime}::time,
                    'Asia/Kolkata', TRUE
                )
                ON CONFLICT (owner_id, slot_id) DO NOTHING
            `;
        }

        let date = fromDate;
        let count = 0;
        while (date <= toDate) {
            for (const slot of CHECK_IN_SLOTS) {
                const reminderRows = await tx`
                    SELECT id FROM accountability_reminders
                    WHERE owner_id = ${ownerId} AND slot_id = ${slot.id}
                `;
                await tx`
                    INSERT INTO accountability_check_ins (
                        id, owner_id, local_date, slot_id, scheduled_local_time,
                        time_zone, status, reminder_id, reminder_status
                    ) VALUES (
                        ${randomUUID()}, ${ownerId}, ${date}::date, ${slot.id},
                        ${slot.scheduledLocalTime}::time, 'Asia/Kolkata', 'pending',
                        ${String(reminderRows[0].id)}, 'not_scheduled'
                    )
                    ON CONFLICT (owner_id, local_date, slot_id) DO NOTHING
                `;
            }
            date = addActivityDays(date, 1);
            count += 1;
            if (count > 90) throw new RangeError('Check-in slot initialization is limited to 90 days at a time.');
        }

        // Missed status and reminder eligibility become true only after one full
        // hour has elapsed in IST. No notification is sent by this projection.
        await tx`
            UPDATE accountability_check_ins
            SET status = 'missed',
                missed_at = ((local_date + scheduled_local_time) AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 hour',
                reminder_status = CASE
                    WHEN reminder_status = 'not_scheduled' THEN 'scheduled'
                    ELSE reminder_status
                END,
                updated_at = NOW()
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
              AND status = 'pending'
              AND ((local_date + scheduled_local_time) AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 hour' <= NOW()
        `;
    });
}

export async function getCheckIns(ownerId: string, fromDate: ActivityDate, toDate: ActivityDate) {
    await ensureCheckInSlots(ownerId, fromDate, toDate);
    const sql = getDatabase();
    const rows = await sql`
            SELECT id, local_date, slot_id, scheduled_local_time, status,
                   response_text, answered_at, missed_at, reminder_status,
                   reminder_attempted_at, reminder_sent_at
            FROM accountability_check_ins
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ORDER BY local_date DESC, scheduled_local_time
        `;

    return {
        fromDate,
        toDate,
        slots: rows.map((row) => ({
            id: row.id,
            date: databaseDateToActivityDate(row.local_date as Date | string),
            slotId: row.slot_id,
            scheduledLocalTime: String(row.scheduled_local_time).slice(0, 5),
            status: row.status,
            response: row.response_text,
            answeredAt: row.answered_at ? new Date(row.answered_at as Date | string).toISOString() : null,
            missedAt: row.missed_at ? new Date(row.missed_at as Date | string).toISOString() : null,
            reminderStatus: row.reminder_status,
            reminderAttemptedAt: row.reminder_attempted_at ? new Date(row.reminder_attempted_at as Date | string).toISOString() : null,
            reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at as Date | string).toISOString() : null,
        })),
    };
}

export async function answerCheckIn(
    ownerId: string,
    source: UpdateSource,
    idempotencyKey: string,
    activityDate: ActivityDate,
    slotId: string,
    response: string,
) {
    assertActivityDate(activityDate);
    const trimmedResponse = response.trim();
    if (!idempotencyKey.trim() || idempotencyKey.length > 180) throw new RangeError('An idempotency key is required.');
    if (trimmedResponse.length === 0 || trimmedResponse.length > 4000) throw new RangeError('A check-in response must be 1–4000 characters.');
    if (!CHECK_IN_SLOTS.some((slot) => slot.id === slotId)) throw new RangeError('Invalid check-in slot.');

    await ensureCheckInSlots(ownerId, activityDate, activityDate);
    const operationKey = `check-in.answer.${sourceOperationId(source)}`.slice(0, 96);
    const hashedKey = keyDigest(idempotencyKey);
    const hashedRequest = requestDigest({ activityDate, slotId, response: trimmedResponse });
    const sql = getDatabase();

    return sql.begin(async (tx) => {
        const inserted = await tx`
            INSERT INTO accountability_idempotency_keys (
                owner_id, operation_key, idempotency_key_hash, request_hash, expires_at
            ) VALUES (
                ${ownerId}, ${operationKey}, ${hashedKey}, ${hashedRequest}, NOW() + INTERVAL '30 days'
            )
            ON CONFLICT (owner_id, operation_key, idempotency_key_hash)
            DO NOTHING
            RETURNING id
        `;
        if (inserted.length === 0) {
            const previous = await tx`
                SELECT request_hash FROM accountability_idempotency_keys
                WHERE owner_id = ${ownerId} AND operation_key = ${operationKey}
                  AND idempotency_key_hash = ${hashedKey}
                FOR UPDATE
            `;
            if (!previous[0] || !Buffer.from(previous[0].request_hash as Buffer).equals(hashedRequest)) {
                throw new Error('IDEMPOTENCY_CONFLICT');
            }
        }

        const slotRows = await tx`
            SELECT * FROM accountability_check_ins
            WHERE owner_id = ${ownerId} AND local_date = ${activityDate}::date AND slot_id = ${slotId}
            FOR UPDATE
        `;
        if (!slotRows[0]) throw new Error('CHECK_IN_NOT_FOUND');
        const current = slotRows[0];
        if (inserted.length === 0) {
            return {
                duplicate: true,
                slot: {
                    id: current.id,
                    date: databaseDateToActivityDate(current.local_date as Date | string),
                    slotId: current.slot_id,
                    status: current.status,
                    response: current.response_text,
                    answeredAt: current.answered_at ? new Date(current.answered_at as Date | string).toISOString() : null,
                    reminderStatus: current.reminder_status,
                },
            };
        }
        const suppressReminder = current.reminder_status === 'not_scheduled'
            || current.reminder_status === 'scheduled'
            || current.reminder_status === 'claimed';

        const updated = await tx`
            UPDATE accountability_check_ins
            SET status = 'answered',
                response_text = ${trimmedResponse},
                answered_at = NOW(),
                missed_at = NULL,
                reminder_status = CASE
                    WHEN ${suppressReminder} THEN 'suppressed'
                    ELSE reminder_status
                END,
                updated_at = NOW()
            WHERE owner_id = ${ownerId} AND id = ${String(current.id)}
            RETURNING id, local_date, slot_id, scheduled_local_time, status,
                      response_text, answered_at, reminder_status
        `;

        if (current.reminder_delivery_id && suppressReminder) {
            await tx`
                UPDATE accountability_reminder_deliveries
                SET status = 'suppressed', claim_token = NULL, claim_expires_at = NULL, updated_at = NOW()
                WHERE owner_id = ${ownerId}
                  AND id = ${String(current.reminder_delivery_id)}
                  AND status = 'claimed'
            `;
        }

        if (inserted.length > 0) {
            await tx`
                UPDATE accountability_idempotency_keys SET response_status = 200
                WHERE owner_id = ${ownerId} AND id = ${Number(inserted[0].id)}
            `;
        }
        return {
            duplicate: inserted.length === 0,
            slot: {
                id: updated[0].id,
                date: databaseDateToActivityDate(updated[0].local_date as Date | string),
                slotId: updated[0].slot_id,
                status: updated[0].status,
                response: updated[0].response_text,
                answeredAt: new Date(updated[0].answered_at as Date | string).toISOString(),
                reminderStatus: updated[0].reminder_status,
            },
        };
    });
}

/** List eligible reminders only; this function never claims or sends them. */
export async function getDueCheckInReminders(ownerId: string) {
    const today = getTodayActivityDate();
    await ensureCheckInSlots(ownerId, today, today);
    const sql = getDatabase();
    const rows = await sql`
        SELECT id, reminder_id, local_date, slot_id, scheduled_local_time, reminder_status
        FROM accountability_check_ins
        WHERE owner_id = ${ownerId}
          AND local_date = ${today}::date
          AND status <> 'answered'
          AND reminder_status = 'scheduled'
          AND reminder_delivery_id IS NULL
          AND ((local_date + scheduled_local_time) AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 hour' <= NOW()
        ORDER BY scheduled_local_time
    `;

    return rows.map((row) => ({
        checkInId: row.id,
        reminderId: row.reminder_id,
        date: databaseDateToActivityDate(row.local_date as Date | string),
        slotId: row.slot_id,
        scheduledLocalTime: String(row.scheduled_local_time).slice(0, 5),
        reminderStatus: row.reminder_status,
    }));
}

/**
 * Claim is disabled unless an operator has deliberately enabled a tested
 * delivery adapter. The claim itself is owner/slot/date idempotent and only
 * returns a stable provider idempotency key for adapters that support it.
 */
export async function claimCheckInReminder(
    ownerId: string,
    activityDate: ActivityDate,
    slotId: string,
    provider: 'in_app' | 'email' | 'push',
) {
    if (process.env.ACCOUNTABILITY_REMINDER_DELIVERY_ENABLED !== 'true') {
        throw new Error('REMINDER_DELIVERY_DISABLED');
    }
    assertActivityDate(activityDate);
    if (!CHECK_IN_SLOTS.some((slot) => slot.id === slotId)) throw new RangeError('Invalid check-in slot.');
    await ensureCheckInSlots(ownerId, activityDate, activityDate);

    const sql = getDatabase();
    return sql.begin(async (tx) => {
        const rows = await tx`
            SELECT * FROM accountability_check_ins
            WHERE owner_id = ${ownerId} AND local_date = ${activityDate}::date AND slot_id = ${slotId}
            FOR UPDATE
        `;
        const slot = rows[0];
        if (!slot || slot.status === 'answered' || slot.reminder_status !== 'scheduled' || slot.reminder_delivery_id) return null;

        const dueAt = await tx`
            SELECT (((${activityDate}::date + ${slot.scheduled_local_time}::time) AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 hour') AS due_at
        `;
        if (new Date(dueAt[0].due_at as Date | string).getTime() > Date.now()) return null;

        const deliveryId = randomUUID();
        const claimToken = randomUUID();
        const deliveryKey = `acct_${keyDigest(`${ownerId}:${slotId}:${activityDate}`).toString('hex').slice(0, 32)}`;
        const deliveryKeyHash = keyDigest(deliveryKey);
        const now = new Date();
        const deliveryRows = await tx`
            INSERT INTO accountability_reminder_deliveries (
                id, owner_id, reminder_id, slot_id, local_date, delivery_key_hash,
                provider, status, claim_token, claim_expires_at, attempt_count, attempted_at
            ) VALUES (
                ${deliveryId}, ${ownerId}, ${String(slot.reminder_id)}, ${slotId}, ${activityDate}::date,
                ${deliveryKeyHash}, ${provider}, 'claimed', ${claimToken}, ${new Date(now.getTime() + 5 * 60_000)}, 1, ${now}
            )
            ON CONFLICT (owner_id, slot_id, local_date) DO NOTHING
            RETURNING id
        `;
        if (deliveryRows.length === 0) return null;

        const updated = await tx`
            UPDATE accountability_check_ins
            SET reminder_status = 'claimed', reminder_delivery_id = ${deliveryId},
                reminder_attempted_at = ${now}, updated_at = NOW()
            WHERE owner_id = ${ownerId} AND id = ${String(slot.id)} AND status <> 'answered'
              AND reminder_status = 'scheduled' AND reminder_delivery_id IS NULL
            RETURNING id
        `;
        if (updated.length === 0) {
            await tx`
                UPDATE accountability_reminder_deliveries
                SET status = 'suppressed', claim_token = NULL, claim_expires_at = NULL, updated_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${deliveryId}
            `;
            return null;
        }

        return { deliveryId, claimToken, deliveryKey, provider, date: activityDate, slotId };
    });
}

/** Recheck the exact slot immediately before a delivery adapter sends. */
export async function preflightCheckInReminderDelivery(
    ownerId: string,
    deliveryId: string,
    claimToken: string,
): Promise<boolean> {
    const sql = getDatabase();
    return sql.begin(async (tx) => {
        const deliveries = await tx`
            SELECT * FROM accountability_reminder_deliveries
            WHERE owner_id = ${ownerId} AND id = ${deliveryId} AND status = 'claimed'
            FOR UPDATE
        `;
        const delivery = deliveries[0];
        if (!delivery || String(delivery.claim_token) !== claimToken) return false;
        if (new Date(delivery.claim_expires_at as Date | string).getTime() <= Date.now()) return false;

        const slots = await tx`
            SELECT * FROM accountability_check_ins
            WHERE owner_id = ${ownerId} AND reminder_delivery_id = ${deliveryId}
            FOR UPDATE
        `;
        const slot = slots[0];
        if (!slot || slot.status === 'answered' || slot.reminder_status !== 'claimed') {
            await tx`
                UPDATE accountability_reminder_deliveries
                SET status = 'suppressed', claim_token = NULL, claim_expires_at = NULL, updated_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${deliveryId}
            `;
            if (slot) {
                await tx`
                    UPDATE accountability_check_ins
                    SET reminder_status = 'suppressed', updated_at = NOW()
                    WHERE owner_id = ${ownerId} AND id = ${String(slot.id)}
                `;
            }
            return false;
        }
        return true;
    });
}

/** Persist the provider result; an uncertain/failed attempt is never auto-resent. */
export async function recordCheckInReminderDelivery(
    ownerId: string,
    deliveryId: string,
    claimToken: string,
    outcome: 'sent' | 'failed',
    providerDeliveryId?: string | null,
    errorCode?: string | null,
) {
    if (providerDeliveryId && providerDeliveryId.length > 255) throw new RangeError('Provider delivery ID is too long.');
    const normalizedError = errorCode?.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 64) || null;
    const sql = getDatabase();

    return sql.begin(async (tx) => {
        const deliveries = await tx`
            SELECT * FROM accountability_reminder_deliveries
            WHERE owner_id = ${ownerId} AND id = ${deliveryId} AND status = 'claimed'
            FOR UPDATE
        `;
        const delivery = deliveries[0];
        if (!delivery || String(delivery.claim_token) !== claimToken) throw new Error('REMINDER_CLAIM_INVALID');

        const slots = await tx`
            SELECT * FROM accountability_check_ins
            WHERE owner_id = ${ownerId} AND reminder_delivery_id = ${deliveryId}
            FOR UPDATE
        `;
        const slot = slots[0];
        if (!slot) throw new Error('CHECK_IN_NOT_FOUND');
        if (slot.status === 'answered' || slot.reminder_status === 'suppressed') {
            await tx`
                UPDATE accountability_reminder_deliveries
                SET status = 'suppressed', claim_token = NULL, claim_expires_at = NULL, updated_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${deliveryId}
            `;
            await tx`
                UPDATE accountability_check_ins
                SET reminder_status = 'suppressed', updated_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${String(slot.id)}
            `;
            return { status: 'suppressed' as const, deliveryId };
        }

        const sentAt = outcome === 'sent' ? new Date() : null;
        await tx`
            UPDATE accountability_reminder_deliveries
            SET status = ${outcome}, provider_delivery_id = ${providerDeliveryId ?? null},
                error_code = ${outcome === 'failed' ? normalizedError : null},
                sent_at = ${sentAt}, claim_token = NULL, claim_expires_at = NULL, updated_at = NOW()
            WHERE owner_id = ${ownerId} AND id = ${deliveryId}
        `;
        await tx`
            UPDATE accountability_check_ins
            SET reminder_status = ${outcome},
                reminder_sent_at = ${sentAt}, updated_at = NOW()
            WHERE owner_id = ${ownerId} AND id = ${String(slot.id)}
        `;
        return { status: outcome, deliveryId, providerDeliveryId: providerDeliveryId ?? null, sentAt: sentAt?.toISOString() ?? null };
    });
}

function mapWeightRow(row: Record<string, unknown>) {
    return {
        id: String(row.id),
        date: databaseDateToActivityDate(row.local_date as Date | string),
        measuredAt: new Date(row.measured_at as Date | string).toISOString(),
        originalValue: Number(row.original_value),
        originalUnit: String(row.original_unit),
        weightKg: Number(row.weight_kg),
        notes: row.notes === null ? null : String(row.notes),
        source: String(row.source),
        confirmationStatus: String(row.confirmation_status),
        confirmedAt: row.confirmed_at ? new Date(row.confirmed_at as Date | string).toISOString() : null,
        isPrimary: Boolean(row.is_primary),
    };
}

export async function getWeightEntries(
    ownerId: string,
    fromDate: ActivityDate,
    toDate: ActivityDate,
    options: { includeEvidenceAssetIds?: boolean } = {},
) {
    assertActivityDate(fromDate);
    assertActivityDate(toDate);
    if (fromDate > toDate) throw new RangeError('Start date must be on or before end date.');
    const sql = getDatabase();
    const rowsPromise = sql`
        SELECT id, local_date, measured_at, original_value, original_unit, weight_kg,
               notes, source, confirmation_status, confirmed_at, is_primary
        FROM accountability_weight_entries
        WHERE owner_id = ${ownerId}
          AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
        ORDER BY local_date DESC, measured_at DESC
    `;
    const rows = await rowsPromise;
    const evidenceRows = options.includeEvidenceAssetIds && rows.length > 0
        ? await sql`
            SELECT evidence.weight_entry_id, evidence.media_asset_id
            FROM accountability_weight_entry_evidence evidence
            JOIN accountability_weight_entries weight
              ON weight.owner_id = evidence.owner_id AND weight.id = evidence.weight_entry_id
            WHERE evidence.owner_id = ${ownerId}
              AND weight.local_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ORDER BY evidence.added_at ASC, evidence.media_asset_id
        `
        : [];
    const evidenceByEntry = new Map<string, string[]>();
    for (const evidence of evidenceRows) {
        const entryId = String(evidence.weight_entry_id);
        const current = evidenceByEntry.get(entryId) ?? [];
        current.push(String(evidence.media_asset_id));
        evidenceByEntry.set(entryId, current);
    }
    const entries = rows.map((row) => ({
        ...mapWeightRow(row),
        ...(options.includeEvidenceAssetIds ? { evidenceAssetIds: evidenceByEntry.get(String(row.id)) ?? [] } : {}),
    }));
    const primary = entries
        .filter((entry) => entry.isPrimary && entry.confirmationStatus === 'confirmed')
        .sort((left, right) => left.date.localeCompare(right.date));
    const first = primary[0] ?? null;
    const latest = primary.at(-1) ?? null;

    const measuredDates = new Set(primary.map((entry) => entry.date));
    const missingDates: ActivityDate[] = [];
    let cursor = fromDate;
    let dayCount = 0;
    while (cursor <= toDate) {
        if (!measuredDates.has(cursor)) missingDates.push(cursor);
        cursor = addActivityDays(cursor, 1);
        dayCount += 1;
        if (dayCount > 366) throw new RangeError('Weight date range is limited to one year.');
    }

    return {
        fromDate,
        toDate,
        entries,
        primaryMeasurements: primary,
        latest,
        firstInRange: first,
        changeFromFirstKg: first && latest ? Number((latest.weightKg - first.weightKg).toFixed(3)) : null,
        missingDates,
    };
}

export type WeightEntryInput = {
    activityDate: ActivityDate;
    measuredAt?: string;
    originalValue: number;
    originalUnit: 'kg' | 'lb' | 'st';
    notes?: string | null;
    source?: 'manual' | 'imported' | 'device' | 'image';
    confirmationStatus?: 'pending' | 'confirmed' | 'rejected';
    isPrimary?: boolean;
    evidenceAssetIds?: string[];
};

function makeWeightMeasuredAt(input: WeightEntryInput): Date {
    if (input.measuredAt) {
        const measured = new Date(input.measuredAt);
        if (Number.isNaN(measured.getTime())) throw new RangeError('Invalid measurement time.');
        if (toIstActivityDate(measured) !== input.activityDate) throw new RangeError('Measurement time must match the selected IST activity date.');
        return measured;
    }
    return getIstDateTime(input.activityDate, '08:00');
}

async function reserveResourceIdempotency(
    tx: postgres.TransactionSql,
    ownerId: string,
    source: UpdateSource,
    operation: string,
    idempotencyKey: string,
    request: unknown,
) {
    const operationKey = `${operation}.${sourceOperationId(source)}`.slice(0, 96);
    const hashedKey = keyDigest(idempotencyKey);
    const hashedRequest = requestDigest(request);
    const inserted = await tx`
        INSERT INTO accountability_idempotency_keys (
            owner_id, operation_key, idempotency_key_hash, request_hash, expires_at
        ) VALUES (
            ${ownerId}, ${operationKey}, ${hashedKey}, ${hashedRequest}, NOW() + INTERVAL '30 days'
        )
        ON CONFLICT (owner_id, operation_key, idempotency_key_hash) DO NOTHING
        RETURNING id
    `;
    if (inserted.length > 0) return { id: Number(inserted[0].id), resultId: null as string | null, duplicate: false };

    const previous = await tx`
        SELECT request_hash, result_resource_id
        FROM accountability_idempotency_keys
        WHERE owner_id = ${ownerId} AND operation_key = ${operationKey}
          AND idempotency_key_hash = ${hashedKey}
        FOR UPDATE
    `;
    if (!previous[0] || !Buffer.from(previous[0].request_hash as Buffer).equals(hashedRequest)) {
        throw new Error('IDEMPOTENCY_CONFLICT');
    }
    return {
        id: null as number | null,
        resultId: previous[0].result_resource_id ? String(previous[0].result_resource_id) : null,
        duplicate: true,
    };
}

export async function createWeightEntry(
    ownerId: string,
    source: UpdateSource,
    idempotencyKey: string,
    input: WeightEntryInput,
) {
    assertActivityDate(input.activityDate);
    if (!idempotencyKey.trim() || idempotencyKey.length > 180) throw new RangeError('An idempotency key is required.');
    const confirmationStatus = input.confirmationStatus ?? (input.source === 'image' ? 'pending' : 'confirmed');
    const isPrimary = input.isPrimary ?? false;
    if (isPrimary && confirmationStatus !== 'confirmed') throw new RangeError('Only a confirmed measurement can be primary.');
    if (input.source === 'image' && (!input.evidenceAssetIds || input.evidenceAssetIds.length === 0)) {
        throw new RangeError('Image-derived readings need a private source image.');
    }
    if (input.source === 'image' && confirmationStatus !== 'pending') {
        throw new RangeError('Image-derived readings must remain pending owner confirmation.');
    }
    if (input.source !== 'image' && input.evidenceAssetIds?.length) {
        throw new RangeError('Private source images are only valid for image-derived readings.');
    }
    const measuredAt = makeWeightMeasuredAt(input);
    const entryId = randomUUID();
    const evidenceIds = [...new Set(input.evidenceAssetIds ?? [])];
    const sql = getDatabase();

    const result = await sql.begin(async (tx) => {
        const idem = await reserveResourceIdempotency(tx, ownerId, source, 'weight.create', idempotencyKey, input);
        if (idem.duplicate) {
            if (!idem.resultId) return { duplicate: true as const, entry: null };
            const existing = await tx`
                SELECT * FROM accountability_weight_entries WHERE owner_id = ${ownerId} AND id = ${idem.resultId}
            `;
            return { duplicate: true as const, entry: existing[0] ? mapWeightRow(existing[0]) : null };
        }

        await tx`SELECT pg_advisory_xact_lock(hashtext(${ownerId}), hashtext(${input.activityDate}))`;

        if (isPrimary) {
            await tx`
                UPDATE accountability_weight_entries
                SET is_primary = FALSE
                WHERE owner_id = ${ownerId} AND local_date = ${input.activityDate}::date
                  AND is_primary AND confirmation_status = 'confirmed'
            `;
        }

        const rows = await tx`
            INSERT INTO accountability_weight_entries (
                id, owner_id, local_date, measured_at, original_value, original_unit,
                notes, source, confirmation_status, confirmed_at, is_primary
            ) VALUES (
                ${entryId}, ${ownerId}, ${input.activityDate}::date, ${measuredAt}, ${input.originalValue},
                ${input.originalUnit}, ${input.notes ?? null}, ${input.source ?? 'manual'},
                ${confirmationStatus}, ${confirmationStatus === 'confirmed' ? new Date() : null}, ${isPrimary}
            )
            RETURNING *
        `;

        for (const mediaAssetId of evidenceIds) {
            const assets = await tx`
                SELECT id FROM accountability_media_assets
                WHERE owner_id = ${ownerId} AND id = ${mediaAssetId} AND status = 'ready'
                  AND content_type IN ('image/jpeg', 'image/png', 'image/webp')
                  AND category IN ('general', 'habit_evidence')
            `;
            if (!assets[0]) throw new RangeError('A private evidence image is unavailable.');
            await tx`
                INSERT INTO accountability_weight_entry_evidence (owner_id, weight_entry_id, media_asset_id, evidence_kind)
                VALUES (${ownerId}, ${entryId}, ${mediaAssetId}, 'source_image')
            `;
        }
        await tx`
            UPDATE accountability_idempotency_keys SET response_status = 201, result_resource_id = ${entryId}
            WHERE owner_id = ${ownerId} AND id = ${idem.id}
        `;
        return { duplicate: false as const, entry: mapWeightRow(rows[0]) };
    });

    return result;
}

export type WeightCorrectionInput = {
    id: string;
    activityDate?: ActivityDate;
    measuredAt?: string;
    originalValue?: number;
    originalUnit?: 'kg' | 'lb' | 'st';
    notes?: string | null;
    confirmationStatus?: 'pending' | 'confirmed' | 'rejected';
    isPrimary?: boolean;
};

export async function correctWeightEntry(
    ownerId: string,
    source: UpdateSource,
    idempotencyKey: string,
    correction: WeightCorrectionInput,
) {
    if (!idempotencyKey.trim() || idempotencyKey.length > 180) throw new RangeError('An idempotency key is required.');
    if (correction.activityDate) assertActivityDate(correction.activityDate);
    const sql = getDatabase();

    return sql.begin(async (tx) => {
        const idem = await reserveResourceIdempotency(tx, ownerId, source, 'weight.correct', idempotencyKey, correction);
        if (idem.duplicate) {
            if (!idem.resultId) return { duplicate: true as const, entry: null };
            const priorRows = await tx`
                SELECT * FROM accountability_weight_entries WHERE owner_id = ${ownerId} AND id = ${idem.resultId}
            `;
            return { duplicate: true as const, entry: priorRows[0] ? mapWeightRow(priorRows[0]) : null };
        }

        const rows = await tx`
            SELECT * FROM accountability_weight_entries
            WHERE owner_id = ${ownerId} AND id = ${correction.id}
            FOR UPDATE
        `;
        const current = rows[0];
        if (!current) throw new Error('WEIGHT_ENTRY_NOT_FOUND');

        const activityDate = correction.activityDate ?? databaseDateToActivityDate(current.local_date as Date | string);
        const measuredAt = correction.measuredAt
            ? makeWeightMeasuredAt({
                activityDate,
                measuredAt: correction.measuredAt,
                originalValue: Number(current.original_value),
                originalUnit: current.original_unit as WeightEntryInput['originalUnit'],
            })
            : new Date(current.measured_at as Date | string);
        if (toIstActivityDate(measuredAt) !== activityDate) throw new RangeError('Measurement time must match the selected IST activity date.');

        const originalValue = correction.originalValue ?? Number(current.original_value);
        const originalUnit = correction.originalUnit ?? current.original_unit as WeightEntryInput['originalUnit'];
        const notes = correction.notes === undefined ? current.notes : correction.notes;
        const confirmationStatus: 'pending' | 'confirmed' | 'rejected' = correction.confirmationStatus
            ?? current.confirmation_status as 'pending' | 'confirmed' | 'rejected';
        const isPrimary = correction.isPrimary ?? Boolean(current.is_primary);
        if (isPrimary && confirmationStatus !== 'confirmed') throw new RangeError('Only a confirmed measurement can be primary.');

        const lockDates = [...new Set([databaseDateToActivityDate(current.local_date as Date | string), activityDate])].sort();
        for (const date of lockDates) {
            await tx`SELECT pg_advisory_xact_lock(hashtext(${ownerId}), hashtext(${date}))`;
        }
        if (isPrimary) {
            await tx`
                UPDATE accountability_weight_entries
                SET is_primary = FALSE
                WHERE owner_id = ${ownerId} AND local_date = ${activityDate}::date
                  AND id <> ${correction.id} AND is_primary AND confirmation_status = 'confirmed'
            `;
        }

        const updated = await tx`
            UPDATE accountability_weight_entries
            SET local_date = ${activityDate}::date,
                measured_at = ${measuredAt},
                original_value = ${originalValue},
                original_unit = ${originalUnit},
                notes = ${notes},
                confirmation_status = ${confirmationStatus},
                confirmed_at = CASE WHEN ${confirmationStatus} = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE NULL END,
                is_primary = ${isPrimary},
                created_at = created_at
            WHERE owner_id = ${ownerId} AND id = ${correction.id}
            RETURNING *
        `;
        await tx`
            INSERT INTO accountability_audit_events (id, owner_id, event_type, entity_id)
            VALUES (${randomUUID()}, ${ownerId}, 'weight.corrected', ${correction.id})
        `;
        await tx`
            UPDATE accountability_idempotency_keys SET response_status = 200, result_resource_id = ${correction.id}
            WHERE owner_id = ${ownerId} AND id = ${idem.id}
        `;
        return { duplicate: false as const, entry: mapWeightRow(updated[0]) };
    });
}

export function getTodayActivityDate(now = new Date()): ActivityDate {
    return toIstActivityDate(now);
}

export function shiftActivityDate(date: ActivityDate, offsetDays: number): ActivityDate {
    return addActivityDays(date, offsetDays);
}
