/**
 * Pure date and scoring helpers for the private accountability features.
 *
 * All user-facing activity dates are calendar dates in India Standard Time
 * (Asia/Kolkata), regardless of the server or browser's configured time zone.
 */

export const ACTIVITY_TIME_ZONE = 'Asia/Kolkata';
export const NO_FAP_WEEKLY_WIN_MINIMUM_SUCCESS_DAYS = 5;

export type ActivityDate = string;
export type HabitDayStatus = 'complete' | 'incomplete' | 'unknown';

export interface HabitDay {
    date: ActivityDate;
    status: HabitDayStatus;
}

export interface HabitStreakSummary {
    /** Consecutive confirmed complete days ending today, or yesterday if today is unfinished. */
    currentStreak: number;
    currentStartDate: ActivityDate | null;
    currentEndDate: ActivityDate | null;
    /** The status that stopped the current run. Missing history is reported as unknown. */
    currentBreakReason: 'incomplete' | 'unknown' | null;
    /** Longest run of adjacent, confirmed complete days through the as-of date. */
    longestStreak: number;
    longestStartDate: ActivityDate | null;
    longestEndDate: ActivityDate | null;
}

export interface CheckInSlot {
    id: string;
    /** A 24-hour wall-clock time in Asia/Kolkata, formatted as HH:mm. */
    localTime: string;
}

export type CheckInStatus = 'pending' | 'answered' | 'missed';
export type ReminderDeliveryStatus = 'not_scheduled' | 'scheduled' | 'claimed' | 'sent' | 'failed' | 'suppressed';

export interface NoFapWeekSummary {
    weekStart: ActivityDate;
    weekEnd: ActivityDate;
    successDates: ActivityDate[];
    successDays: number;
    minimumSuccessDays: number;
    isWin: boolean;
}

export interface NoFapWeeklyStreakSummary {
    currentWeek: NoFapWeekSummary;
    /** An unfinished current week cannot reset the streak from completed weeks. */
    consecutiveWinningWeeks: number;
    longestWinningWeeks: number;
    isCurrentWeekInProgress: true;
}

const ACTIVITY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RFC3339_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;
const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** Validate and return a canonical ISO calendar date (YYYY-MM-DD). */
export function assertActivityDate(value: string): ActivityDate {
    const match = ACTIVITY_DATE_PATTERN.exec(value);
    if (!match) throw new RangeError(`Invalid activity date: ${value}`);

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(0);
    parsed.setUTCHours(0, 0, 0, 0);
    parsed.setUTCFullYear(year, month - 1, day);
    if (parsed.toISOString().slice(0, 10) !== value) {
        throw new RangeError(`Invalid activity date: ${value}`);
    }

    return value;
}

/** Convert PostgreSQL DATE results to an IST activity-date string safely. */
export function databaseDateToActivityDate(value: string | Date): ActivityDate {
    if (value instanceof Date) {
        if (!Number.isFinite(value.getTime())) throw new RangeError('Invalid database activity date.');
        const year = String(value.getUTCFullYear()).padStart(4, '0');
        const month = String(value.getUTCMonth() + 1).padStart(2, '0');
        const day = String(value.getUTCDate()).padStart(2, '0');
        return assertActivityDate(`${year}-${month}-${day}`);
    }
    return assertActivityDate(value.slice(0, 10));
}

/**
 * Convert an instant to its IST activity date. Date-only strings are accepted
 * as already-local activity dates; timestamp strings must include a UTC or
 * numeric offset so the result never depends on the process time zone.
 */
export function toIstActivityDate(value: Date | string): ActivityDate {
    if (typeof value === 'string' && ACTIVITY_DATE_PATTERN.test(value)) {
        return assertActivityDate(value);
    }

    const instant = typeof value === 'string'
        ? RFC3339_INSTANT_PATTERN.test(value) ? new Date(value) : new Date(Number.NaN)
        : value;
    if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
        throw new RangeError('Expected a valid Date or an RFC 3339 timestamp with an explicit offset.');
    }

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: ACTIVITY_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
    const year = part('year');
    const month = part('month');
    const day = part('day');
    if (!year || !month || !day) throw new RangeError('Could not determine the IST activity date.');
    return assertActivityDate(`${year.padStart(4, '0')}-${month}-${day}`);
}

