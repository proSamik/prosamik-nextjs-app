import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    ACTIVITY_TIME_ZONE,
    NO_FAP_WEEKLY_WIN_MINIMUM_SUCCESS_DAYS,
    addActivityDays,
    assertActivityDate,
    buildCheckInDeduplicationKey,
    buildCheckInReminderDeduplicationKey,
    canAcceptExplicitCheckInAnswer,
    canDispatchCheckInReminder,
    calculateNoFapWeeklyStreak,
    calculateHabitStreak,
    getActivityWeekBounds,
    getIstDateTimeIso,
    getMondayStartOfWeek,
    isCheckInReminderDue,
    matchCheckInSlot,
    summarizeNoFapWeek,
    shouldSuppressReminderOnAnswer,
    toIstActivityDate,
} from '../src/lib/accountability-domain.ts';

test('maps instants to the same IST activity date independent of UTC date boundary', () => {
    assert.equal(ACTIVITY_TIME_ZONE, 'Asia/Kolkata');
    assert.equal(toIstActivityDate('2026-10-06T18:29:59.000Z'), '2026-10-06');
    assert.equal(toIstActivityDate('2026-10-06T18:30:00.000Z'), '2026-10-07');
    assert.equal(toIstActivityDate('2026-10-07T00:00:00+05:30'), '2026-10-07');
    assert.equal(toIstActivityDate('2026-10-07'), '2026-10-07');
    assert.throws(() => toIstActivityDate('2026-10-07T00:00:00'), /RFC 3339/);
    assert.throws(() => toIstActivityDate('2026-02-29'), /Invalid activity date/);
});

test('validates and shifts calendar dates without UTC or DST drift', () => {
    assert.equal(assertActivityDate('2024-02-29'), '2024-02-29');
    assert.equal(addActivityDays('2024-02-29', 1), '2024-03-01');
    assert.equal(addActivityDays('2026-01-01', -1), '2025-12-31');
    assert.throws(() => addActivityDays('2026-01-01', 1.5), /integer/);
});

test('uses Monday-start week bounds across month and year boundaries', () => {
    assert.equal(getMondayStartOfWeek('2026-10-07'), '2026-10-05');
    assert.deepEqual(getActivityWeekBounds('2026-01-01'), {
        start: '2025-12-29',
        end: '2026-01-04',
    });
});

test('does not punish an unfinished current habit day, but counts a completed one', () => {
    const previousDays = [
        { date: '2026-10-04', status: 'complete' },
        { date: '2026-10-05', status: 'complete' },
        { date: '2026-10-06', status: 'complete' },
        { date: '2026-10-07', status: 'incomplete' },
    ];
    assert.deepEqual(calculateHabitStreak(previousDays, '2026-10-07'), {
        currentStreak: 3,
        currentStartDate: '2026-10-04',
        currentEndDate: '2026-10-06',
        currentBreakReason: 'unknown',
        longestStreak: 3,
        longestStartDate: '2026-10-04',
        longestEndDate: '2026-10-06',
    });

    const completedToday = calculateHabitStreak([
        ...previousDays.slice(0, 3),
        { date: '2026-10-07', status: 'complete' },
    ], '2026-10-07');
    assert.equal(completedToday.currentStreak, 4);
    assert.equal(completedToday.currentEndDate, '2026-10-07');
});

test('distinguishes an explicit incomplete day from an unknown missing day', () => {
    const incomplete = calculateHabitStreak([
        { date: '2026-10-05', status: 'complete' },
        { date: '2026-10-06', status: 'incomplete' },
    ], '2026-10-07');
    assert.equal(incomplete.currentStreak, 0);
    assert.equal(incomplete.currentBreakReason, 'incomplete');
    assert.equal(incomplete.longestStreak, 1);

    const unknown = calculateHabitStreak([
        { date: '2026-10-05', status: 'complete' },
    ], '2026-10-07');
    assert.equal(unknown.currentStreak, 0);
    assert.equal(unknown.currentBreakReason, 'unknown');
    assert.equal(unknown.longestStreak, 1);
});

test('ignores future logs and rejects conflicting duplicate habit dates', () => {
    const summary = calculateHabitStreak([
        { date: '2026-10-07', status: 'complete' },
        { date: '2026-10-08', status: 'complete' },
    ], '2026-10-07');
    assert.equal(summary.currentStreak, 1);
    assert.equal(summary.longestStreak, 1);
    assert.throws(() => calculateHabitStreak([
        { date: '2026-10-07', status: 'complete' },
        { date: '2026-10-07', status: 'incomplete' },
    ], '2026-10-07'), /Duplicate habit day/);
});

