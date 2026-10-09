import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/database';
import {
    FoodEntryRequestSchema,
    FoodEntryCorrectRequestSchema,
} from '@/lib/accountability-contract';
import {
    assertActivityDate,
    databaseDateToActivityDate,
    toIstActivityDate,
    getIstDateTime,
    calculateHabitStreak,
} from '@/lib/accountability-domain';
import {
    getTodayActivityDate,
    reserveResourceIdempotency,
    type UpdateSource,
} from '@/lib/accountability-service';
import type { z } from 'zod';

type FoodInput = z.input<typeof FoodEntryRequestSchema> & { id?: string };
export async function saveFoodEntry(
    ownerId: string,
    source: UpdateSource,
    key: string,
    raw: FoodInput,
) {
    const input = raw.id
        ? FoodEntryCorrectRequestSchema.parse(raw)
        : FoodEntryRequestSchema.parse(raw);
    const date = assertActivityDate(input.activityDate);
    if (date > getTodayActivityDate())
        throw new RangeError('Food cannot be logged for a future date.');
    if (!key.trim() || key.length > 180)
        throw new RangeError('A bounded idempotency key is required.');
    const consumedAt = input.consumedAt
        ? new Date(input.consumedAt)
        : getIstDateTime(date, '12:00');
    if (toIstActivityDate(consumedAt) !== date)
        throw new RangeError(
            'The meal time must fall on the selected IST date.',
        );
    const ids = [...new Set(input.evidenceAssetIds)];
    const id = raw.id ?? randomUUID();
    const sql = getDatabase();
    const result = await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtext('accountability.food'), hashtext(${ownerId}))`;
        const idem = await reserveResourceIdempotency(
            tx,
            ownerId,
            source,
            raw.id ? 'food.correct' : 'food.create',
            key,
            input,
        );
        if (idem.duplicate) return { id: idem.resultId, duplicate: true };
        if (raw.id) {
            const found =
                await tx`SELECT id FROM accountability_food_entries WHERE owner_id=${ownerId} AND id=${id} FOR UPDATE`;
            if (!found.length) throw new RangeError('Food entry not found.');
        }
        if (ids.length) {
            const assets =
                await tx`SELECT id FROM accountability_media_assets WHERE owner_id=${ownerId} AND id=ANY(${ids}::uuid[]) AND local_date=${date}::date AND status='ready' AND content_type IN ('image/jpeg','image/png','image/webp') AND content_sha256 IS NOT NULL`;
            if (assets.length !== ids.length)
                throw new RangeError(
                    'Use ready images owned by this account on the same meal date.',
                );
        }
        if (raw.id) {
            await tx`UPDATE accountability_food_entries SET local_date=${date}::date, consumed_at=${consumedAt}, item=${input.item}, portion=${input.portion ?? null}, calories=${input.calories}, calorie_source=${input.calories === null ? 'unknown' : input.calorieSource}, notes=${input.notes ?? null}, updated_at=NOW() WHERE owner_id=${ownerId} AND id=${id}`;
            await tx`DELETE FROM accountability_food_entry_evidence WHERE owner_id=${ownerId} AND food_entry_id=${id}`;
        } else {
            await tx`INSERT INTO accountability_food_entries(id,owner_id,local_date,consumed_at,item,portion,calories,calorie_source,notes) VALUES(${id},${ownerId},${date}::date,${consumedAt},${input.item},${input.portion ?? null},${input.calories},${input.calories === null ? 'unknown' : input.calorieSource},${input.notes ?? null})`;
        }
        for (const asset of ids)
            await tx`INSERT INTO accountability_food_entry_evidence(owner_id,food_entry_id,media_asset_id) VALUES(${ownerId},${id},${asset})`;
        await tx`UPDATE accountability_idempotency_keys SET result_resource_id=${id} WHERE owner_id=${ownerId} AND id=${idem.id}`;
        return { id, duplicate: false };
    });
    // A retry of create returns the originally reserved resource, never a fresh ID.
    return result;
}
export async function getFoodEntries(
    ownerId: string,
    fromDate: string,
    toDate: string,
    includeImages = false,
) {
    assertActivityDate(fromDate);
    assertActivityDate(toDate);
    if (
        fromDate > toDate ||
        toDate > getTodayActivityDate() ||
        (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000 >
            3660
    )
        throw new RangeError('Invalid food date range.');
    const sql = getDatabase();
    const rows =
        await sql`SELECT f.*, COALESCE((SELECT json_agg(e.media_asset_id) FROM accountability_food_entry_evidence e WHERE e.owner_id=f.owner_id AND e.food_entry_id=f.id),'[]'::json) AS image_ids FROM accountability_food_entries f WHERE owner_id=${ownerId} AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date ORDER BY consumed_at DESC LIMIT 20000`;
    const entries = rows.map((row) => ({
        id: String(row.id),
        date: databaseDateToActivityDate(row.local_date as Date | string),
        consumedAt: new Date(row.consumed_at as Date | string).toISOString(),
        item: String(row.item),
        portion: row.portion,
        calories: row.calories === null ? null : Number(row.calories),
        calorieSource: row.calorie_source,
        notes: row.notes,
        ...(includeImages ? { evidenceAssetIds: row.image_ids } : {}),
    }));
    const daily = new Map<
        string,
        {
            date: string;
            calories: number;
            entryCount: number;
            unknownCalories: number;
        }
    >();
    for (const entry of entries) {
        const day = daily.get(entry.date) ?? {
            date: entry.date,
            calories: 0,
            entryCount: 0,
            unknownCalories: 0,
        };
        day.entryCount++;
        if (entry.calories === null) day.unknownCalories++;
        else day.calories += entry.calories;
        daily.set(entry.date, day);
    }
    return {
        entries,
        days: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
        streak: calculateHabitStreak(
            [...daily.keys()].map((date) => ({
                date,
                status: 'complete' as const,
            })),
            toDate,
        ),
        truncated: rows.length === 20000,
    };
}