/** Add or subtract whole Gregorian calendar days without local-time/DST effects. */
export function addActivityDays(value: ActivityDate, amount: number): ActivityDate {
    assertActivityDate(value);
    if (!Number.isInteger(amount)) throw new RangeError('Day offset must be an integer.');

    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return assertActivityDate(date.toISOString().slice(0, 10));
}

/** Return the Monday on or before the supplied activity date. */
export function getMondayStartOfWeek(value: ActivityDate): ActivityDate {
    assertActivityDate(value);
    const date = new Date(`${value}T00:00:00.000Z`);
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    return addActivityDays(value, -daysSinceMonday);
}

/** Return an inclusive Monday-Sunday week containing the supplied date. */
export function getActivityWeekBounds(value: ActivityDate): { start: ActivityDate; end: ActivityDate } {
    const start = getMondayStartOfWeek(value);
    return { start, end: addActivityDays(start, 6) };
}

/** Convert an IST calendar date and HH:mm wall time to the corresponding UTC instant. */
export function getIstDateTime(date: ActivityDate, localTime: string): Date {
    assertActivityDate(date);
    const match = LOCAL_TIME_PATTERN.exec(localTime);
    if (!match) throw new RangeError(`Invalid local time: ${localTime}`);

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new RangeError(`Invalid local time: ${localTime}`);

    const utcDate = new Date(`${date}T00:00:00.000Z`);
    const instant = utcDate.getTime() + (hour * 60 + minute - IST_OFFSET_MINUTES) * 60_000;
    return new Date(instant);
}

/** Return a stable UTC timestamp string for an IST wall-clock slot. */
export function getIstDateTimeIso(date: ActivityDate, localTime: string): string {
    return getIstDateTime(date, localTime).toISOString();
}

/**
 * Match a response to a slot only during the inclusive window after that slot.
 * A response before its scheduled time can never satisfy a future slot. Ties
 * resolve by localTime and then id, so the answer is stable regardless of order.
 */
export function matchCheckInSlot(
    instant: Date | string,
    slots: readonly CheckInSlot[],
    windowMinutes = 60,
): CheckInSlot | null {
    if (!Number.isInteger(windowMinutes) || windowMinutes < 0 || windowMinutes > 720) {
        throw new RangeError('Slot matching window must be an integer from 0 to 720 minutes.');
    }

    const timestamp = parseInstant(instant);
    const localTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: ACTIVITY_TIME_ZONE,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(timestamp);
    const currentMinute = parseLocalTime(localTime);

    const candidates = slots.map((slot) => {
        const scheduledMinute = parseLocalTime(slot.localTime);
        return { slot, elapsed: currentMinute - scheduledMinute, scheduledMinute };
    }).filter((candidate) => candidate.elapsed >= 0 && candidate.elapsed <= windowMinutes);

    candidates.sort((first, second) => first.elapsed - second.elapsed
        || first.scheduledMinute - second.scheduledMinute
        || first.slot.id.localeCompare(second.slot.id));
    return candidates[0]?.slot ?? null;
}

/**
 * A reminder is due only on its scheduled IST date, at or after the slot time,
 * and before that same slot has already been sent. This prevents stale next-day
 * reminders and lets a missed scheduler tick catch up later that day.
 */
export function isCheckInReminderDue(
    now: Date | string,
    date: ActivityDate,
    slot: CheckInSlot,
    alreadySentForDate = false,
): boolean {
    assertActivityDate(date);
    const dueAt = getIstDateTime(date, slot.localTime).getTime();
    const current = parseInstant(now);
    return !alreadySentForDate
        && toIstActivityDate(current) === date
        && current.getTime() >= dueAt;
}

/** Explicitly answering an existing missed slot is allowed; auto-matching stays time-windowed. */
export function canAcceptExplicitCheckInAnswer(status: CheckInStatus): boolean {
    return status === 'pending' || status === 'missed';
}

/** An unsent reminder is suppressed when its exact slot receives a response. */
export function shouldSuppressReminderOnAnswer(status: ReminderDeliveryStatus): boolean {
    return status === 'not_scheduled' || status === 'scheduled' || status === 'claimed';
}