test('awards the no-fap weekly win for five distinct success dates only', () => {
    const dates = [
        '2026-10-05', '2026-10-05', '2026-10-06', '2026-10-07',
        '2026-10-08', '2026-10-09', '2026-10-11', '2026-10-12',
    ];
    assert.equal(NO_FAP_WEEKLY_WIN_MINIMUM_SUCCESS_DAYS, 5);
    assert.deepEqual(summarizeNoFapWeek(dates, '2026-10-07'), {
        weekStart: '2026-10-05',
        weekEnd: '2026-10-11',
        successDates: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-11'],
        successDays: 6,
        minimumSuccessDays: 5,
        isWin: true,
    });
    const belowThreshold = summarizeNoFapWeek(
        ['2026-10-05', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-12'],
        '2026-10-07',
    );
    assert.equal(belowThreshold.successDays, 3);
    assert.equal(belowThreshold.isWin, false);
});

test('keeps prior no-fap weekly streak while the current week is unfinished', () => {
    const twoWinningWeeks = [
        '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
        '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02',
        '2026-10-05', '2026-10-06',
    ];
    const unfinished = calculateNoFapWeeklyStreak(twoWinningWeeks, '2026-10-07');
    assert.equal(unfinished.currentWeek.successDays, 2);
    assert.equal(unfinished.currentWeek.isWin, false);
    assert.equal(unfinished.consecutiveWinningWeeks, 2);
    assert.equal(unfinished.longestWinningWeeks, 2);
    assert.equal(unfinished.isCurrentWeekInProgress, true);

    const reachedGoal = calculateNoFapWeeklyStreak([
        ...twoWinningWeeks,
        '2026-10-07', '2026-10-08', '2026-10-09',
    ], '2026-10-09');
    assert.equal(reachedGoal.currentWeek.successDays, 5);
    assert.equal(reachedGoal.currentWeek.isWin, true);
    assert.equal(reachedGoal.consecutiveWinningWeeks, 3);
});

test('converts IST check-in slots into correct UTC reminder instants', () => {
    assert.equal(getIstDateTimeIso('2026-10-07', '00:15'), '2026-10-06T18:45:00.000Z');
    assert.equal(getIstDateTimeIso('2026-10-07', '09:00'), '2026-10-07T03:30:00.000Z');
    assert.throws(() => getIstDateTimeIso('2026-10-07', '24:00'), /Invalid local time/);
});

test('matches the nearest check-in slot within the inclusive local-time window', () => {
    const slots = [
        { id: 'evening', localTime: '20:00' },
        { id: 'morning', localTime: '09:00' },
    ];
    assert.equal(matchCheckInSlot('2026-10-07T14:31:00Z', slots)?.id, 'evening');
    assert.equal(matchCheckInSlot('2026-10-07T16:01:00Z', slots), null);
    assert.equal(matchCheckInSlot('2026-10-07T00:00:00Z', [
        { id: 'morning', localTime: '06:00' },
    ]), null, 'a response before 06:00 must not satisfy the future morning slot');
    assert.equal(matchCheckInSlot('2026-10-07T00:30:00Z', [
        { id: 'morning', localTime: '06:00' },
    ])?.id, 'morning', 'a response within one hour after the slot qualifies');
    assert.equal(matchCheckInSlot('2026-10-07T14:30:00Z', [
        { id: 'z-slot', localTime: '19:30' },
        { id: 'a-slot', localTime: '20:30' },
    ])?.id, 'z-slot');
    assert.equal(matchCheckInSlot('2026-10-07T14:30:00Z', [
        { id: 'z-slot', localTime: '20:00' },
        { id: 'a-slot', localTime: '20:00' },
    ])?.id, 'a-slot');
    assert.equal(matchCheckInSlot('2026-10-07T18:40:00Z', [
        { id: 'midnight', localTime: '23:50' },
    ]), null);
    assert.throws(() => matchCheckInSlot('2026-10-07T14:00:00Z', slots, -1), /window/);
});

test('marks reminders due only on the scheduled IST date and deduplicates by user/date/slot', () => {
    const slot = { id: 'evening', localTime: '20:00' };
    assert.equal(isCheckInReminderDue('2026-10-07T14:29:59Z', '2026-10-07', slot), false);
    assert.equal(isCheckInReminderDue('2026-10-07T14:30:00Z', '2026-10-07', slot), true);
    assert.equal(isCheckInReminderDue('2026-10-07T14:31:00Z', '2026-10-07', slot, true), false);
    assert.equal(isCheckInReminderDue('2026-10-07T18:31:00Z', '2026-10-07', slot), false);

    assert.equal(
        buildCheckInDeduplicationKey('user:7', '2026-10-07', 'evening'),
        'check-in:v1:user%3A7:2026-10-07:evening',
    );
    assert.equal(
        buildCheckInReminderDeduplicationKey('user:7', '2026-10-07', 'evening'),
        'check-in-reminder:v1:user%3A7:2026-10-07:evening',
    );
    assert.throws(() => buildCheckInDeduplicationKey('', '2026-10-07', 'evening'), /User id/);
});

test('allows a late explicit answer to a missed slot and suppresses an unsent reminder', () => {
    assert.equal(canAcceptExplicitCheckInAnswer('missed'), true);
    assert.equal(canAcceptExplicitCheckInAnswer('pending'), true);
    assert.equal(canAcceptExplicitCheckInAnswer('answered'), false);
    assert.equal(shouldSuppressReminderOnAnswer('scheduled'), true);
    assert.equal(shouldSuppressReminderOnAnswer('claimed'), true);
    assert.equal(shouldSuppressReminderOnAnswer('sent'), false);

    const dueAt = '2026-10-07T01:30:00Z'; // 07:00 IST reminder for the 06:00 slot
    const slot = { id: 'morning', localTime: '06:00' };
    assert.equal(canDispatchCheckInReminder('missed', 'claimed', dueAt, '2026-10-07', slot), true);
    assert.equal(canDispatchCheckInReminder('answered', 'claimed', dueAt, '2026-10-07', slot), false);
});
