'use client';

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Minus, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type DateTimeRangeValue = {
    start: Date | null;
    end: Date | null;
};

type DateTimeRangeFilterProps = {
    value: DateTimeRangeValue;
    onChange: (value: DateTimeRangeValue) => void;
};

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

function endOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
}

function sameDay(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
        && first.getMonth() === second.getMonth()
        && first.getDate() === second.getDate();
}

function isWithinRange(day: Date, range: DateTimeRangeValue): boolean {
    if (!range.start) return false;
    const value = startOfDay(day).getTime();
    const start = startOfDay(range.start).getTime();
    const end = range.end ? startOfDay(range.end).getTime() : start;
    return value >= Math.min(start, end) && value <= Math.max(start, end);
}

function formatRange(value: DateTimeRangeValue): string {
    if (!value.start) return 'Any date or time';

    const formatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    if (!value.end) return `From ${formatter.format(value.start)}`;
    return `${formatter.format(value.start)} – ${formatter.format(value.end)}`;
}

function updateTime(date: Date, unit: 'hour' | 'minute', delta: number): Date {
    const next = new Date(date);
    if (unit === 'hour') {
        next.setHours((next.getHours() + delta + 24) % 24);
    } else {
        next.setMinutes((next.getMinutes() + delta + 60) % 60);
    }
    return next;
}

function TimeControl({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Date;
    onChange: (date: Date) => void;
}) {
    const hour = value.getHours().toString().padStart(2, '0');
    const minute = value.getMinutes().toString().padStart(2, '0');

    return (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500">
                <Clock3 size={12} /> {label}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center justify-between rounded-xl border border-stone-200 bg-white p-1">
                    <button
                        type="button"
                        onClick={() => onChange(updateTime(value, 'hour', -1))}
                        aria-label={`Decrease ${label.toLowerCase()} hour`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
                    >
                        <Minus size={13} />
                    </button>
                    <span className="min-w-8 text-center text-sm font-black tabular-nums text-stone-900">{hour}</span>
                    <button
                        type="button"
                        onClick={() => onChange(updateTime(value, 'hour', 1))}
                        aria-label={`Increase ${label.toLowerCase()} hour`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
                    >
                        <Plus size={13} />
                    </button>
                </div>
                <span className="font-black text-stone-300">:</span>
                <div className="flex flex-1 items-center justify-between rounded-xl border border-stone-200 bg-white p-1">
                    <button
                        type="button"
                        onClick={() => onChange(updateTime(value, 'minute', -15))}
                        aria-label={`Decrease ${label.toLowerCase()} minutes`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
                    >
                        <Minus size={13} />
                    </button>
                    <span className="min-w-8 text-center text-sm font-black tabular-nums text-stone-900">{minute}</span>
                    <button
                        type="button"
                        onClick={() => onChange(updateTime(value, 'minute', 15))}
                        aria-label={`Increase ${label.toLowerCase()} minutes`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"
                    >
                        <Plus size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DateTimeRangeFilter({ value, onChange }: DateTimeRangeFilterProps) {
    const [open, setOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => value.start || new Date());
    const [timeZone, setTimeZone] = useState('Your local time');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Your local time');
    }, []);

    useEffect(() => {
        if (!open) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarCells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => (
        index < firstWeekday ? null : index - firstWeekday + 1
    ));

    const selectDay = (dayNumber: number) => {
        const selected = new Date(year, month, dayNumber);

        if (!value.start || value.end) {
            onChange({ start: startOfDay(selected), end: null });
            return;
        }

        if (selected.getTime() < startOfDay(value.start).getTime()) {
            onChange({ start: startOfDay(selected), end: endOfDay(value.start) });
            return;
        }

        onChange({ start: value.start, end: endOfDay(selected) });
    };

    const updateStartTime = (start: Date) => {
        onChange({ start, end: value.end && value.end < start ? new Date(start) : value.end });
    };

    const updateEndTime = (end: Date) => {
        onChange({ start: value.start && value.start > end ? new Date(end) : value.start, end });
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e85d36]/10 ${
                    value.start ? 'border-stone-400 text-stone-900' : 'border-stone-200 text-stone-500 hover:border-stone-400'
                }`}
            >
                <CalendarDays size={18} className="shrink-0 text-[#d94722]" />
                <span className="min-w-0 flex-1 truncate font-semibold">{formatRange(value)}</span>
                <ChevronDown size={16} className={`shrink-0 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            {open ? (
                <div className="absolute right-0 z-50 mt-2 w-[min(390px,calc(100vw-2rem))] rounded-[24px] border border-stone-200 bg-white p-4 shadow-[0_24px_80px_rgba(28,25,23,0.18)] sm:p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
                            aria-label="Previous month"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                        >
                            <ChevronLeft size={17} />
                        </button>
                        <div className="text-center">
                            <p className="text-sm font-black text-stone-950">
                                {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-stone-400">{timeZone}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
                            aria-label="Next month"
                            className="grid h-9 w-9 place-items-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                        >
                            <ChevronRight size={17} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                        {weekdayLabels.map((label) => (
                            <span key={label} className="py-1 text-[10px] font-bold uppercase text-stone-400">{label}</span>
                        ))}
                        {calendarCells.map((dayNumber, index) => dayNumber === null ? (
                            <span key={`blank-${index}`} />
                        ) : (() => {
                            const day = new Date(year, month, dayNumber);
                            const isStart = Boolean(value.start && sameDay(day, value.start));
                            const isEnd = Boolean(value.end && sameDay(day, value.end));
                            const inRange = isWithinRange(day, value);

                            return (
                                <button
                                    key={dayNumber}
                                    type="button"
                                    onClick={() => selectDay(dayNumber)}
                                    aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(day)}
                                    className={`grid aspect-square place-items-center rounded-xl text-xs font-bold transition ${
                                        isStart || isEnd
                                            ? 'bg-stone-950 text-white shadow-md'
                                            : inRange
                                                ? 'bg-[#fff0e9] text-[#b83b19]'
                                                : 'text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    {dayNumber}
                                </button>
                            );
                        })())}
                    </div>

                    {value.start ? (
                        <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                            <TimeControl label="Start time" value={value.start} onChange={updateStartTime} />
                            {value.end ? <TimeControl label="End time" value={value.end} onChange={updateEndTime} /> : (
                                <p className="rounded-xl bg-[#fff6f1] px-3 py-2 text-center text-xs font-semibold text-[#a63b20]">
                                    Choose an end date to complete the range.
                                </p>
                            )}
                        </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                        <button
                            type="button"
                            disabled={!value.start}
                            onClick={() => onChange({ start: null, end: null })}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                        >
                            <X size={14} /> Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="rounded-xl bg-stone-950 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
                        >
                            Apply range
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