/** The sender must re-check the slot immediately before attempting delivery. */
export function canDispatchCheckInReminder(
    slotStatus: CheckInStatus,
    reminderStatus: ReminderDeliveryStatus,
    now: Date | string,
    date: ActivityDate,
    slot: CheckInSlot,
): boolean {
    const [hourText, minuteText] = slot.localTime.split(':');
    const reminderMinute = Number(hourText) * 60 + Number(minuteText) + 60;
    const reminderDate = reminderMinute >= 24 * 60 ? addActivityDays(date, 1) : date;
    const reminderTime = `${String(Math.floor(reminderMinute / 60) % 24).padStart(2, '0')}:${String(reminderMinute % 60).padStart(2, '0')}`;
    return slotStatus !== 'answered'
        && reminderStatus === 'claimed'
        && isCheckInReminderDue(now, reminderDate, { ...slot, localTime: reminderTime });
}

/**
 * Canonical idempotency identity for one check-in per user, local date, slot.
 * Persist this as a uniqueness key to make retries safe.
 */
export function buildCheckInDeduplicationKey(
    userId: string,
    date: ActivityDate,
    slotId: string,
): string {
    return buildDeduplicationKey('check-in:v1', userId, date, slotId);
}

/** Canonical once-per-user/date/slot idempotency identity for a reminder. */
export function buildCheckInReminderDeduplicationKey(
    userId: string,
    date: ActivityDate,
    slotId: string,
): string {
    return buildDeduplicationKey('check-in-reminder:v1', userId, date, slotId);
}

/**
 * Count unique success dates in the Monday-Sunday week containing weekOfDate.
 * The weekly win threshold is five distinct calendar days, not five events.
 */
export function summarizeNoFapWeek(
    successDates: readonly ActivityDate[],
    weekOfDate: ActivityDate,
): NoFapWeekSummary {
    const { start, end } = getActivityWeekBounds(weekOfDate);
    const uniqueDates = new Set(successDates.map(assertActivityDate));
    const dates = [...uniqueDates]
        .filter((date) => date >= start && date <= end)
        .sort();

    return {
        weekStart: start,
        weekEnd: end,
        successDates: dates,
        successDays: dates.length,
        minimumSuccessDays: NO_FAP_WEEKLY_WIN_MINIMUM_SUCCESS_DAYS,
        isWin: dates.length >= NO_FAP_WEEKLY_WIN_MINIMUM_SUCCESS_DAYS,
    };
}

/** Count consecutive Monday-start winning weeks, preserving the previous run while this week is unfinished. */
export function calculateNoFapWeeklyStreak(
    successDates: readonly ActivityDate[],
    asOfDate: ActivityDate,
): NoFapWeeklyStreakSummary {
    assertActivityDate(asOfDate);
    const dates = [...new Set(successDates.map(assertActivityDate))].filter((date) => date <= asOfDate);
    const weekStartByDate = new Map<ActivityDate, number>();
    for (const date of dates) {
        const weekStart = getMondayStartOfWeek(date);
        weekStartByDate.set(weekStart, (weekStartByDate.get(weekStart) || 0) + 1);
    }

    const winningWeekStarts = new Set(
        [...weekStartByDate]
            .filter(([, count]) => count >= NO_FAP_WEEKLY_WIN_MINIMUM_SUCCESS_DAYS)
            .map(([weekStart]) => weekStart),
    );
    const currentWeek = summarizeNoFapWeek(dates, asOfDate);
    const currentStart = currentWeek.weekStart;
    let streakStart = winningWeekStarts.has(currentStart) ? currentStart : addActivityDays(currentStart, -7);
    let consecutiveWinningWeeks = 0;
    while (winningWeekStarts.has(streakStart)) {
        consecutiveWinningWeeks += 1;
        streakStart = addActivityDays(streakStart, -7);
    }

    const orderedWins = [...winningWeekStarts].sort();
    let longestWinningWeeks = 0;
    let runLength = 0;
    let previousStart: ActivityDate | null = null;
    for (const weekStart of orderedWins) {
        runLength = previousStart && weekStart === addActivityDays(previousStart, 7) ? runLength + 1 : 1;
        longestWinningWeeks = Math.max(longestWinningWeeks, runLength);
        previousStart = weekStart;
    }

    return {
        currentWeek,
        consecutiveWinningWeeks,
        longestWinningWeeks,
        isCurrentWeekInProgress: true,
    };
}

