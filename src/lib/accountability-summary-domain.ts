import { createHash } from 'node:crypto';
import { HABITS, type HabitKey } from './accountability-constants.ts';
import type { ActivityDate } from './accountability-domain.ts';

export const SUMMARY_FOOTER = 'posted by Ullu 🦉';

/** Only fixed, non-sensitive habit labels may be used for an automatic draft. */
export function buildDailySummaryDraft(activityDate: ActivityDate, completedHabitKeys: readonly string[]) {
    const completed = new Set(completedHabitKeys);
    const labels = HABITS
        .filter((habit) => completed.has(habit.key))
        .map((habit) => habit.label.toLowerCase());
    const lead = labels.length
        ? `Today I made progress on ${labels.join(', ')}.`
        : 'A day for steady progress and fresh starts.';

    return {
        title: `Daily Summary — ${activityDate} IST`,
        body: `${lead}\n\n${SUMMARY_FOOTER}`,
    };
}

/** Keep the selected IST activity date visible even when the owner edits a title. */
export function normalizeSummaryTitle(title: string, activityDate: ActivityDate): string {
    const clean = title.trim();
    if (!clean) throw new RangeError('A summary title is required.');
    if (clean.includes(activityDate) && /\bIST\b/i.test(clean)) return clean;
    if (clean.includes(activityDate)) return `${clean} IST`;
    return `${clean} — ${activityDate} IST`;
}

/** Always make the canonical footer the literal end of a draft body. */
export function normalizeSummaryBody(body: string): string {
    const trimmed = body.trimEnd();
    const content = trimmed.endsWith(SUMMARY_FOOTER)
        ? trimmed.slice(0, -SUMMARY_FOOTER.length).trimEnd()
        : trimmed;
    return content ? `${content}\n\n${SUMMARY_FOOTER}` : SUMMARY_FOOTER;
}

/** Bind approval to the exact title/body pair with an unambiguous encoding. */
export function summaryTextSha256(title: string | null, body: string): Buffer {
    return createHash('sha256')
        .update(JSON.stringify({ title, body }), 'utf8')
        .digest();
}

export function isPublicSummaryHabitKey(value: string): value is HabitKey {
    return HABITS.some((habit) => habit.key === value);
}

/** Reuse the owner's exact source/hash derivative, including a concurrent winner. */
export async function reuseOrCreateSummaryDerivative<T>(
    findExisting: () => Promise<T | null>,
    create: () => Promise<T>,
): Promise<{ value: T; created: boolean }> {
    const existing = await findExisting();
    if (existing !== null) return { value: existing, created: false };
    try {
        return { value: await create(), created: true };
    } catch (error) {
        // A database unique key on owner/source/hash serializes concurrent
        // preparations. The loser re-reads and returns the exact winner.
        const winner = await findExisting();
        if (winner !== null) return { value: winner, created: false };
        throw error;
    }
}