/**
 * Score the current and longest confirmed daily habit runs.
 *
 * A missing day is `unknown`, not a miss. Unknown and explicit incomplete days
 * both stop a historical run, but remain distinguishable in currentBreakReason.
 * An unfinished current day (`incomplete` or absent/unknown) is not allowed to
 * break yesterday's current streak; an explicitly completed current day counts.
 */
export function calculateHabitStreak(
    days: readonly HabitDay[],
    asOfDate: ActivityDate,
): HabitStreakSummary {
    assertActivityDate(asOfDate);
    const statusByDate = new Map<ActivityDate, HabitDayStatus>();
    for (const day of days) {
        assertActivityDate(day.date);
        if (!isHabitDayStatus(day.status)) throw new RangeError(`Invalid habit day status: ${day.status}`);
        if (statusByDate.has(day.date)) throw new RangeError(`Duplicate habit day: ${day.date}`);
        statusByDate.set(day.date, day.status);
    }

    const todayStatus = statusByDate.get(asOfDate) ?? 'unknown';
    const currentEndDate = todayStatus === 'complete' ? asOfDate : addActivityDays(asOfDate, -1);
    const earliestRecordedDate = earliestDate(statusByDate, currentEndDate);
    let cursor = currentEndDate;
    let currentStreak = 0;
    let currentStartDate: ActivityDate | null = null;
    let currentBreakReason: HabitStreakSummary['currentBreakReason'] = null;

    while (cursor >= earliestRecordedDate) {
        const status = statusByDate.get(cursor) ?? 'unknown';
        if (status !== 'complete') {
            currentBreakReason = status;
            break;
        }
        currentStreak += 1;
        currentStartDate = cursor;
        cursor = addActivityDays(cursor, -1);
    }
    if (currentBreakReason === null) currentBreakReason = 'unknown';

    const completeDates = [...statusByDate.entries()]
        .filter(([date, status]) => date <= asOfDate && status === 'complete')
        .map(([date]) => date)
        .sort();
    let longestStreak = 0;
    let longestStartDate: ActivityDate | null = null;
    let longestEndDate: ActivityDate | null = null;
    let runStart: ActivityDate | null = null;
    let runLength = 0;
    let previousDate: ActivityDate | null = null;

    for (const date of completeDates) {
        if (previousDate === null || date !== addActivityDays(previousDate, 1)) {
            runStart = date;
            runLength = 1;
        } else {
            runLength += 1;
        }

        if (runLength > longestStreak) {
            longestStreak = runLength;
            longestStartDate = runStart;
            longestEndDate = date;
        }
        previousDate = date;
    }

    return {
        currentStreak,
        currentStartDate,
        currentEndDate: currentStreak > 0 ? currentEndDate : null,
        currentBreakReason,
        longestStreak,
        longestStartDate,
        longestEndDate,
    };
}

function parseInstant(value: Date | string): Date {
    const instant = typeof value === 'string'
        ? RFC3339_INSTANT_PATTERN.test(value) ? new Date(value) : new Date(Number.NaN)
        : value;
    if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
        throw new RangeError('Expected a valid Date or an RFC 3339 timestamp with an explicit offset.');
    }
    return instant;
}

function parseLocalTime(value: string): number {
    const match = LOCAL_TIME_PATTERN.exec(value);
    if (!match) throw new RangeError(`Invalid local time: ${value}`);
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new RangeError(`Invalid local time: ${value}`);
    return hour * 60 + minute;
}

function isHabitDayStatus(value: string): value is HabitDayStatus {
    return value === 'complete' || value === 'incomplete' || value === 'unknown';
}

function earliestDate(statusByDate: Map<ActivityDate, HabitDayStatus>, fallback: ActivityDate): ActivityDate {
    let earliest = fallback;
    for (const date of statusByDate.keys()) {
        if (date < earliest) earliest = date;
    }
    return earliest;
}

function buildDeduplicationKey(prefix: string, userId: string, date: ActivityDate, slotId: string): string {
    if (!userId.trim()) throw new RangeError('User id is required for a deduplication key.');
    if (!slotId.trim()) throw new RangeError('Slot id is required for a deduplication key.');
    assertActivityDate(date);
    return [prefix, encodeURIComponent(userId), date, encodeURIComponent(slotId)].join(':');
}
