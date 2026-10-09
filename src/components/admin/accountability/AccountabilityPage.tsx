'use client';

import { ApiTokenDialog } from './ApiTokenDialog';
import { ApiKeyFormDialog } from './ApiKeyFormDialog';
import { DailyLineChart } from './DailyLineChart';

import Link from 'next/link';
import ConsistencyGraph from '@/components/ConsistencyGraph';
import ConsistencyStreakCard from '@/components/ConsistencyStreakCard';
import ShareTracker from './ShareTracker';
import {
    clearAccountabilityCache,
    peekAccountabilityCache,
    readAccountabilityCache,
} from '@/lib/accountability-client-cache';
import Image from 'next/image';
import {
    useId,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
    calculateHabitStreak,
    calculateNoFapWeeklyStreak,
    addActivityDays,
    toIstActivityDate,
    type ActivityDate,
} from '@/lib/accountability-domain';
import {
    CHECK_IN_SLOTS,
    HABITS,
    type HabitKey,
} from '@/lib/accountability-constants';
import {
    Activity,
    Check,
    CircleHelp,
    FileText,
    KeyRound,
    LoaderCircle,
    Maximize2,
    Utensils,
    Play,
    Plus,
    RefreshCw,
    Scale,
    UserRoundCheck,
    X,
} from 'lucide-react';

type Section =
    | 'progress'
    | 'check-ins'
    | 'weight'
    | 'body'
    | 'food'
    | 'summaries'
    | 'integrations';
type JsonRecord = Record<string, unknown>;
type LoadState = 'loading' | 'ready' | 'error';
type HabitStatus = 'unknown' | 'incomplete' | 'completed';

type SectionInfo = {
    key: Section;
    label: string;
    href: string;
    description: string;
    icon: typeof Activity;
};

const sections: SectionInfo[] = [
    {
        key: 'progress',
        label: 'Progress',
        href: '/samik-admin/progress',
        description: 'Habits and current progress',
        icon: Activity,
    },
    {
        key: 'weight',
        label: 'Weight',
        href: '/samik-admin/weight',
        description: 'Recorded measurements',
        icon: Scale,
    },
    {
        key: 'food',
        label: 'Food',
        href: '/samik-admin/food',
        description: 'Meals and calorie estimates',
        icon: Utensils,
    },
    {
        key: 'body',
        label: 'Body',
        href: '/samik-admin/body',
        description: 'Private media gallery',
        icon: Play,
    },
    {
        key: 'check-ins',
        label: 'Daily Check-ins',
        href: '/samik-admin/check-ins',
        description: 'Daily notes and weekly view',
        icon: UserRoundCheck,
    },
    {
        key: 'summaries',
        label: 'Summaries',
        href: '/samik-admin/summaries',
        description: 'Review before sharing',
        icon: FileText,
    },
];

const endpointBySection: Record<Section, string> = {
    progress: '/api/samik-admin/progress',
    'check-ins': '/api/samik-admin/check-ins',
    weight: '/api/samik-admin/weight',
    food: '/api/samik-admin/food',
    body: '/api/samik-admin/media',
    summaries: '/api/samik-admin/summaries',
    integrations: '/api/samik-admin/api-keys',
};

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getValue(record: JsonRecord, ...keys: string[]): unknown {
    if (isRecord(record.data)) {
        const nestedValue = getValue(record.data, ...keys);
        if (nestedValue !== undefined) return nestedValue;
    }
    for (const key of keys) {
        if (record[key] !== undefined && record[key] !== null)
            return record[key];
    }
    return undefined;
}

function getText(record: JsonRecord, ...keys: string[]): string {
    const value = getValue(record, ...keys);
    return typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : '';
}

function getNumber(record: JsonRecord, ...keys: string[]): number | null {
    const value = getValue(record, ...keys);
    const numeric =
        typeof value === 'number'
            ? value
            : typeof value === 'string'
              ? Number(value)
              : Number.NaN;
    return Number.isFinite(numeric) ? numeric : null;
}

function getArray(value: unknown, ...keys: string[]): JsonRecord[] {
    if (Array.isArray(value)) return value.filter(isRecord);
    if (!isRecord(value)) return [];
    const envelopeData = value.data;
    if (Array.isArray(envelopeData)) return envelopeData.filter(isRecord);
    if (isRecord(envelopeData)) {
        const nested = getArray(envelopeData, ...keys);
        if (
            nested.length ||
            keys.some((key) => Array.isArray(envelopeData[key]))
        )
            return nested;
    }
    for (const key of keys) {
        const list = value[key];
        if (Array.isArray(list)) return list.filter(isRecord);
    }
    return [];
}

function dateLabel(
    value: unknown,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
): string {
    if (typeof value !== 'string' && typeof value !== 'number')
        return 'Date not set';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(`${raw}T00:00:00+05:30`)
        : new Date(value);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat(undefined, {
        ...options,
        timeZone: 'Asia/Kolkata',
    }).format(date);
}

function localDateValue(): ActivityDate {
    return toIstActivityDate(new Date());
}

function timestampForActivityDate(value: unknown): number {
    if (typeof value !== 'string' && typeof value !== 'number')
        return Number.NaN;
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(`${raw}T00:00:00+05:30`)
        : new Date(value);
    return date.getTime();
}

async function requestPrivateJson(
    path: string,
    init: RequestInit = {},
): Promise<unknown> {
    const response = await fetch(path, {
        ...init,
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers,
        },
    });
    if (!response.ok) {
        if (response.status === 401 || response.status === 403)
            clearAccountabilityCache(true);
        let message = 'The request could not be completed. Please try again.';
        try {
            const body: unknown = await response.json();
            if (isRecord(body) && typeof body.error === 'string')
                message = body.error;
        } catch {
            /* Use the generic request message when there is no JSON error response. */
        }
        throw new Error(message);
    }
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) return null;
    const result: unknown = await response.json();
    if (init.method && init.method !== 'GET') clearAccountabilityCache();
    return result;
}

function usePrivateData(endpoint: string) {
    const [data, setData] = useState<unknown>(null);
    const [state, setState] = useState<LoadState>('loading');
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const clear = () => {
            setData(null);
            setState('error');
            setError('Your session ended. Sign in again to view private data.');
        };
        window.addEventListener('accountability-signed-out', clear);
        return () =>
            window.removeEventListener('accountability-signed-out', clear);
    }, []);
    const reload = useCallback(() => {
        clearAccountabilityCache();
        setVersion((v) => v + 1);
    }, []);
    useEffect(() => {
        let active = true;
        const stop = () => {
            active = false;
        };
        window.addEventListener('accountability-signed-out', stop);
        const cached = peekAccountabilityCache(endpoint);
        setData(cached ?? null);
        setState(cached === undefined ? 'loading' : 'ready');
        setError('');
        readAccountabilityCache(endpoint, () =>
            requestPrivateJson(endpoint, {
                signal: AbortSignal.timeout(30_000),
            }),
        )
            .then((result) => {
                if (active) {
                    setData(result);
                    setState('ready');
                }
            })
            .catch((cause) => {
                if (active) {
                    setError(
                        cause instanceof Error
                            ? cause.message
                            : 'Private data could not be loaded.',
                    );
                    setState('error');
                }
            });
        return () => {
            active = false;
            window.removeEventListener('accountability-signed-out', stop);
        };
    }, [endpoint, version]);
    return { data, state, error, reload };
}

const mediaBuffer = new Map<
    string,
    { url: string; expires: number; bytes: number }
>();
const mediaPending = new Map<string, Promise<string>>();
let mediaBytes = 0;
let mediaGeneration = 0;
if (typeof window !== 'undefined')
    window.addEventListener('accountability-signed-out', () => {
        mediaGeneration += 1;
        for (const entry of mediaBuffer.values())
            if (entry.url.startsWith('blob:')) URL.revokeObjectURL(entry.url);
        mediaBuffer.clear();
        mediaPending.clear();
        mediaBytes = 0;
    });
async function bufferMedia(
    ids: string[],
    refresh = false,
): Promise<Map<string, string>> {
    const started = mediaGeneration;
    const unique = [...new Set(ids.filter(Boolean))].slice(0, 8);
    const missing = unique.filter(
        (id) =>
            refresh ||
            (!mediaPending.has(id) &&
                (!mediaBuffer.has(id) ||
                    mediaBuffer.get(id)!.expires <= Date.now())),
    );
    if (missing.length) {
        const batch = requestPrivateJson(
            `${endpointBySection.body}?ids=${encodeURIComponent(missing.join(','))}`,
        ).then(async (response) => {
            const results = getArray(response, 'items');
            return new Map(
                await Promise.all(
                    results.map(async (item) => {
                        const id = getText(item, 'id');
                        let url = getText(item, 'url');
                        let bytes = 0;
                        if (getText(item, 'contentType').startsWith('image/')) {
                            const res = await fetch(url, {
                                cache: 'no-store',
                                credentials: 'omit',
                                signal: AbortSignal.timeout(20_000),
                            });
                            if (!res.ok)
                                throw new Error(
                                    'The image could not be loaded.',
                                );
                            const blob = await res.blob();
                            bytes = blob.size;
                            url = URL.createObjectURL(blob);
                        }
                        if (started !== mediaGeneration) {
                            if (url.startsWith('blob:'))
                                URL.revokeObjectURL(url);
                            throw new Error('Your session ended.');
                        }
                        const prior = mediaBuffer.get(id);
                        if (prior?.url.startsWith('blob:'))
                            URL.revokeObjectURL(prior.url);
                        mediaBytes -= prior?.bytes ?? 0;
                        mediaBuffer.set(id, {
                            url,
                            bytes,
                            expires:
                                Date.now() +
                                (getNumber(item, 'expiresInSeconds') ?? 60) *
                                    1000 -
                                5000,
                        });
                        mediaBytes += bytes;
                        // Keep a bounded in-memory buffer. The newest eight items stay available.
                        while (
                            mediaBytes > 120 * 1024 * 1024 &&
                            mediaBuffer.size > 8
                        ) {
                            const oldest = mediaBuffer.keys().next()
                                .value as string;
                            const entry = mediaBuffer.get(oldest)!;
                            if (entry.url.startsWith('blob:'))
                                URL.revokeObjectURL(entry.url);
                            mediaBytes -= entry.bytes;
                            mediaBuffer.delete(oldest);
                        }
                        return [id, url] as const;
                    }),
                ),
            );
        });
        for (const id of missing) {
            const pending = batch
                .then((result) => {
                    const url = result.get(id);
                    if (!url) throw new Error('Private media was not found.');
                    return url;
                })
                .finally(() => {
                    if (mediaPending.get(id) === pending)
                        mediaPending.delete(id);
                });
            mediaPending.set(id, pending);
        }
    }
    const settled = await Promise.allSettled(
        unique.map(
            async (id) =>
                [
                    id,
                    await (mediaPending.get(id) ??
                        Promise.resolve(mediaBuffer.get(id)?.url ?? '')),
                ] as const,
        ),
    );
    if (settled[0]?.status === 'rejected') throw settled[0].reason;
    return new Map(
        settled.flatMap((result) =>
            result.status === 'fulfilled' ? [result.value] : [],
        ),
    );
}

function PrivateImage({
    id,
    alt,
    className = '',
}: {
    id: string;
    alt: string;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [url, setUrl] = useState('');
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                setError(false);
                bufferMedia([id], attempt > 0)
                    .then((result) => {
                        if (active) setUrl(result.get(id) ?? '');
                    })
                    .catch(() => {
                        if (active) setError(true);
                    });
            },
            { rootMargin: '150px' },
        );
        if (ref.current) observer.observe(ref.current);
        return () => {
            active = false;
            observer.disconnect();
        };
    }, [id, attempt]);
    return (
        <div
            ref={ref}
            className={`grid place-items-center overflow-hidden bg-stone-100 ${className}`}
        >
            {url ? (
                <Image
                    unoptimized
                    src={url}
                    alt={alt}
                    width={800}
                    height={600}
                    className="h-full min-h-0 w-full object-contain"
                    onError={() => {
                        setUrl('');
                        setError(true);
                    }}
                />
            ) : error ? (
                <button
                    type="button"
                    onClick={() => setAttempt((v) => v + 1)}
                    className="px-3 text-xs font-semibold text-rose-700"
                >
                    Retry image
                </button>
            ) : (
                <LoaderCircle
                    size={18}
                    className="animate-spin text-stone-400"
                    aria-label="Loading image preview"
                />
            )}
        </div>
    );
}

function DailyHeatmap({
    title,
    rows,
    onSelect,
    weekly = false,
    notesOnly = false,
}: {
    title: string;
    rows: JsonRecord[];
    from?: string;
    to?: string;
    onSelect?: (date: string) => void;
    weekly?: boolean;
    notesOnly?: boolean;
}) {
    const today = localDateValue();
    const [range, setRange] = useState({
        from: addActivityDays(today, -364),
        to: today,
    });
    const statuses: Record<string, 'complete' | 'incomplete' | 'unknown'> = {};
    for (const row of rows) {
        const status = statusOf(row);
        statuses[getText(row, 'date', 'activityDate')] =
            status === 'completed'
                ? 'complete'
                : status === 'incomplete'
                  ? 'incomplete'
                  : 'unknown';
    }
    const days = Object.entries(statuses).map(([date, status]) => ({
        date,
        count: status === 'complete' ? 1 : 0,
        level: status === 'complete' ? (2 as const) : (0 as const),
    }));
    const successful = days
        .filter((day) => day.count && day.date <= today)
        .map((day) => day.date);
    const daily = calculateHabitStreak(
        Object.entries(statuses).map(([date, status]) => ({ date, status })),
        today,
    );
    const weeklyStats = calculateNoFapWeeklyStreak(successful, today);
    const current = weekly
        ? weeklyStats.consecutiveWinningWeeks
        : daily.currentStreak;
    const longest = weekly
        ? weeklyStats.longestWinningWeeks
        : daily.longestStreak;
    const stats = [
        { label: 'Completed days', value: successful.length },
        { label: weekly ? 'Winning weeks' : 'Current streak', value: current },
        {
            label: weekly ? 'Longest weekly streak' : 'Longest streak',
            value: longest,
        },
    ];
    const snapshot = Array.from(
        {
            length:
                Math.round(
                    (new Date(range.to).getTime() -
                        new Date(range.from).getTime()) /
                        86400000,
                ) + 1,
        },
        (_, i) => {
            const date = addActivityDays(range.from, i);
            return {
                date,
                status: date > today ? 'future' : (statuses[date] ?? 'unknown'),
            };
        },
    );
    return (
        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <ConsistencyStreakCard
                compact
                total={successful.length}
                current={current}
                longest={longest}
                totalLabel="Completed days"
                currentLabel={
                    weekly ? 'Current winning weeks' : 'Current streak · days'
                }
                longestLabel={
                    weekly ? 'Longest winning weeks' : 'Longest streak · days'
                }
                totalRange={
                    successful.length
                        ? `${dateLabel(successful.slice().sort()[0], { dateStyle: 'medium' })} — ${dateLabel(today, { dateStyle: 'medium' })}`
                        : 'No completed days yet'
                }
                currentRange={
                    weekly
                        ? `${weeklyStats.currentWeek.successDays} / 7 this week · 5 to win`
                        : daily.currentStartDate
                          ? `${dateLabel(daily.currentStartDate, { dateStyle: 'medium' })} — ${dateLabel(daily.currentEndDate, { dateStyle: 'medium' })}`
                          : 'No active streak'
                }
                longestRange={
                    weekly
                        ? 'Weeks with at least five completed days'
                        : daily.longestStartDate
                          ? `${dateLabel(daily.longestStartDate, { dateStyle: 'medium' })} — ${dateLabel(daily.longestEndDate, { dateStyle: 'medium' })}`
                          : 'No completed streak'
                }
                share={
                    <ShareTracker title={`${title} streaks`} stats={stats} />
                }
            />
            <ConsistencyGraph
                title={title}
                days={days}
                statuses={statuses}
                activityLabels
                todayDate={today}
                onSelect={onSelect}
                renderDayDetails={(date) => {
                    const dayRows = rows.filter(
                        (row) => getText(row, 'date', 'activityDate') === date,
                    );
                    const fields = notesOnly
                        ? [['notes', 'Notes']]
                        : [
                              ['activity', 'Details'],
                              ['notes', 'Notes'],
                          ];
                    return (
                        <div className="mt-3 space-y-3">
                            {dayRows.length ? (
                                dayRows.map((row, index) => (
                                    <dl key={index} className="space-y-2">
                                        {!fields.some(([key]) =>
                                            getText(row, key),
                                        ) && (
                                            <p className="text-stone-500">
                                                No context added yet.
                                            </p>
                                        )}
                                        {fields.flatMap(([key, label]) => {
                                            const value = getText(row, key);
                                            return value
                                                ? [
                                                      <div key={key}>
                                                          <dt className="text-xs font-semibold text-stone-500">
                                                              {label}
                                                          </dt>
                                                          <dd className="whitespace-pre-wrap break-words text-stone-800">
                                                              {value}
                                                          </dd>
                                                      </div>,
                                                  ]
                                                : [];
                                        })}
                                    </dl>
                                ))
                            ) : (
                                <p className="text-stone-500">
                                    No details recorded.
                                </p>
                            )}
                        </div>
                    );
                }}
                onRangeChange={(from, to) => setRange({ from, to })}
                shareControl={<ShareTracker title={title} days={snapshot} />}
            />
        </div>
    );
}

function AccountabilityShell({
    active,
    title,
    children,
}: {
    active: Section;
    title: string;
    intro: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const nav = useRef<HTMLElement>(null);
    useEffect(() => {
        const current = nav.current?.querySelector<HTMLElement>(
            '[aria-current="page"]',
        );
        if (
            nav.current &&
            current &&
            nav.current.scrollWidth > nav.current.clientWidth
        ) {
            nav.current.scrollLeft =
                current.offsetLeft -
                (nav.current.clientWidth - current.clientWidth) / 2;
        }
    }, [pathname]);
    return (
        <main
            aria-label={title}
            className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8"
        >
            {active === 'integrations' && (
                <Link
                    href="/samik-admin"
                    className="mb-4 inline-block text-sm font-semibold text-stone-600"
                >
                    ← Samik Admin
                </Link>
            )}

            {active !== 'integrations' && (
                <nav
                    ref={nav}
                    aria-label="Accountability sections"
                    className="relative mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
                >
                    {sections.map(({ key, label, href, icon: Icon }) => {
                        const current = active === key || pathname === href;
                        return (
                            <Link
                                key={key}
                                href={href}
                                aria-current={current ? 'page' : undefined}
                                className={`flex min-w-[120px] items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 sm:min-w-0 ${current ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}
                            >
                                <Icon
                                    size={16}
                                    className="shrink-0"
                                    aria-hidden="true"
                                />{' '}
                                {label}
                            </Link>
                        );
                    })}
                </nav>
            )}

            <div className="space-y-5">{children}</div>
        </main>
    );
}

function Panel({
    title,
    children,
    action,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div>
                    <h2 className="text-base font-bold tracking-tight text-stone-950">
                        {title}
                    </h2>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function TrackerDialog({
    title,
    children,
    onClose,
}: {
    title: string;
    children: ReactNode;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);
    return (
        <dialog
            ref={dialog}
            onCancel={onClose}
            aria-labelledby={titleId}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (
                        event.clientX < rect.left ||
                        event.clientX > rect.right ||
                        event.clientY < rect.top ||
                        event.clientY > rect.bottom
                    )
                        onClose();
                }
            }}
            className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white p-0 text-stone-950 shadow-xl backdrop:bg-black/40"
        >
            <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-4 py-3 sm:px-6">
            <h2 id={titleId} className="min-w-0 break-words text-lg font-bold">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-stone-100"
                >
                    <X size={20} />
                </button>
            </div>
            <div className="max-h-[calc(100dvh_-_7rem)] overflow-y-auto overscroll-contain p-4 sm:p-6">
                {children}
            </div>
        </dialog>
    );
}

function evidenceIds(record: JsonRecord): string[] {
    const ids = getValue(record, 'evidenceAssetIds');
    return Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === 'string')
        : [];
}

function HistoryFilters({
    from,
    to,
    onFrom,
    onTo,
    images,
    onImages,
    sort,
    onSort,
}: {
    from: string;
    to: string;
    onFrom: (value: string) => void;
    onTo: (value: string) => void;
    images: string;
    onImages: (value: string) => void;
    sort: string;
    onSort: (value: string) => void;
}) {
    const field =
        'min-h-10 min-w-0 w-full rounded-lg border border-stone-300 bg-white px-2 text-sm font-normal';
    return (
        <div className="grid grid-cols-1 items-end gap-3 min-[380px]:grid-cols-2 lg:flex lg:flex-nowrap">
            <label className="grid min-w-0 gap-1 text-xs font-bold">
                From
                <input
                    type="date"
                    value={from}
                    max={to}
                    onChange={(e) => e.target.value && onFrom(e.target.value)}
                    className={field}
                />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-bold">
                To
                <input
                    type="date"
                    value={to}
                    min={from}
                    max={localDateValue()}
                    onChange={(e) => e.target.value && onTo(e.target.value)}
                    className={field}
                />
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-bold">
                Images
                <select
                    value={images}
                    onChange={(e) => onImages(e.target.value)}
                    className={field}
                >
                    <option value="all">All entries</option>
                    <option value="with">With images</option>
                    <option value="without">Without images</option>
                </select>
            </label>
            <label className="grid min-w-0 gap-1 text-xs font-bold">
                Sort
                <select
                    value={sort}
                    onChange={(e) => onSort(e.target.value)}
                    className={field}
                >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                </select>
            </label>
        </div>
    );
}

function StatusPanel({
    state,
    error,
    onRetry,
}: {
    state: LoadState;
    error: string;
    onRetry: () => void;
}) {
    if (state === 'loading') {
        return (
            <div
                className="flex min-h-28 items-center justify-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-600"
                role="status"
                aria-live="polite"
            >
                <LoaderCircle
                    size={18}
                    className="animate-spin"
                    aria-hidden="true"
                />{' '}
                Loading private data…
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div
                className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                role="alert"
            >
                <div>
                    <p className="font-bold text-rose-950">
                        Couldn’t load this section
                    </p>
                    <p className="mt-1 text-sm text-rose-800">{error}</p>
                </div>
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-sm font-bold text-rose-900 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                >
                    <RefreshCw size={15} aria-hidden="true" /> Try again
                </button>
            </div>
        );
    }
    return null;
}

function EmptyState({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
            <CircleHelp
                size={22}
                className="mx-auto text-stone-500"
                aria-hidden="true"
            />
            <h3 className="mt-2 font-bold text-stone-900">{title}</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm leading-5 text-stone-600">
                {children}
            </p>
        </div>
    );
}

function Notice({
    kind,
    children,
}: {
    kind: 'success' | 'error' | 'info';
    children: ReactNode;
}) {
    const style =
        kind === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-sky-200 bg-sky-50 text-sky-900';
    return (
        <p
            className={`rounded-lg border px-3 py-2 text-sm ${style}`}
            role={kind === 'error' ? 'alert' : 'status'}
        >
            {children}
        </p>
    );
}

function statusOf(record: JsonRecord): HabitStatus {
    const raw = getValue(record, 'status', 'completionStatus', 'state');
    const complete = getValue(record, 'completed', 'isCompleted');
    if (complete === true) return 'completed';
    if (complete === false) return 'incomplete';
    if (typeof raw !== 'string') return 'unknown';
    const normalized = raw.toLowerCase().trim();
    if (['completed', 'complete', 'done', 'success'].includes(normalized))
        return 'completed';
    if (
        ['incomplete', 'not completed', 'missed', 'failed', 'relapse'].includes(
            normalized,
        )
    )
        return 'incomplete';
    return 'unknown';
}

const statusStyle: Record<HabitStatus, string> = {
    unknown: 'border-amber-300 bg-amber-50 text-amber-900',
    incomplete: 'border-rose-300 bg-rose-50 text-rose-900',
    completed: 'border-emerald-300 bg-emerald-100 text-emerald-900',
};
const statusLabel: Record<HabitStatus, string> = {
    unknown: 'Not updated',
    incomplete: 'Incomplete',
    completed: 'Completed',
};

function StatusBadge({ status }: { status: HabitStatus }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusStyle[status]}`}
        >
            {statusLabel[status]}
        </span>
    );
}

function useIdempotencyKeys() {
    const keys = useRef(new Map<string, string>());
    const keyFor = useCallback((fingerprint: string) => {
        const existing = keys.current.get(fingerprint);
        if (existing) return existing;
        const generated = crypto.randomUUID();
        keys.current.set(fingerprint, generated);
        return generated;
    }, []);
    const complete = useCallback((fingerprint: string) => {
        keys.current.delete(fingerprint);
    }, []);
    return { keyFor, complete };
}

function useMutation() {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const submit = useCallback(
        async (
            path: string,
            method: 'POST' | 'PATCH' | 'DELETE',
            body: unknown,
        ): Promise<{ ok: boolean; data?: unknown }> => {
            setBusy(true);
            setMessage(null);
            try {
                const data = await requestPrivateJson(path, {
                    method,
                    body: JSON.stringify(body),
                });
                setMessage({ kind: 'success', text: 'Saved.' });
                return { ok: true, data };
            } catch (cause) {
                setMessage({
                    kind: 'error',
                    text:
                        cause instanceof Error
                            ? cause.message
                            : 'The change could not be saved.',
                });
                return { ok: false };
            } finally {
                setBusy(false);
            }
        },
        [],
    );
    return { busy, message, setMessage, submit };
}

const habitDefinitions = HABITS;

function ProgressHistory({
    history,
    noFap = [],
}: {
    history: JsonRecord[];
    noFap?: JsonRecord[];
}) {
    const [limit, setLimit] = useState(90);
    const dates = [
        ...new Set(
            [...history, ...noFap].map((row) =>
                getText(row, 'date', 'activityDate'),
            ),
        ),
    ]
        .sort()
        .reverse();
    const lookup = new Map(
        history.map((row) => [
            `${getText(row, 'date', 'activityDate')}:${getText(row, 'habitKey', 'habit_key')}`,
            row,
        ]),
    );
    if (!dates.length)
        return (
            <EmptyState title="No progress yet">
                Your recorded activity days will appear here.
            </EmptyState>
        );
    return (
        <>
            <div
                tabIndex={0}
                aria-label="Progress history"
                className="max-h-[420px] overflow-auto overscroll-contain rounded-xl border border-stone-200 [scrollbar-gutter:stable]"
            >
                <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-stone-50 text-xs text-stone-600">
                        <tr>
                            <th
                                scope="col"
                                className="px-4 py-3 text-left font-semibold"
                            >
                                Date (IST)
                            </th>
                            {[
                                ...habitDefinitions,
                                { key: 'no_fap', label: 'No-fap' },
                            ].map((habit) => (
                                <th
                                    key={habit.key}
                                    scope="col"
                                    className="px-3 py-3 text-center font-semibold"
                                >
                                    {habit.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dates.slice(0, limit).map((date) => (
                            <tr
                                key={date}
                                className="border-t border-stone-200"
                            >
                                <th
                                    scope="row"
                                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium tabular-nums text-stone-700"
                                >
                                    {dateLabel(date, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </th>
                                {[
                                    ...habitDefinitions,
                                    { key: 'no_fap', label: 'No-fap' },
                                ].map((habit) => {
                                    const row =
                                        habit.key === 'no_fap'
                                            ? noFap.find(
                                                  (row) =>
                                                      getText(row, 'date') ===
                                                      date,
                                              )
                                            : lookup.get(
                                                  `${date}:${habit.key}`,
                                              );
                                    const status = row
                                        ? statusOf(row)
                                        : 'unknown';
                                    const Icon =
                                        status === 'completed'
                                            ? Check
                                            : status === 'incomplete'
                                              ? X
                                              : CircleHelp;
                                    return (
                                        <td
                                            key={habit.key}
                                            className="px-3 py-2 text-center"
                                        >
                                            <span
                                                title={statusLabel[status]}
                                                aria-label={`${habit.label}: ${statusLabel[status]}`}
                                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${statusStyle[status]}`}
                                            >
                                                <Icon
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {dates.length > limit && (
                <button
                    type="button"
                    onClick={() => setLimit((v) => v + 90)}
                    className="mt-3 text-xs font-bold text-stone-600 underline"
                >
                    Load older days ({dates.length - limit} remaining)
                </button>
            )}
        </>
    );
}

function ProgressSection() {
    const [editorOpen, setEditorOpen] = useState(false);
    const [activityDate, setActivityDate] = useState(localDateValue);
    const rangeEnd = localDateValue();
    const rangeStart = addActivityDays(rangeEnd, -3660);
    const endpoint = `${endpointBySection.progress}?from=${encodeURIComponent(rangeStart)}&to=${encodeURIComponent(rangeEnd)}`;
    const { data, state, error, reload } = usePrivateData(endpoint);
    const [saving, setSaving] = useState(false);
    const idempotency = useIdempotencyKeys();
    const [progressNotice, setProgressNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const habits = getArray(dataRoot, 'habits', 'items', 'progress').filter(
        (habit) => getText(habit, 'date', 'activityDate') === activityDate,
    );
    const targetDate = activityDate;

    const saveHabit = async (
        habitKey: HabitKey,
        current: JsonRecord | undefined,
        status: HabitStatus,
        details: JsonRecord,
    ) => {
        const payload = {
            type: 'habit',
            habitKey,
            activityDate: targetDate,
            status: status === 'completed' ? 'complete' : status,
            ...details,
        };
        const fingerprint = JSON.stringify(payload);
        setSaving(true);
        setProgressNotice(null);
        try {
            await requestPrivateJson(endpointBySection.progress, {
                method: current ? 'PATCH' : 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setProgressNotice({ kind: 'success', text: 'Progress saved.' });
            reload();
            return true;
        } catch (cause) {
            setProgressNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The change could not be saved.',
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Panel
                title="Activity tracker"
                action={
                    <button
                        type="button"
                        onClick={() => setEditorOpen(true)}
                        className="min-h-10 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white"
                    >
                        Update a day
                    </button>
                }
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && (
                    <div className="space-y-6">
                        {habitDefinitions.map((habit) => (
                            <DailyHeatmap
                                key={habit.key}
                                title={habit.label}
                                notesOnly
                                from={rangeStart}
                                to={rangeEnd}
                                rows={getArray(dataRoot, 'habits').filter(
                                    (row) =>
                                        getText(row, 'habitKey') === habit.key,
                                )}
                                onSelect={(date) => {
                                    setActivityDate(date);
                                    setEditorOpen(true);
                                }}
                            />
                        ))}
                    </div>
                )}
            </Panel>
            <NoFapTracker />
            {editorOpen && (
                <TrackerDialog
                    title="Update a day"
                    onClose={() => setEditorOpen(false)}
                >
                    <div
                        id="activity-day-editor"
                        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
                    >
                        <label className="grid max-w-xs gap-1.5 text-sm font-bold text-stone-800">
                            Activity date (IST)
                            <input
                                type="date"
                                min={rangeStart}
                                max={rangeEnd}
                                value={activityDate}
                                onChange={(event) =>
                                    setActivityDate(event.target.value)
                                }
                                className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                            />
                        </label>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                            <span className="font-bold">Status key</span>
                            {(
                                [
                                    'unknown',
                                    'incomplete',
                                    'completed',
                                ] as HabitStatus[]
                            ).map((status) => (
                                <StatusBadge key={status} status={status} />
                            ))}
                        </div>
                    </div>
                    <StatusPanel state={state} error={error} onRetry={reload} />
                    {state === 'ready' && (
                        <div className="space-y-3">
                            {habitDefinitions.map((definition) => {
                                const current = habits.find(
                                    (habit) =>
                                        getText(
                                            habit,
                                            'habitKey',
                                            'habit_key',
                                            'key',
                                        ) === definition.key,
                                );
                                return (
                                    <HabitProgressCard
                                        key={`${activityDate}-${definition.key}`}
                                        habitKey={definition.key}
                                        label={definition.label}
                                        current={current}
                                        disabled={saving}
                                        onSave={saveHabit}
                                    />
                                );
                            })}
                        </div>
                    )}
                    {progressNotice && (
                        <div className="mt-4">
                            <Notice kind={progressNotice.kind}>
                                {progressNotice.text}
                            </Notice>
                        </div>
                    )}
                </TrackerDialog>
            )}
            <Panel
                title="Progress history"
                description="One row per recorded day. Green is completed; unfilled squares are incomplete or not updated."
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && (
                    <ProgressHistory
                        history={getArray(
                            dataRoot,
                            'habitHistory',
                            'history',
                            'historyItems',
                            'days',
                        )}
                        noFap={getArray(dataRoot, 'noFapDays')}
                    />
                )}
            </Panel>
        </>
    );
}

function HabitProgressCard({
    habitKey,
    label,
    current,
    disabled,
    onSave,
}: {
    habitKey: HabitKey;
    label: string;
    current?: JsonRecord;
    disabled: boolean;
    onSave: (
        habitKey: HabitKey,
        current: JsonRecord | undefined,
        status: HabitStatus,
        details: JsonRecord,
    ) => Promise<boolean>;
}) {
    const [notes, setNotes] = useState(() => getText(current ?? {}, 'notes'));
    const [localBusy, setLocalBusy] = useState(false);
    const status = current ? statusOf(current) : 'unknown';

    const details: JsonRecord = { notes: notes.trim() || null };
    const update = async (next: HabitStatus) => {
        setLocalBusy(true);
        try {
            await onSave(habitKey, current, next, details);
        } finally {
            setLocalBusy(false);
        }
    };

    return (
        <article className="rounded-xl border border-stone-200 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-stone-950">{label}</h3>
                        <StatusBadge status={status} />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={
                            disabled || localBusy || status === 'completed'
                        }
                        onClick={() => void update('completed')}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"
                    >
                        <Check size={15} aria-hidden="true" /> Mark complete
                    </button>
                    <button
                        type="button"
                        disabled={
                            disabled || localBusy || status === 'incomplete'
                        }
                        onClick={() => void update('incomplete')}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"
                    >
                        <X size={15} aria-hidden="true" /> Mark incomplete
                    </button>
                    <button
                        type="button"
                        disabled={disabled || localBusy || status === 'unknown'}
                        onClick={() => void update('unknown')}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2"
                    >
                        <CircleHelp size={15} aria-hidden="true" /> Mark unknown
                    </button>
                    <button
                        type="button"
                        disabled={disabled || localBusy}
                        onClick={() => void update(status)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"
                    >
                        <Check size={15} aria-hidden="true" /> Save notes
                    </button>
                </div>
            </div>
            <label className="mt-4 grid gap-1.5 text-xs font-bold text-stone-700">
                Notes (optional)
                <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    maxLength={4000}
                    disabled={disabled || localBusy}
                    className="w-full resize-y rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                    placeholder={`What did you do for ${label.toLowerCase()}?`}
                />
            </label>
        </article>
    );
}

function NoFapTracker() {
    const [editorOpen, setEditorOpen] = useState(false);
    const endpoint = `${endpointBySection.progress}?from=${addActivityDays(localDateValue(), -3660)}&to=${localDateValue()}`;
    const noFap = usePrivateData(endpoint);
    const noFapRoot =
        isRecord(noFap.data) && isRecord(noFap.data.data)
            ? noFap.data.data
            : noFap.data;
    const noFapDays = getArray(noFapRoot, 'noFapDays');
    const idempotency = useIdempotencyKeys();
    const [noFapSelectedDate, setNoFapSelectedDate] = useState(localDateValue);
    const [noFapBusy, setNoFapBusy] = useState('');
    const [noFapNotice, setNoFapNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const setNoFapStatus = async (
        date: string,
        status: 'success' | 'relapse' | 'not_tracked',
    ) => {
        if (date > localDateValue() || noFapBusy) return;
        const payload = { type: 'no-fap', activityDate: date, status };
        const fingerprint = JSON.stringify(payload);
        setNoFapBusy(date);
        setNoFapNotice(null);
        try {
            await requestPrivateJson(endpointBySection.progress, {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setNoFapNotice({
                kind: 'success',
                text: `No-fap status saved for ${dateLabel(date)}.`,
            });
            setEditorOpen(false);
            noFap.reload();
        } catch (cause) {
            setNoFapNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The status could not be saved.',
            });
        } finally {
            setNoFapBusy('');
        }
    };

    return (
        <Panel
            title="No-fap tracker"
            action={
                <button
                    type="button"
                    onClick={() => setEditorOpen(true)}
                    className="min-h-10 rounded-lg border border-stone-300 px-4 text-sm font-bold"
                >
                    Update a day
                </button>
            }
        >
            <StatusPanel
                state={noFap.state}
                error={noFap.error}
                onRetry={noFap.reload}
            />
            {noFap.state === 'ready' && (
                <>
                    <DailyHeatmap
                        title="No-fap"
                        rows={noFapDays}
                        weekly
                        onSelect={(date) => {
                            setNoFapSelectedDate(date);
                            setEditorOpen(true);
                        }}
                    />
                    {editorOpen && (
                        <TrackerDialog
                            title="Update no-fap status"
                            onClose={() => setEditorOpen(false)}
                        >
                            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                                <label className="grid gap-1 text-xs font-bold text-stone-700">
                                    Update a day
                                    <input
                                        type="date"
                                        value={noFapSelectedDate}
                                        max={localDateValue()}
                                        onChange={(e) =>
                                            setNoFapSelectedDate(e.target.value)
                                        }
                                        className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal"
                                    />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {(
                                        [
                                            'success',
                                            'relapse',
                                            'not_tracked',
                                        ] as const
                                    ).map((option) => {
                                        const selectedStatus = getText(
                                            noFapDays.find(
                                                (item) =>
                                                    getText(item, 'date') ===
                                                    noFapSelectedDate,
                                            ) ?? {},
                                            'status',
                                        );
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                aria-pressed={
                                                    selectedStatus === option
                                                }
                                                disabled={
                                                    noFapSelectedDate >
                                                        localDateValue() ||
                                                    Boolean(noFapBusy) ||
                                                    selectedStatus === option
                                                }
                                                onClick={() =>
                                                    void setNoFapStatus(
                                                        noFapSelectedDate,
                                                        option,
                                                    )
                                                }
                                                className={`min-h-10 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${option === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : option === 'relapse' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
                                            >
                                                {option === 'success'
                                                    ? 'Yes · Success'
                                                    : option === 'relapse'
                                                      ? 'No · Relapse'
                                                      : 'Not updated'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {noFapNotice && (
                                <Notice kind={noFapNotice.kind}>
                                    {noFapNotice.text}
                                </Notice>
                            )}
                        </TrackerDialog>
                    )}
                </>
            )}
            {noFapNotice && (
                <div className="mt-4">
                    <Notice kind={noFapNotice.kind}>{noFapNotice.text}</Notice>
                </div>
            )}
        </Panel>
    );
}

function CheckInsSection() {
    const [answerSlot, setAnswerSlot] = useState<{
        date: string;
        id: string;
        label: string;
    } | null>(null);
    const [selectedDate, setSelectedDate] = useState(localDateValue);
    const checkInEndpoint = `${endpointBySection['check-ins']}?from=${selectedDate}&to=${selectedDate}`;
    const { data, state, error, reload } = usePrivateData(checkInEndpoint);
    const idempotency = useIdempotencyKeys();
    const [answerText, setAnswerText] = useState<Record<string, string>>({});
    const [answerBusy, setAnswerBusy] = useState('');
    const [answerNotice, setAnswerNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const slots = getArray(dataRoot, 'slots', 'checkIns', 'entries');
    const dayRows = getArray(dataRoot, 'days', 'dates');
    const flattenedSlots = [
        ...slots,
        ...dayRows.flatMap((day) =>
            getArray(day, 'slots').map((slot) => ({
                ...slot,
                activityDate:
                    getText(slot, 'activityDate', 'date') ||
                    getText(day, 'activityDate', 'date'),
            })),
        ),
    ];
    const dateKeys = [selectedDate];
    const getSlot = (date: string, slotId: string) =>
        flattenedSlots.find(
            (slot) =>
                getText(slot, 'activityDate', 'date') === date &&
                getText(slot, 'slotId', 'id') === slotId,
        );

    const submitAnswer = async (date: string, slotId: string) => {
        const response = (answerText[`${date}:${slotId}`] ?? '').trim();
        if (!response || answerBusy) return;
        const payload = { activityDate: date, slotId, response };
        const fingerprint = JSON.stringify(payload);
        setAnswerBusy(`${date}:${slotId}`);
        setAnswerNotice(null);
        try {
            await requestPrivateJson(endpointBySection['check-ins'], {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setAnswerNotice({
                kind: 'success',
                text: 'Check-in answer saved.',
            });
            setAnswerText((current) => ({
                ...current,
                [`${date}:${slotId}`]: '',
            }));
            setAnswerSlot(null);
            reload();
        } catch (cause) {
            setAnswerNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The answer could not be saved.',
            });
        } finally {
            setAnswerBusy('');
        }
    };

    return (
        <>
            <Panel
                title="Check-in slots · IST"
                description="Each day has four scheduled slots. Pending and missed slots can be answered; missed slots accept a late answer."
                action={
                    <label className="grid w-full gap-1 sm:w-44 text-xs font-bold">
                        Day (IST)
                        <input
                            type="date"
                            value={selectedDate}
                            max={localDateValue()}
                            onChange={(e) =>
                                e.target.value &&
                                setSelectedDate(e.target.value)
                            }
                            className="min-h-10 min-w-0 w-full rounded-lg border border-stone-300 px-3 text-sm"
                        />
                    </label>
                }
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && dateKeys.length > 0 && (
                    <div
                        tabIndex={0}
                        aria-label="Daily check-ins"
                        className="space-y-4 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] pr-2"
                    >
                        {dateKeys
                            .slice()
                            .sort(
                                (a, b) =>
                                    (a > localDateValue() ? 1 : 0) -
                                        (b > localDateValue() ? 1 : 0) ||
                                    b.localeCompare(a),
                            )
                            .map((date) => (
                                <section
                                    key={date}
                                    className="rounded-xl border border-stone-200 p-3 sm:p-4"
                                >
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <h3 className="font-extrabold text-stone-950">
                                            {dateLabel(date, {
                                                weekday: 'long',
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </h3>
                                        <span className="text-xs font-semibold text-stone-500">
                                            {dateLabel(date, {
                                                dateStyle: 'short',
                                            })}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {CHECK_IN_SLOTS.map((slotDef) => {
                                            const record = getSlot(
                                                date,
                                                slotDef.id,
                                            );
                                            const rawStatus = getText(
                                                record ?? {},
                                                'status',
                                            ).toLowerCase();
                                            const status = !record
                                                ? 'unavailable'
                                                : rawStatus === 'answered'
                                                  ? 'answered'
                                                  : rawStatus === 'missed'
                                                    ? 'missed'
                                                    : 'pending';

                                            const reminder = isRecord(
                                                getValue(
                                                    record ?? {},
                                                    'reminder',
                                                ),
                                            )
                                                ? (getValue(
                                                      record ?? {},
                                                      'reminder',
                                                  ) as JsonRecord)
                                                : {};
                                            const reminderToken =
                                                getText(
                                                    record ?? {},
                                                    'reminderStatus',
                                                    'reminderState',
                                                ) ||
                                                getText(reminder, 'status') ||
                                                'not scheduled';
                                            const reminderState = reminderToken
                                                .replace(/[_-]+/g, ' ')
                                                .replace(/\b\w/g, (letter) =>
                                                    letter.toUpperCase(),
                                                );
                                            return (
                                                <article
                                                    key={slotDef.id}
                                                    className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <h4 className="font-bold text-stone-900">
                                                            {slotDef.label}
                                                        </h4>
                                                        <span
                                                            className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${status === 'answered' ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : status === 'missed' ? 'border-rose-300 bg-rose-100 text-rose-900' : status === 'pending' ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-slate-300 bg-slate-100 text-slate-700'}`}
                                                        >
                                                            {status[0].toUpperCase() +
                                                                status.slice(1)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-stone-600">
                                                        Reminder:{' '}
                                                        {reminderState}
                                                    </p>
                                                    {status === 'answered' ? (
                                                        <p className="mt-2 max-h-20 overflow-y-auto whitespace-pre-wrap rounded-lg border border-stone-200 bg-white p-2 text-sm leading-5 text-stone-800">
                                                            {getText(
                                                                record ?? {},
                                                                'response',
                                                                'answer',
                                                            ) ||
                                                                'No response text returned.'}
                                                        </p>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                !record ||
                                                                date >
                                                                    localDateValue()
                                                            }
                                                            onClick={() => {
                                                                setAnswerNotice(
                                                                    null,
                                                                );
                                                                setAnswerSlot({
                                                                    date,
                                                                    id: slotDef.id,
                                                                    label: slotDef.label,
                                                                });
                                                            }}
                                                            className="mt-3 min-h-10 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white disabled:opacity-45"
                                                        >
                                                            {status === 'missed'
                                                                ? 'Answer late'
                                                                : 'Answer check-in'}
                                                        </button>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                    </div>
                )}
                {answerNotice && (
                    <div className="mt-4">
                        <Notice kind={answerNotice.kind}>
                            {answerNotice.text}
                        </Notice>
                    </div>
                )}
            </Panel>
            {answerSlot && (
                <TrackerDialog
                    title={`${answerSlot.label} · ${dateLabel(answerSlot.date, { dateStyle: 'medium' })}`}
                    onClose={() => setAnswerSlot(null)}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submitAnswer(answerSlot.date, answerSlot.id);
                        }}
                        className="space-y-4"
                    >
                        <label className="grid gap-2 text-sm font-bold">
                            Response
                            <textarea
                                autoFocus
                                rows={5}
                                maxLength={4000}
                                required
                                value={
                                    answerText[
                                        `${answerSlot.date}:${answerSlot.id}`
                                    ] ?? ''
                                }
                                onChange={(e) =>
                                    setAnswerText((current) => ({
                                        ...current,
                                        [`${answerSlot.date}:${answerSlot.id}`]:
                                            e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg border border-stone-300 p-3 font-normal"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={
                                Boolean(answerBusy) ||
                                !answerText[
                                    `${answerSlot.date}:${answerSlot.id}`
                                ]?.trim()
                            }
                            className="min-h-10 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-45"
                        >
                            {answerBusy ? 'Saving…' : 'Save answer'}
                        </button>
                        {answerNotice && (
                            <Notice kind={answerNotice.kind}>
                                {answerNotice.text}
                            </Notice>
                        )}
                    </form>
                </TrackerDialog>
            )}
        </>
    );
}

function FoodSection() {
    const today = localDateValue();
    const [from, setFrom] = useState(addActivityDays(today, -29));
    const [to, setTo] = useState(today);
    const { data, state, error, reload } = usePrivateData(
        `${endpointBySection.food}?from=${from}&to=${to}`,
    );
    const root = isRecord(data) && isRecord(data.data) ? data.data : data;
    const entries = getArray(root, 'entries');
    const days = getArray(root, 'days');
    const [formOpen, setFormOpen] = useState(false);
    const [detailEntry, setDetailEntry] = useState<JsonRecord | null>(null);
    const [historyFrom, setHistoryFrom] = useState(addActivityDays(today, -29));
    const [historyTo, setHistoryTo] = useState(today);
    const [imageFilter, setImageFilter] = useState('all');
    const [historySort, setHistorySort] = useState('newest');
    const historyResource = usePrivateData(
        `${endpointBySection.food}?from=${historyFrom}&to=${historyTo}`,
    );
    const historyEntries = getArray(historyResource.data, 'entries').filter(
        (entry) =>
            imageFilter === 'all' ||
            (imageFilter === 'with'
                ? evidenceIds(entry).length > 0
                : evidenceIds(entry).length === 0),
    );
    const [editing, setEditing] = useState('');
    const [date, setDate] = useState(today);
    const [time, setTime] = useState('12:00');
    const [item, setItem] = useState('');
    const [portion, setPortion] = useState('');
    const [calories, setCalories] = useState('');
    const [source, setSource] = useState('estimated');
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [uploadDate, setUploadDate] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const idempotency = useIdempotencyKeys();
    const fileRef = useRef<HTMLInputElement>(null);
    const field =
        'min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal';
    const reset = () => {
        setEditing('');
        setItem('');
        setPortion('');
        setCalories('');
        setNotes('');
        setImages([]);
        setUploadDate('');
        setFile(null);
        setSource('estimated');
        if (fileRef.current) fileRef.current.value = '';
    };
    const edit = (entry: JsonRecord) => {
        reset();
        setDetailEntry(null);
        setFormOpen(true);
        setEditing(getText(entry, 'id'));
        setDate(getText(entry, 'date'));
        setTime(
            new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
            }).format(new Date(getText(entry, 'consumedAt'))),
        );
        setItem(getText(entry, 'item'));
        setPortion(getText(entry, 'portion'));
        setCalories(
            getNumber(entry, 'calories') === null
                ? ''
                : getText(entry, 'calories'),
        );
        setSource(getText(entry, 'calorieSource'));
        setNotes(getText(entry, 'notes'));
        const ids = getValue(entry, 'evidenceAssetIds');
        setImages(Array.isArray(ids) ? (ids as string[]) : []);
        setUploadDate(getText(entry, 'date'));
    };
    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setNotice(null);
        try {
            let evidence = images;
            if (evidence.length && uploadDate !== date)
                throw new Error(
                    'The attached image belongs to another date. Remove it or keep the meal on its original date.',
                );
            if (file && !images.length) {
                if (
                    !['image/jpeg', 'image/png', 'image/webp'].includes(
                        file.type,
                    ) ||
                    file.size <= 0 ||
                    file.size > 15 * 1024 * 1024
                )
                    throw new Error(
                        'Choose a JPEG, PNG or WebP image up to 15 MB.',
                    );
                const uploadPayload = {
                    action: 'initiate',
                    localDate: date,
                    category: 'general',
                    contentType: file.type,
                    byteSize: file.size,
                    displayName: file.name,
                    privateNotes: `Food: ${item}`,
                };
                const fingerprint = JSON.stringify({
                    ...uploadPayload,
                    lastModified: file.lastModified,
                });
                const response = await requestPrivateJson(
                    endpointBySection.body,
                    {
                        method: 'POST',
                        headers: {
                            'Idempotency-Key': idempotency.keyFor(fingerprint),
                        },
                        body: JSON.stringify(uploadPayload),
                    },
                );
                const upload =
                    isRecord(response) && isRecord(response.data)
                        ? response.data
                        : isRecord(response)
                          ? response
                          : {};
                const assetId = getText(upload, 'assetId');
                if (!assetId) throw new Error('Unable to create image upload.');
                if (getText(upload, 'status') !== 'ready') {
                    const url = new URL(getText(upload, 'uploadUrl'));
                    if (
                        url.protocol !== 'https:' ||
                        url.username ||
                        url.password
                    )
                        throw new Error('Invalid upload URL.');
                    const required = getValue(upload, 'requiredHeaders');
                    if (
                        !isRecord(required) ||
                        Object.values(required).some(
                            (v) => typeof v !== 'string',
                        )
                    )
                        throw new Error('Invalid upload headers.');
                    const sent = await fetch(url, {
                        method: 'PUT',
                        headers: required as Record<string, string>,
                        body: file,
                        credentials: 'omit',
                        redirect: 'error',
                        cache: 'no-store',
                    });
                    if (!sent.ok)
                        throw new Error('Image upload failed. Retry saving.');
                    await requestPrivateJson(endpointBySection.body, {
                        method: 'PATCH',
                        body: JSON.stringify({ action: 'finalize', assetId }),
                    });
                }
                idempotency.complete(fingerprint);
                evidence = [assetId];
                setImages(evidence);
                setUploadDate(date);
            }
            const payload = {
                ...(editing ? { id: editing } : {}),
                activityDate: date,
                consumedAt: new Date(`${date}T${time}:00+05:30`).toISOString(),
                item,
                portion: portion || null,
                calories: calories === '' ? null : Number(calories),
                calorieSource: calories === '' ? 'unknown' : source,
                notes: notes || null,
                evidenceAssetIds: evidence,
            };
            const fingerprint = JSON.stringify(payload);
            await requestPrivateJson(endpointBySection.food, {
                method: editing ? 'PATCH' : 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            reset();
            setFormOpen(false);
            historyResource.reload();
            setNotice({ kind: 'success', text: 'Food entry saved.' });
            reload();
        } catch (cause) {
            setNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'Unable to save food.',
            });
        } finally {
            setBusy(false);
        }
    };
    const points = days.filter(
        (day) =>
            getNumber(day, 'unknownCalories') !== getNumber(day, 'entryCount'),
    );
    const chartPoints = points.map((day) => ({
        date: getText(day, 'date'),
        value: getNumber(day, 'calories') ?? 0,
        details: [
            ...(getNumber(day, 'unknownCalories')
                ? [
                      `${getNumber(day, 'unknownCalories')} item(s) have unknown calories; total is partial.`,
                  ]
                : []),
            ...entries
                .filter(
                    (entry) =>
                        getText(entry, 'date', 'activityDate') ===
                        getText(day, 'date'),
                )
                .map(
                    (entry) =>
                        `${dateLabel(getText(entry, 'consumedAt'), { hour: '2-digit', minute: '2-digit' })} · ${getText(entry, 'item')} · ${getText(entry, 'portion')} · ${getNumber(entry, 'calories') === null ? 'Unknown calories' : getText(entry, 'calories') + ' kcal'}`,
                ),
        ],
    }));
    const foodGroups = [
        ...new Set(
            historyEntries.map((entry) =>
                getText(entry, 'date', 'activityDate'),
            ),
        ),
    ].sort((a, b) =>
        historySort === 'oldest' ? a.localeCompare(b) : b.localeCompare(a),
    );
    return (
        <>
            <Panel
                title="Daily calories"
                action={
                    <div className="grid grid-cols-1 items-end gap-3 min-[380px]:grid-cols-2 lg:flex lg:flex-nowrap">
                        <label className="grid min-w-0 gap-1 text-xs font-bold">
                            From
                            <input
                                type="date"
                                value={from}
                                max={to}
                                onChange={(e) =>
                                    e.target.value && setFrom(e.target.value)
                                }
                                className={field}
                            />
                        </label>
                        <label className="grid min-w-0 gap-1 text-xs font-bold">
                            To
                            <input
                                type="date"
                                value={to}
                                min={from}
                                max={today}
                                onChange={(e) =>
                                    e.target.value && setTo(e.target.value)
                                }
                                className={field}
                            />
                        </label>
                        <Link
                            href="/samik-admin/weight"
                            className="min-h-10 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                        >
                            Compare weight →
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                reset();
                                setDate(today);
                                setNotice(null);
                                setFormOpen(true);
                            }}
                            className="min-h-10 whitespace-nowrap rounded-lg bg-stone-950 px-3 py-2 text-sm font-bold text-white"
                        >
                            + Add food
                        </button>
                    </div>
                }
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && (
                    <>
                        {points.length ? (
                            <DailyLineChart
                                points={chartPoints}
                                from={from}
                                to={to}
                                unit="kcal"
                                label="Daily logged calorie totals"
                                emptyDetails={Object.fromEntries(
                                    days
                                        .filter(
                                            (day) =>
                                                getNumber(
                                                    day,
                                                    'unknownCalories',
                                                ) ===
                                                getNumber(day, 'entryCount'),
                                        )
                                        .map((day) => [
                                            getText(day, 'date'),
                                            [
                                                'Food logged, but all calories are unknown.',
                                            ],
                                        ]),
                                )}
                            />
                        ) : (
                            <EmptyState title="No calorie totals yet">
                                Add a food item and its calories to start the
                                graph.
                            </EmptyState>
                        )}
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[
                                {
                                    label: 'Logged calories',
                                    calories: chartPoints.reduce(
                                        (sum, point) => sum + point.value,
                                        0,
                                    ),
                                },
                                {
                                    label: 'Average / logged day',
                                    calories: chartPoints.length
                                        ? chartPoints.reduce(
                                              (sum, point) => sum + point.value,
                                              0,
                                          ) / chartPoints.length
                                        : null,
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                                >
                                    <p className="text-xs text-stone-500">
                                        {stat.label}
                                    </p>
                                    <p className="mt-2 text-lg font-bold">
                                        {stat.calories === null
                                            ? '—'
                                            : `${Math.round(stat.calories).toLocaleString()} kcal`}
                                    </p>
                                    {stat.calories !== null && (
                                        <p className="mt-1 text-sm text-stone-600">
                                            ≈{' '}
                                            {(stat.calories / 7700).toFixed(2)}{' '}
                                            kg energy equivalent
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-stone-500">
                            Energy equivalent uses roughly 7,700 kcal/kg. This
                            is food energy, not weight gained; gain depends on
                            your net surplus and changes in energy expenditure.
                        </p>
                    </>
                )}
            </Panel>
            {notice && !formOpen && (
                <Notice kind={notice.kind}>{notice.text}</Notice>
            )}
            {formOpen && (
                <TrackerDialog
                    title={editing ? 'Edit food entry' : 'Add food'}
                    onClose={() => setFormOpen(false)}
                >
                    <form
                        onSubmit={save}
                        className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <label className="grid gap-1 text-sm font-bold">
                            Date (IST)
                            <input
                                required
                                type="date"
                                max={today}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={field}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                            Time (IST)
                            <input
                                required
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className={field}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                            Food item
                            <input
                                required
                                maxLength={200}
                                value={item}
                                onChange={(e) => setItem(e.target.value)}
                                placeholder="What did you eat?"
                                className={field}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                            Portion · optional
                            <input
                                maxLength={200}
                                value={portion}
                                onChange={(e) => setPortion(e.target.value)}
                                placeholder="1 bowl, 200 g…"
                                className={field}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                            Calories (kcal) · optional
                            <input
                                type="number"
                                min="0"
                                max="20000"
                                step="0.01"
                                value={calories}
                                onChange={(e) => setCalories(e.target.value)}
                                placeholder="Leave blank if unknown"
                                className={field}
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                            Calorie source
                            <select
                                value={
                                    source === 'unknown' ? 'estimated' : source
                                }
                                onChange={(e) => setSource(e.target.value)}
                                className={field}
                            >
                                <option value="estimated">Estimated</option>
                                <option value="label">Food label</option>
                                <option value="measured">Measured</option>
                            </select>
                        </label>
                        <label className="grid gap-1 text-sm font-bold">
                            Photo · optional
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                    setFile(e.target.files?.[0] ?? null);
                                    setImages([]);
                                }}
                                className="w-full rounded-lg border border-stone-200 p-2 text-xs"
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-bold sm:col-span-2">
                            Notes · optional
                            <textarea
                                rows={3}
                                value={notes}
                                maxLength={2000}
                                onChange={(e) => setNotes(e.target.value)}
                                className={`${field} py-2`}
                            />
                        </label>
                        {images.length > 0 && (
                            <div className="sm:col-span-2 flex gap-3">
                                {images.map((id) => (
                                    <PrivateImage
                                        key={id}
                                        id={id}
                                        alt="Attached meal image"
                                        className="h-24 w-24 object-contain"
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImages([]);
                                        setFile(null);
                                        if (fileRef.current)
                                            fileRef.current.value = '';
                                    }}
                                    className="text-xs underline"
                                >
                                    Remove attachment
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3 lg:col-span-3">
                            <button
                                disabled={busy}
                                type="submit"
                                className="rounded-lg bg-stone-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {busy
                                    ? 'Saving…'
                                    : editing
                                      ? 'Save changes'
                                      : 'Save food'}
                            </button>
                            {editing && (
                                <button
                                    type="button"
                                    onClick={() => setFormOpen(false)}
                                    className="rounded-lg border border-stone-200 px-4 text-sm"
                                >
                                    Cancel editing
                                </button>
                            )}
                        </div>
                    </form>
                    {notice && (
                        <div className="mt-3">
                            <Notice kind={notice.kind}>{notice.text}</Notice>
                        </div>
                    )}
                </TrackerDialog>
            )}
            <FoodTracker />
            <Panel
                title="Food history"
                action={
                    <HistoryFilters
                        from={historyFrom}
                        to={historyTo}
                        onFrom={setHistoryFrom}
                        onTo={setHistoryTo}
                        images={imageFilter}
                        onImages={setImageFilter}
                        sort={historySort}
                        onSort={setHistorySort}
                    />
                }
            >
                <StatusPanel
                    state={historyResource.state}
                    error={historyResource.error}
                    onRetry={historyResource.reload}
                />
                {historyResource.state === 'ready' &&
                    (historyEntries.length ? (
                        <div className="space-y-5">
                            {foodGroups.map((day) => {
                                const meals = historyEntries
                                    .filter(
                                        (entry) =>
                                            getText(
                                                entry,
                                                'date',
                                                'activityDate',
                                            ) === day,
                                    )
                                    .sort((a, b) =>
                                        historySort === 'oldest'
                                            ? getText(
                                                  a,
                                                  'consumedAt',
                                              ).localeCompare(
                                                  getText(b, 'consumedAt'),
                                              )
                                            : getText(
                                                  b,
                                                  'consumedAt',
                                              ).localeCompare(
                                                  getText(a, 'consumedAt'),
                                              ),
                                    );
                                return (
                                    <section key={day}>
                                        <h3 className="mb-3 text-sm font-bold">
                                            {dateLabel(day, {
                                                dateStyle: 'medium',
                                            })}{' '}
                                            · {meals.length} items ·{' '}
                                            {meals
                                                .reduce(
                                                    (sum, entry) =>
                                                        sum +
                                                        (getNumber(
                                                            entry,
                                                            'calories',
                                                        ) ?? 0),
                                                    0,
                                                )
                                                .toLocaleString()}{' '}
                                            kcal logged
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                            {meals.map((entry) => {
                                                const ids = evidenceIds(entry);
                                                const meal = getText(
                                                    entry,
                                                    'item',
                                                );
                                                return (
                                                    <article
                                                        key={getText(
                                                            entry,
                                                            'id',
                                                        )}
                                                        className="group min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white"
                                                    >
                                                        <div className="relative grid h-36 place-items-center bg-stone-100 p-2">
                                                            {ids[0] ? (
                                                                <PrivateImage
                                                                    id={ids[0]}
                                                                    alt={meal}
                                                                    className="h-full w-full object-contain"
                                                                />
                                                            ) : (
                                                                <div className="grid place-items-center gap-2 text-stone-400">
                                                                    <Utensils
                                                                        size={
                                                                            36
                                                                        }
                                                                    />
                                                                    <span className="text-xs">
                                                                        No photo
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="pointer-events-none absolute inset-0 overflow-y-auto bg-white/95 p-3 pr-12 text-xs opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                                                                <p className="font-bold">
                                                                    {meal}
                                                                </p>
                                                                <p className="mt-1">
                                                                    {getText(
                                                                        entry,
                                                                        'portion',
                                                                    )}
                                                                </p>
                                                                <p className="mt-1 whitespace-pre-wrap">
                                                                    {getText(
                                                                        entry,
                                                                        'notes',
                                                                    )}
                                                                </p>
                                                                <p className="mt-2 text-stone-500">
                                                                    {getText(
                                                                        entry,
                                                                        'calorieSource',
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setDetailEntry(
                                                                        entry,
                                                                    )
                                                                }
                                                                aria-label={`View ${meal}`}
                                                                className="absolute right-2 top-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm"
                                                            >
                                                                <Maximize2
                                                                    size={16}
                                                                />
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1 p-3">
                                                            <h4
                                                                className="truncate text-sm font-bold"
                                                                title={meal}
                                                            >
                                                                {meal}
                                                            </h4>
                                                            <p className="text-xs text-stone-500">
                                                                {dateLabel(
                                                                    getText(
                                                                        entry,
                                                                        'consumedAt',
                                                                    ),
                                                                    {
                                                                        hour: 'numeric',
                                                                        minute: '2-digit',
                                                                    },
                                                                )}
                                                            </p>
                                                            <p className="text-sm font-bold">
                                                                {getNumber(
                                                                    entry,
                                                                    'calories',
                                                                ) === null
                                                                    ? 'Unknown calories'
                                                                    : `${getNumber(entry, 'calories')?.toLocaleString()} kcal`}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    edit(entry)
                                                                }
                                                                className="mt-2 min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-bold"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState title="No meals match these filters">
                            Choose another range or image filter.
                        </EmptyState>
                    ))}
            </Panel>
            {detailEntry && (
                <TrackerDialog
                    title={getText(detailEntry, 'item')}
                    onClose={() => setDetailEntry(null)}
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {evidenceIds(detailEntry).map((id) => (
                            <PrivateImage
                                key={id}
                                id={id}
                                alt={getText(detailEntry, 'item')}
                                className="h-64 w-full object-contain"
                            />
                        ))}
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div>
                            <dt className="font-bold">Date / time (IST)</dt>
                            <dd>
                                {dateLabel(getText(detailEntry, 'consumedAt'), {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </dd>
                        </div>
                        <div>
                            <dt className="font-bold">Portion</dt>
                            <dd>{getText(detailEntry, 'portion') || '—'}</dd>
                        </div>
                        <div>
                            <dt className="font-bold">Calories</dt>
                            <dd>
                                {getNumber(detailEntry, 'calories') === null
                                    ? 'Unknown'
                                    : `${getNumber(detailEntry, 'calories')?.toLocaleString()} kcal`}{' '}
                                · {getText(detailEntry, 'calorieSource')}
                            </dd>
                        </div>
                        {getText(detailEntry, 'notes') && (
                            <div>
                                <dt className="font-bold">Notes</dt>
                                <dd className="whitespace-pre-wrap break-words">
                                    {getText(detailEntry, 'notes')}
                                </dd>
                            </div>
                        )}
                    </dl>
                    <button
                        type="button"
                        onClick={() => edit(detailEntry)}
                        className="mt-5 rounded-lg bg-stone-950 px-4 py-3 text-sm font-bold text-white"
                    >
                        Edit food entry
                    </button>
                </TrackerDialog>
            )}
        </>
    );
}
function FoodTracker() {
    const today = localDateValue();
    const { data, state, error, reload } = usePrivateData(
        `${endpointBySection.food}?from=${addActivityDays(today, -3660)}&to=${today}`,
    );
    const root = isRecord(data) && isRecord(data.data) ? data.data : data;
    return (
        <Panel
            title="Food logging tracker"
            description="Completed means you logged food that day. It does not indicate a calorie target."
        >
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && (
                <DailyHeatmap
                    title="Food logged"
                    rows={getArray(root, 'days').map((day) => ({
                        ...day,
                        status: 'complete',
                        activity: `${getText(day, 'calories')} kcal logged`,
                        notes: getArray(root, 'entries')
                            .filter(
                                (entry) =>
                                    getText(entry, 'date') ===
                                    getText(day, 'date'),
                            )
                            .map(
                                (entry) =>
                                    `${dateLabel(getText(entry, 'consumedAt'), { hour: '2-digit', minute: '2-digit' })} · ${getText(entry, 'item')} · ${getText(entry, 'portion')} · ${getNumber(entry, 'calories') === null ? 'Unknown calories' : `${getText(entry, 'calories')} kcal`}${getText(entry, 'notes') ? ` — ${getText(entry, 'notes')}` : ''}`,
                            )
                            .join('\n'),
                    }))}
                />
            )}
        </Panel>
    );
}

function WeightReviewEditor({
    record,
    busy,
    onCancel,
    onSave,
}: {
    record: JsonRecord;
    busy: boolean;
    onCancel: () => void;
    onSave: (payload: JsonRecord) => Promise<void>;
}) {
    const [value, setValue] = useState(getText(record, 'originalValue'));
    const [unit, setUnit] = useState(getText(record, 'originalUnit'));
    const [date, setDate] = useState(getText(record, 'date', 'activityDate'));
    const [notes, setNotes] = useState(getText(record, 'notes'));
    const [primary, setPrimary] = useState(
        getValue(record, 'isPrimary') === true,
    );
    const pending = getText(record, 'confirmationStatus') === 'pending';
    const ids = getValue(record, 'evidenceAssetIds');
    const evidence = Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === 'string')
        : [];
    const field =
        'min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300';
    return (
        <form
            className="mt-3 grid gap-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 lg:grid-cols-[220px_1fr]"
            onSubmit={(event) => {
                event.preventDefault();
                void onSave({
                    id: getText(record, 'id'),
                    originalValue: Number(value),
                    originalUnit: unit,
                    notes: notes.trim() || null,
                    activityDate: date,
                    ...(date !== getText(record, 'date', 'activityDate')
                        ? { measuredAt: `${date}T08:00:00+05:30` }
                        : {}),
                    ...(pending ? { confirmationStatus: 'confirmed' } : {}),
                    isPrimary: primary,
                });
            }}
        >
            <div>
                {evidence.length ? (
                    <div className="space-y-2">
                        {evidence.map((id) => (
                            <PrivateImage
                                key={id}
                                id={id}
                                alt="Weight measurement evidence"
                                className="h-48 rounded-lg border border-stone-200"
                            />
                        ))}
                        <p className="mt-2 text-xs text-stone-600">
                            Review the image and correct the value before
                            confirming.
                        </p>
                    </div>
                ) : (
                    <p className="rounded-lg border border-stone-200 bg-white p-3 text-xs text-stone-600">
                        Manual reading. An image is optional for manual and MCP
                        entries.
                    </p>
                )}
            </div>
            <div className="space-y-3">
                <h4 className="font-bold text-stone-950">
                    {pending ? 'Review & confirm reading' : 'Edit measurement'}
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1 text-xs font-bold">
                        Weight
                        <input
                            required
                            type="number"
                            min="0.001"
                            max="2200"
                            step="0.001"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className={field}
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-bold">
                        Unit
                        <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className={field}
                        >
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                            <option value="st">st</option>
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-bold">
                        Date (IST)
                        <input
                            required
                            type="date"
                            max={localDateValue()}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={field}
                        />
                    </label>
                </div>
                <label className="grid gap-1 text-xs font-bold">
                    Notes
                    <input
                        value={notes}
                        maxLength={2000}
                        onChange={(e) => setNotes(e.target.value)}
                        className={field}
                    />
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={primary}
                        onChange={(e) => setPrimary(e.target.checked)}
                        className="h-4 w-4 accent-stone-950"
                    />
                    Use this reading in the chart
                </label>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={busy || !value || Number(value) <= 0}
                        className="min-h-10 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-50"
                    >
                        {busy
                            ? 'Saving…'
                            : pending
                              ? 'Confirm & save'
                              : 'Save changes'}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={onCancel}
                        className="min-h-10 rounded-lg border border-stone-300 bg-white px-4 text-sm font-bold"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </form>
    );
}

function normalizeWeightEntries(dataRoot: unknown) {
    return getArray(dataRoot, 'entries', 'weights', 'measurements')
        .flatMap((record) => {
            const originalValue = Number(
                getValue(record, 'originalValue', 'original_value'),
            );
            const rawDate = getValue(
                record,
                'date',
                'activityDate',
                'measuredAt',
                'createdAt',
            );
            const rawMeasuredAt = getValue(
                record,
                'measuredAt',
                'measured_at',
                'date',
                'activityDate',
                'createdAt',
            );
            const timestamp = timestampForActivityDate(rawMeasuredAt);
            const dateValue =
                getText(record, 'date', 'activityDate') ||
                (typeof rawDate === 'string' ? rawDate.slice(0, 10) : '');
            if (
                !Number.isFinite(originalValue) ||
                !Number.isFinite(timestamp) ||
                !dateValue
            )
                return [];
            const weightKgValue = Number(
                getValue(record, 'weightKg', 'weight_kg'),
            );
            const confirmationStatus = getText(
                record,
                'confirmationStatus',
                'confirmation_status',
            ).toLowerCase();
            return [
                {
                    record,
                    value: Number.isFinite(weightKgValue)
                        ? weightKgValue
                        : Number.NaN,
                    timestamp,
                    date: dateValue,
                    originalValue,
                    originalUnit:
                        getText(record, 'originalUnit', 'original_unit') ||
                        'Unit not set',
                    isPrimary:
                        getValue(record, 'isPrimary', 'is_primary') === true,
                    confirmationStatus,
                    source: getText(record, 'source') || 'unknown',
                    id: getText(record, 'id'),
                },
            ];
        })
        .sort((a, b) => a.timestamp - b.timestamp);
}

function WeightSection() {
    const today = localDateValue();
    const [chartFrom, setChartFrom] = useState(() =>
        addActivityDays(today, -29),
    );
    const [chartTo, setChartTo] = useState(today);
    const { data, state, error, reload } = usePrivateData(
        `${endpointBySection.weight}?from=${chartFrom}&to=${chartTo}`,
    );
    const [addOpen, setAddOpen] = useState(false);
    const [historyFrom, setHistoryFrom] = useState(addActivityDays(today, -29));
    const [historyTo, setHistoryTo] = useState(today);
    const [imageFilter, setImageFilter] = useState('all');
    const [historySort, setHistorySort] = useState('newest');
    const historyResource = usePrivateData(
        `${endpointBySection.weight}?from=${historyFrom}&to=${historyTo}`,
    );
    const [date, setDate] = useState(localDateValue);
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState('');
    const [notes, setNotes] = useState('');
    const [primary, setPrimary] = useState(false);
    const [busy, setBusy] = useState(false);
    const idempotency = useIdempotencyKeys();
    const [notice, setNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const [imageValue, setImageValue] = useState('');
    const [imageUnit, setImageUnit] = useState('');
    const [imageNotes, setImageNotes] = useState('');
    const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(
        [],
    );
    const [imageBusy, setImageBusy] = useState(false);
    const [imageNotice, setImageNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const [confirmingId, setConfirmingId] = useState('');
    const [reviewId, setReviewId] = useState('');
    const [confirmNotice, setConfirmNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const entries = useMemo(() => normalizeWeightEntries(dataRoot), [dataRoot]);
    const historyEntries = normalizeWeightEntries(historyResource.data)
        .filter(
            (entry) =>
                imageFilter === 'all' ||
                (imageFilter === 'with'
                    ? evidenceIds(entry.record).length > 0
                    : evidenceIds(entry.record).length === 0),
        )
        .sort((a, b) =>
            historySort === 'oldest'
                ? a.timestamp - b.timestamp
                : b.timestamp - a.timestamp,
        );
    const primaryValue = getValue(
        isRecord(dataRoot) ? dataRoot : {},
        'primaryMeasurements',
    );
    const primaryIds = Array.isArray(primaryValue)
        ? new Set(
              primaryValue
                  .filter(isRecord)
                  .map((entry) => getText(entry, 'id'))
                  .filter(Boolean),
          )
        : null;
    const chartEntries = entries.filter(
        (entry) =>
            entry.isPrimary &&
            entry.confirmationStatus === 'confirmed' &&
            Number.isFinite(entry.value) &&
            (!primaryIds || primaryIds.has(entry.id)),
    );
    const missingValue = getValue(
        isRecord(dataRoot) ? dataRoot : {},
        'missingDates',
    );
    const missingDates = Array.isArray(missingValue)
        ? [
              ...new Set(
                  missingValue.filter(
                      (item): item is string => typeof item === 'string',
                  ),
              ),
          ].sort()
        : [];
    const evidenceEndpoint = `${endpointBySection.body}?category=weight_evidence&from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`;
    const evidenceResource = usePrivateData(evidenceEndpoint);
    const evidenceRoot =
        isRecord(evidenceResource.data) && isRecord(evidenceResource.data.data)
            ? evidenceResource.data.data
            : evidenceResource.data;
    const evidenceImages = getArray(evidenceRoot, 'items', 'media').filter(
        (item) =>
            getText(item, 'category') !== 'body' &&
            getText(item, 'date', 'activityDate') === date &&
            getText(item, 'type', 'contentType', 'content_type')
                .toLowerCase()
                .startsWith('image/'),
    );

    const changeActivityDate = (nextDate: string) => {
        setDate(nextDate);
        setSelectedEvidenceIds([]);
        setImageValue('');
        setImageUnit('');
        setImageNotes('');
        setImageNotice(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const numeric = Number(value);
        if (
            !date ||
            !value ||
            !Number.isFinite(numeric) ||
            numeric <= 0 ||
            !unit ||
            busy
        )
            return;
        const payload = {
            activityDate: date,
            originalValue: numeric,
            originalUnit: unit,
            notes: notes.trim() || undefined,
            isPrimary: primary,
        };
        const fingerprint = JSON.stringify(payload);
        setBusy(true);
        setNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setNotice({ kind: 'success', text: 'Measurement saved.' });
            setAddOpen(false);
            setValue('');
            setNotes('');
            setPrimary(false);
            reload();
            historyResource.reload();
        } catch (cause) {
            setNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The measurement could not be saved.',
            });
        } finally {
            setBusy(false);
        }
    };

    const handleImageCandidate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const numeric = Number(imageValue);
        const evidenceAssetIds = [...new Set(selectedEvidenceIds)].sort();
        if (
            !date ||
            !imageValue ||
            !Number.isFinite(numeric) ||
            numeric <= 0 ||
            !imageUnit ||
            evidenceAssetIds.length === 0 ||
            imageBusy
        )
            return;
        const payload = {
            activityDate: date,
            originalValue: numeric,
            originalUnit: imageUnit,
            notes: imageNotes.trim() || undefined,
            source: 'image',
            evidenceAssetIds,
            confirmationStatus: 'pending',
            isPrimary: false,
        };
        const fingerprint = JSON.stringify(payload);
        setImageBusy(true);
        setImageNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setAddOpen(false);
            setImageNotice({
                kind: 'success',
                text: 'Image-derived candidate saved. It is pending your confirmation and is not charted.',
            });
            setImageValue('');
            setImageUnit('');
            setImageNotes('');
            setSelectedEvidenceIds([]);
            reload();
            historyResource.reload();
        } catch (cause) {
            setImageNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The candidate could not be saved.',
            });
        } finally {
            setImageBusy(false);
        }
    };

    const saveReviewedReading = async (payload: JsonRecord) => {
        const id = getText(payload, 'id');
        if (confirmingId) return;
        const fingerprint = JSON.stringify(payload);
        setConfirmingId(id);
        setConfirmNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, {
                method: 'PATCH',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setReviewId('');
            setConfirmNotice({ kind: 'success', text: 'Measurement saved.' });
            reload();
            historyResource.reload();
        } catch (cause) {
            setConfirmNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The measurement could not be saved.',
            });
        } finally {
            setConfirmingId('');
        }
    };

    const setPrimaryEntry = async (id: string) => {
        if (!id || busy) return;
        const payload = { id, isPrimary: true };
        const fingerprint = JSON.stringify(payload);
        setBusy(true);
        setNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, {
                method: 'PATCH',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setNotice({
                kind: 'success',
                text: 'Primary measurement updated.',
            });
            reload();
            historyResource.reload();
        } catch (cause) {
            setNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The primary measurement could not be updated.',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Panel
                title="Recorded weight"
                action={
                    <div className="grid grid-cols-1 items-end gap-3 min-[380px]:grid-cols-2 lg:flex lg:flex-nowrap">
                        <label className="grid min-w-0 gap-1 text-xs font-bold">
                            From
                            <input
                                type="date"
                                value={chartFrom}
                                max={chartTo}
                                onChange={(e) =>
                                    e.target.value &&
                                    setChartFrom(e.target.value)
                                }
                                className="min-h-10 min-w-0 rounded-lg border border-stone-300 px-3 text-sm"
                            />
                        </label>
                        <label className="grid min-w-0 gap-1 text-xs font-bold">
                            To
                            <input
                                type="date"
                                value={chartTo}
                                min={chartFrom}
                                max={today}
                                onChange={(e) =>
                                    e.target.value && setChartTo(e.target.value)
                                }
                                className="min-h-10 min-w-0 rounded-lg border border-stone-300 px-3 text-sm"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setNotice(null);
                                setImageNotice(null);
                                setAddOpen(true);
                            }}
                            className="min-h-10 whitespace-nowrap rounded-lg bg-stone-950 px-3 py-2 text-sm font-bold text-white"
                        >
                            + Add measurement
                        </button>
                    </div>
                }
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && chartEntries.length === 0 && (
                    <EmptyState title="No confirmed primary measurements">
                        Pending, rejected, and non-primary entries stay out of
                        the chart. Confirm a candidate, then choose Make
                        primary.
                    </EmptyState>
                )}
                {state === 'ready' && chartEntries.length > 0 && (
                    <>
                        <WeightChart
                            entries={chartEntries}
                            unit="kg"
                            from={chartFrom}
                            to={chartTo}
                        />
                    </>
                )}
                {state === 'ready' && missingDates.length > 0 && (
                    <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
                        <summary className="cursor-pointer text-sm font-bold text-stone-800">
                            Dates without a confirmed primary measurement (
                            {missingDates.length})
                        </summary>
                        <ul className="mt-3 grid max-h-44 grid-cols-2 gap-2 overflow-y-auto text-xs text-stone-600 sm:grid-cols-4 lg:grid-cols-6">
                            {missingDates.map((missingDate) => (
                                <li key={missingDate}>
                                    {dateLabel(missingDate, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </Panel>
            <WeightTracker />
            {notice && !addOpen && (
                <Notice kind={notice.kind}>{notice.text}</Notice>
            )}
            {imageNotice && !addOpen && (
                <Notice kind={imageNotice.kind}>{imageNotice.text}</Notice>
            )}
            {addOpen && (
                <TrackerDialog
                    title="Add measurement"
                    onClose={() => setAddOpen(false)}
                >
                    <div className="space-y-4 p-3">
                        {' '}
                        <Panel
                            title="Record a measurement"
                            description="Save the original value and unit. Choose whether this manual entry should be the primary measurement."
                        >
                            <form
                                onSubmit={handleSubmit}
                                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
                            >
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Activity date (IST)
                                    <input
                                        required
                                        type="date"
                                        value={date}
                                        onChange={(event) =>
                                            changeActivityDate(
                                                event.target.value,
                                            )
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    />
                                </label>
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Original value
                                    <input
                                        required
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        min="0.01"
                                        max="1000"
                                        value={value}
                                        onChange={(event) =>
                                            setValue(event.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                        placeholder="Enter a value"
                                    />
                                </label>
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Original unit
                                    <select
                                        required
                                        value={unit}
                                        onChange={(event) =>
                                            setUnit(event.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    >
                                        <option value="">Choose a unit</option>
                                        <option value="kg">
                                            Kilograms (kg)
                                        </option>
                                        <option value="lb">Pounds (lb)</option>
                                        <option value="st">Stones (st)</option>
                                    </select>
                                </label>
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Notes (optional)
                                    <input
                                        maxLength={2000}
                                        value={notes}
                                        onChange={(event) =>
                                            setNotes(event.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                        placeholder="Optional note"
                                    />
                                </label>
                                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-stone-800 lg:col-span-3">
                                    <input
                                        type="checkbox"
                                        checked={primary}
                                        onChange={(event) =>
                                            setPrimary(event.target.checked)
                                        }
                                        className="h-4 w-4 accent-stone-950"
                                    />
                                    Set this as the primary measurement
                                </label>
                                <button
                                    type="submit"
                                    disabled={
                                        busy ||
                                        !date ||
                                        !value ||
                                        !unit ||
                                        !Number.isFinite(Number(value)) ||
                                        Number(value) <= 0
                                    }
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"
                                >
                                    <Plus size={16} aria-hidden="true" />
                                    {busy ? 'Saving…' : 'Save measurement'}
                                </button>
                            </form>
                            {notice && (
                                <div className="mt-4">
                                    <Notice kind={notice.kind}>
                                        {notice.text}
                                    </Notice>
                                </div>
                            )}
                        </Panel>
                        <Panel
                            title="Add from an image"
                            description="Select a same-day image and enter its reading. Review it in history before adding it to the chart."
                        >
                            <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                                Image-based entries stay pending owner
                                confirmation and cannot become primary or affect
                                the chart until confirmed.
                            </div>
                            <StatusPanel
                                state={evidenceResource.state}
                                error={evidenceResource.error}
                                onRetry={evidenceResource.reload}
                            />
                            {evidenceResource.state === 'ready' &&
                                evidenceImages.length === 0 && (
                                    <EmptyState title="No same-day weight evidence images">
                                        Upload or choose a non-body private
                                        image for{' '}
                                        {dateLabel(date, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}{' '}
                                        in the{' '}
                                        <Link
                                            href="/samik-admin/body"
                                            className="font-bold underline underline-offset-2"
                                        >
                                            private media workspace
                                        </Link>{' '}
                                        using General or Habit evidence. Body
                                        photos are excluded.
                                    </EmptyState>
                                )}
                            {evidenceResource.state === 'ready' &&
                                evidenceImages.length > 0 && (
                                    <fieldset className="mb-4 space-y-2">
                                        <legend className="mb-2 text-sm font-bold text-stone-800">
                                            Same-day private images for
                                            provenance
                                        </legend>
                                        {evidenceImages.map((item, index) => {
                                            const id = getText(
                                                item,
                                                'id',
                                                'assetId',
                                            );
                                            const checked =
                                                selectedEvidenceIds.includes(
                                                    id,
                                                );
                                            return (
                                                <label
                                                    key={
                                                        id ||
                                                        `evidence-${index}`
                                                    }
                                                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        disabled={
                                                            !id || imageBusy
                                                        }
                                                        checked={checked}
                                                        onChange={(event) =>
                                                            setSelectedEvidenceIds(
                                                                (current) =>
                                                                    event.target
                                                                        .checked
                                                                        ? [
                                                                              ...new Set(
                                                                                  [
                                                                                      ...current,
                                                                                      id,
                                                                                  ],
                                                                              ),
                                                                          ]
                                                                        : current.filter(
                                                                              (
                                                                                  assetId,
                                                                              ) =>
                                                                                  assetId !==
                                                                                  id,
                                                                          ),
                                                            )
                                                        }
                                                        className="mt-1 h-4 w-4 accent-stone-950"
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block font-bold text-stone-900">
                                                            {getText(
                                                                item,
                                                                'title',
                                                                'displayName',
                                                            ) ||
                                                                'Private image'}
                                                        </span>
                                                        <span className="mt-1 block text-xs text-stone-600">
                                                            {dateLabel(
                                                                getValue(
                                                                    item,
                                                                    'date',
                                                                ),
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                },
                                                            )}{' '}
                                                            IST ·{' '}
                                                            {getText(
                                                                item,
                                                                'type',
                                                                'contentType',
                                                            )
                                                                .replace(
                                                                    'image/',
                                                                    '',
                                                                )
                                                                .toUpperCase()}
                                                            {getValue(
                                                                item,
                                                                'byteSize',
                                                            )
                                                                ? ` · ${Math.round(Number(getValue(item, 'byteSize')) / 1024)} KB`
                                                                : ''}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </fieldset>
                                )}
                            {evidenceResource.state === 'ready' &&
                                evidenceImages.length > 0 && (
                                    <form
                                        onSubmit={handleImageCandidate}
                                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
                                    >
                                        <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                            Transcribed value
                                            <input
                                                required
                                                type="number"
                                                inputMode="decimal"
                                                step="any"
                                                min="0.01"
                                                max="1000"
                                                value={imageValue}
                                                onChange={(event) =>
                                                    setImageValue(
                                                        event.target.value,
                                                    )
                                                }
                                                className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                                placeholder="Enter the reading yourself"
                                            />
                                        </label>
                                        <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                            Unit
                                            <select
                                                required
                                                value={imageUnit}
                                                onChange={(event) =>
                                                    setImageUnit(
                                                        event.target.value,
                                                    )
                                                }
                                                className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                            >
                                                <option value="">
                                                    Choose a unit
                                                </option>
                                                <option value="kg">
                                                    Kilograms (kg)
                                                </option>
                                                <option value="lb">
                                                    Pounds (lb)
                                                </option>
                                                <option value="st">
                                                    Stones (st)
                                                </option>
                                            </select>
                                        </label>
                                        <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800 lg:col-span-1">
                                            Notes (optional)
                                            <input
                                                maxLength={2000}
                                                value={imageNotes}
                                                onChange={(event) =>
                                                    setImageNotes(
                                                        event.target.value,
                                                    )
                                                }
                                                className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                                placeholder="Optional note"
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={
                                                imageBusy ||
                                                !date ||
                                                !imageValue ||
                                                !imageUnit ||
                                                selectedEvidenceIds.length ===
                                                    0 ||
                                                !Number.isFinite(
                                                    Number(imageValue),
                                                ) ||
                                                Number(imageValue) <= 0
                                            }
                                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700"
                                        >
                                            {imageBusy
                                                ? 'Saving…'
                                                : 'Save pending candidate'}
                                        </button>
                                    </form>
                                )}
                            {imageNotice && (
                                <div className="mt-4">
                                    <Notice kind={imageNotice.kind}>
                                        {imageNotice.text}
                                    </Notice>
                                </div>
                            )}
                        </Panel>
                    </div>
                </TrackerDialog>
            )}
            <Panel
                title="Measurement history"
                action={
                    <HistoryFilters
                        from={historyFrom}
                        to={historyTo}
                        onFrom={setHistoryFrom}
                        onTo={setHistoryTo}
                        images={imageFilter}
                        onImages={setImageFilter}
                        sort={historySort}
                        onSort={setHistorySort}
                    />
                }
            >
                <StatusPanel
                    state={historyResource.state}
                    error={historyResource.error}
                    onRetry={historyResource.reload}
                />
                {historyResource.state === 'ready' &&
                    historyEntries.length === 0 && (
                        <EmptyState title="No measurements available">
                            Saved manual entries and image-derived candidates
                            will appear here.
                        </EmptyState>
                    )}
                {historyResource.state === 'ready' &&
                    historyEntries.length > 0 && (
                        <ul
                            tabIndex={0}
                            aria-label="Measurement history"
                            className="max-h-[560px] overflow-y-auto overscroll-contain [scrollbar-gutter:stable] divide-y divide-stone-200 pr-2"
                        >
                            {historyEntries.map((entry, index) => {
                                const {
                                    record,
                                    date: itemDate,
                                    originalValue,
                                    originalUnit,
                                    isPrimary,
                                    confirmationStatus,
                                    source,
                                    id,
                                } = entry;
                                const statusStyle =
                                    confirmationStatus === 'confirmed'
                                        ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                                        : confirmationStatus === 'rejected'
                                          ? 'border-rose-300 bg-rose-100 text-rose-900'
                                          : 'border-amber-300 bg-amber-100 text-amber-900';
                                const statusLabel =
                                    confirmationStatus === 'pending'
                                        ? 'Pending owner confirmation'
                                        : confirmationStatus
                                          ? confirmationStatus[0].toUpperCase() +
                                            confirmationStatus.slice(1)
                                          : 'Status not returned';
                                return (
                                    <li
                                        key={id || `${itemDate}-${index}`}
                                        className="py-4"
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-extrabold tabular-nums text-stone-950">
                                                        {originalValue.toLocaleString(
                                                            undefined,
                                                            {
                                                                maximumFractionDigits: 2,
                                                            },
                                                        )}{' '}
                                                        {originalUnit}
                                                    </span>
                                                    <span
                                                        className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusStyle}`}
                                                    >
                                                        {statusLabel}
                                                    </span>
                                                    {isPrimary &&
                                                        confirmationStatus ===
                                                            'confirmed' && (
                                                            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                                                Primary
                                                            </span>
                                                        )}
                                                    {confirmationStatus ===
                                                        'confirmed' &&
                                                        !isPrimary && (
                                                            <span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                                                                Non-primary
                                                            </span>
                                                        )}
                                                </div>
                                                <p className="mt-1 text-sm text-stone-600">
                                                    {dateLabel(itemDate, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}{' '}
                                                    IST ·{' '}
                                                    {source === 'image'
                                                        ? 'Image provenance · owner-transcribed'
                                                        : source === 'manual'
                                                          ? 'Manual entry'
                                                          : `Source: ${source}`}
                                                    {getText(record, 'notes')
                                                        ? ` · ${getText(record, 'notes')}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        !id ||
                                                        Boolean(confirmingId)
                                                    }
                                                    onClick={() =>
                                                        setReviewId(
                                                            reviewId === id
                                                                ? ''
                                                                : id,
                                                        )
                                                    }
                                                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 disabled:opacity-50"
                                                >
                                                    {confirmationStatus ===
                                                    'pending'
                                                        ? 'Review & confirm'
                                                        : 'Edit reading'}
                                                </button>
                                                {confirmationStatus ===
                                                    'confirmed' &&
                                                    !isPrimary && (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                !id || busy
                                                            }
                                                            onClick={() =>
                                                                void setPrimaryEntry(
                                                                    id,
                                                                )
                                                            }
                                                            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700"
                                                        >
                                                            Make primary
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                {confirmNotice && (
                    <div className="mt-4">
                        <Notice kind={confirmNotice.kind}>
                            {confirmNotice.text}
                        </Notice>
                    </div>
                )}
            </Panel>
            {reviewId &&
                historyEntries.find((entry) => entry.id === reviewId) && (
                    <TrackerDialog
                        title="Edit / review measurement"
                        onClose={() => setReviewId('')}
                    >
                        <WeightReviewEditor
                            key={reviewId}
                            record={
                                historyEntries.find(
                                    (entry) => entry.id === reviewId,
                                )!.record
                            }
                            busy={Boolean(confirmingId)}
                            onCancel={() => setReviewId('')}
                            onSave={saveReviewedReading}
                        />
                        {confirmNotice && (
                            <Notice kind={confirmNotice.kind}>
                                {confirmNotice.text}
                            </Notice>
                        )}
                    </TrackerDialog>
                )}
        </>
    );
}

function WeightTracker() {
    const today = localDateValue();
    const resource = usePrivateData(
        `${endpointBySection.weight}?from=${addActivityDays(today, -3660)}&to=${today}&view=tracker`,
    );
    const root =
        isRecord(resource.data) && isRecord(resource.data.data)
            ? resource.data.data
            : resource.data;
    const rows = getArray(root, 'entries')
        .filter((entry) => getText(entry, 'confirmationStatus') === 'confirmed')
        .map((entry) => ({
            ...entry,
            date: getText(entry, 'date', 'activityDate'),
            status: 'completed',
            activity: `${getText(entry, 'weightKg')} kg · ${getText(entry, 'originalValue')} ${getText(entry, 'originalUnit')}`,
        }));
    return (
        <Panel
            title="Weight tracker"
            description="Days with a confirmed measurement. Select a day to see readings and notes."
        >
            <StatusPanel
                state={resource.state}
                error={resource.error}
                onRetry={resource.reload}
            />
            {resource.state === 'ready' && (
                <DailyHeatmap title="Weight logged" rows={rows} />
            )}
        </Panel>
    );
}

function WeightChart({
    entries,
    unit,
    from,
    to,
}: {
    entries: {
        record: JsonRecord;
        value: number;
        timestamp: number;
        date: unknown;
    }[];
    unit: string;
    from: string;
    to: string;
}) {
    const points = entries.map((item) => ({
        date: String(item.date).slice(0, 10),
        value: item.value,
        details: [getText(item.record, 'notes')].filter(Boolean),
    }));
    return (
        <DailyLineChart
            points={points}
            from={from}
            to={to}
            unit={unit}
            label="Recorded weight over time"
        />
    );
}

function BodyPlaybackLane({ items }: { items: JsonRecord[] }) {
    const [from, setFrom] = useState(
        () =>
            items
                .map((item) => getText(item, 'date'))
                .filter(Boolean)
                .sort()[0] ?? '',
    );
    const [poseFilter, setPoseFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('body');
    const [to, setTo] = useState(localDateValue);
    const [position, setPosition] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState('2');
    const [urls, setUrls] = useState<Map<string, string>>(new Map());
    const [buffering, setBuffering] = useState(false);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [reducedMotion, setReducedMotion] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeline = useMemo(
        () =>
            items
                .filter((item) => {
                    const date = getText(item, 'date', 'activityDate');
                    return (
                        (!from || date >= from) &&
                        (!to || date <= to) &&
                        (poseFilter === 'all' ||
                            getText(item, 'pose') === poseFilter) &&
                        (categoryFilter === 'all' ||
                            getText(item, 'category') === categoryFilter)
                    );
                })
                .sort(
                    (a, b) =>
                        getText(a, 'date').localeCompare(getText(b, 'date')) ||
                        getText(a, 'uploadedAt').localeCompare(
                            getText(b, 'uploadedAt'),
                        ),
                ),
        [items, from, to, poseFilter, categoryFilter],
    );
    const current = timeline[position];
    const id = getText(current ?? {}, 'id');
    const isVideo = getText(current ?? {}, 'type').startsWith('video/');
    const bufferIds = timeline
        .slice(position, position + 8)
        .map((item) => getText(item, 'id'))
        .join(',');
    const url = urls.get(id);
    useEffect(() => {
        const preference = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        );
        const update = () => {
            setReducedMotion(preference.matches);
            if (preference.matches) setPlaying(false);
        };
        update();
        preference.addEventListener('change', update);
        return () => preference.removeEventListener('change', update);
    }, []);
    useEffect(() => {
        let active = true;
        if (!bufferIds) return;
        setBuffering(true);
        setError('');
        bufferMedia(bufferIds.split(','), attempt > 0)
            .then((result) => {
                if (active)
                    setUrls((previous) => new Map([...previous, ...result]));
            })
            .catch((cause) => {
                if (active) {
                    setError(
                        cause instanceof Error
                            ? cause.message
                            : 'Media could not be loaded.',
                    );
                    setPlaying(false);
                }
            })
            .finally(() => {
                if (active) setBuffering(false);
            });
        return () => {
            active = false;
        };
    }, [bufferIds, attempt]);
    const advance = useCallback(() => {
        if (position + 1 >= timeline.length) {
            setPlaying(false);
            return;
        }
        setPosition((value) => value + 1);
    }, [position, timeline.length]);
    useEffect(() => {
        if (!playing || !url || buffering || isVideo || reducedMotion) return;
        const timer = window.setTimeout(advance, 1500 / Number(speed));
        return () => window.clearTimeout(timer);
    }, [playing, url, buffering, isVideo, reducedMotion, advance, speed]);
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.playbackRate = Number(speed);
        if (playing) void video.play().catch(() => setPlaying(false));
        else video.pause();
    }, [url, playing, speed]);
    const changeRange = (value: string, end: boolean) => {
        if (end) setTo(value);
        else setFrom(value);
        setPosition(0);
        setPlaying(false);
        setAttempt(0);
    };
    return (
        <Panel
            title="Body timeline"
            description="Compare photos across dates. Filter by pose and choose a playback speed."
        >
            <div className="mb-4 grid grid-cols-1 items-end gap-3 min-[380px]:grid-cols-2 lg:grid-cols-5">
                <label className="grid min-w-0 gap-1 text-xs font-bold">
                    Media category
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPoseFilter('all');
                            setPosition(0);
                            setPlaying(false);
                        }}
                        className="min-h-10 min-w-0 w-full rounded-lg border border-stone-300 px-3 text-sm"
                    >
                        <option value="body">Body</option>
                        <option value="general">General images</option>
                        <option value="habit_evidence">
                            Activity evidence
                        </option>
                        <option value="all">All media</option>
                    </select>
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-bold">
                    Body pose
                    <select
                        value={poseFilter}
                        onChange={(e) => {
                            setPoseFilter(e.target.value);
                            setPosition(0);
                            setPlaying(false);
                        }}
                        className="min-h-10 min-w-0 w-full rounded-lg border border-stone-300 px-3 text-sm"
                    >
                        <option value="all">All poses</option>
                        {[
                            ...new Set(
                                items
                                    .map((item) => getText(item, 'pose'))
                                    .filter(Boolean),
                            ),
                        ].map((pose) => (
                            <option key={pose} value={pose}>
                                {pose.replaceAll('_', ' ')}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="grid min-w-0 gap-1 text-xs font-bold text-stone-700">
                    From
                    <input
                        type="date"
                        value={from}
                        max={to || localDateValue()}
                        onChange={(e) => changeRange(e.target.value, false)}
                        className="min-h-10 min-w-0 w-full rounded-lg border border-stone-300 px-3 text-sm font-normal"
                    />
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-bold text-stone-700">
                    To
                    <input
                        type="date"
                        value={to}
                        min={from}
                        max={localDateValue()}
                        onChange={(e) => changeRange(e.target.value, true)}
                        className="min-h-10 min-w-0 w-full rounded-lg border border-stone-300 px-3 text-sm font-normal"
                    />
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-bold text-stone-700">
                    Speed
                    <select
                        value={speed}
                        onChange={(e) => setSpeed(e.target.value)}
                        className="min-h-10 min-w-0 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    >
                        <option value="1">1× · 1.5s</option>
                        <option value="2">2× · 0.75s</option>
                        <option value="4">4× · 0.38s</option>
                    </select>
                </label>
            </div>
            <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 sm:h-[420px]">
                {url && current ? (
                    isVideo ? (
                        <video
                            key={id}
                            ref={videoRef}
                            src={url}
                            controls
                            playsInline
                            preload="metadata"
                            onEnded={advance}
                            onError={() => {
                                setError(
                                    'Playback failed. Refresh the buffer to request a new link.',
                                );
                                setPlaying(false);
                            }}
                            className="h-full w-full object-contain"
                            aria-label={getText(current, 'title')}
                        />
                    ) : (
                        <Image
                            key={id}
                            unoptimized
                            src={url}
                            alt={getText(current, 'title') || 'Body progress'}
                            width={1200}
                            height={900}
                            className="h-full w-full object-contain"
                        />
                    )
                ) : (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                        {buffering ? (
                            <>
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                                Preparing image buffer…
                            </>
                        ) : (
                            'No media in this date range'
                        )}
                    </div>
                )}
                {buffering && url && (
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs text-stone-600">
                        Buffering…
                    </span>
                )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-bold text-stone-800">
                        {current
                            ? dateLabel(getValue(current, 'date'), {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                              })
                            : 'Choose a date range'}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                        {timeline.length
                            ? `${position + 1} / ${timeline.length} items · ${Math.min(8, timeline.length - position)} in buffer`
                            : '0 items'}
                        {reducedMotion ? ' · Reduced motion enabled' : ''}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={position === 0}
                        onClick={() => {
                            setPosition((v) => v - 1);
                            setPlaying(false);
                        }}
                        className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold disabled:opacity-40"
                    >
                        Previous
                    </button>
                    <button
                        type="button"
                        disabled={!url || buffering || reducedMotion}
                        onClick={() => {
                            if (!playing && position === timeline.length - 1)
                                setPosition(0);
                            setPlaying((v) => !v);
                        }}
                        className="min-h-10 rounded-lg bg-stone-950 px-5 text-sm font-bold text-white disabled:opacity-40"
                    >
                        {playing
                            ? 'Pause'
                            : position === timeline.length - 1
                              ? 'Replay'
                              : 'Play'}
                    </button>
                    <button
                        type="button"
                        disabled={position + 1 >= timeline.length}
                        onClick={() => {
                            setPosition((v) => v + 1);
                            setPlaying(false);
                        }}
                        className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            </div>
            {error && (
                <div className="mt-3 flex items-center gap-3">
                    <Notice kind="error">{error}</Notice>
                    <button
                        type="button"
                        onClick={() => setAttempt((v) => v + 1)}
                        className="text-sm font-bold underline"
                    >
                        Retry buffer
                    </button>
                </div>
            )}
        </Panel>
    );
}

function BodySection() {
    const [uploadOpen, setUploadOpen] = useState(false);
    const { data, state, error, reload } = usePrivateData(
        endpointBySection.body,
    );
    const items = useMemo(
        () => getArray(data, 'items', 'media', 'entries'),
        [data],
    );
    const [playing, setPlaying] = useState<
        Record<string, { busy: boolean; url?: string; error?: string }>
    >({});
    const [file, setFile] = useState<File | null>(null);
    const [activityDate, setActivityDate] = useState(localDateValue);
    const [category, setCategory] = useState('body');
    const [pose, setPose] = useState('');
    const [privateNotes, setPrivateNotes] = useState('');
    const [uploadBusy, setUploadBusy] = useState(false);
    const idempotency = useIdempotencyKeys();
    const [uploadIntentFingerprint, setUploadIntentFingerprint] = useState('');
    const [finalizeAssetId, setFinalizeAssetId] = useState('');
    const [uploadNotice, setUploadNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const [freshKeyNeeded, setFreshKeyNeeded] = useState(false);

    const playbackError = (id: string) => {
        setPlaying((current) => ({
            ...current,
            [id]: {
                busy: false,
                error: 'This item could not be played. Its short-lived link may have expired, or this format may not be supported. Refresh to request a new link.',
            },
        }));
    };

    const loadMedia = async (item: JsonRecord, refresh = false) => {
        const id = getText(item, 'id', 'mediaId', 'key');
        if (!id || playing[id]?.busy || (playing[id]?.url && !refresh)) return;
        setPlaying((current) => ({ ...current, [id]: { busy: true } }));
        try {
            const result = await bufferMedia([id], refresh);
            const url = result.get(id);
            if (!url)
                throw new Error('No media URL was returned for this item.');
            setPlaying((current) => ({
                ...current,
                [id]: { busy: false, url },
            }));
        } catch {
            setPlaying((current) => ({
                ...current,
                [id]: {
                    busy: false,
                    error: 'This item could not be loaded. Its short-lived link may have expired or the format may not be supported. Refresh to request a new link.',
                },
            }));
        }
    };

    const finalizeUpload = async (
        assetId: string,
        busyAlready = false,
        intentFingerprint = uploadIntentFingerprint,
    ) => {
        if (!assetId || (uploadBusy && !busyAlready)) return;
        if (!busyAlready) setUploadBusy(true);
        setUploadNotice(null);
        try {
            await requestPrivateJson(endpointBySection.body, {
                method: 'PATCH',
                body: JSON.stringify({ action: 'finalize', assetId }),
            });
            setFinalizeAssetId('');
            if (intentFingerprint) idempotency.complete(intentFingerprint);
            setUploadIntentFingerprint('');
            setFile(null);
            setPose('');
            setPrivateNotes('');
            setUploadNotice({
                kind: 'success',
                text: 'Private media upload verified and added.',
            });
            setUploadOpen(false);
            reload();
        } catch (cause) {
            setUploadNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The private upload could not be finalized.',
            });
            setFinalizeAssetId(assetId);
        } finally {
            if (!busyAlready) setUploadBusy(false);
        }
    };

    const uploadFile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!file || uploadBusy) return;
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'video/mp4',
            'video/webm',
        ];
        if (!allowedTypes.includes(file.type)) {
            setUploadNotice({
                kind: 'error',
                text: 'Choose a JPEG, PNG, WebP, MP4, or WebM file.',
            });
            return;
        }
        const maxBytes = file.type.startsWith('image/')
            ? 15 * 1024 * 1024
            : 100 * 1024 * 1024;
        if (file.size <= 0 || file.size > maxBytes) {
            setUploadNotice({
                kind: 'error',
                text: 'This file is outside the supported size limit.',
            });
            return;
        }
        const payload = {
            action: 'initiate',
            localDate: activityDate,
            category,
            pose: category === 'body' ? pose || null : null,
            privateNotes: privateNotes.trim() || undefined,
            displayName: file.name,
            contentType: file.type,
            byteSize: file.size,
        };
        const fingerprint = JSON.stringify({
            ...payload,
            fileLastModified: file.lastModified,
        });
        setUploadIntentFingerprint(fingerprint);
        setUploadBusy(true);
        setUploadNotice(null);
        setFinalizeAssetId('');
        setFreshKeyNeeded(false);
        let assetId = '';
        try {
            const initiation = await requestPrivateJson(
                endpointBySection.body,
                {
                    method: 'POST',
                    headers: {
                        'Idempotency-Key': idempotency.keyFor(fingerprint),
                    },
                    body: JSON.stringify(payload),
                },
            );
            const upload =
                isRecord(initiation) && isRecord(initiation.data)
                    ? initiation.data
                    : isRecord(initiation)
                      ? initiation
                      : {};
            assetId = getText(upload, 'assetId');
            const uploadUrl = getText(upload, 'uploadUrl');
            const uploadStatus = getText(upload, 'status');
            if (assetId && uploadStatus === 'ready' && !uploadUrl) {
                idempotency.complete(fingerprint);
                setUploadIntentFingerprint('');
                setFile(null);
                setPose('');
                setPrivateNotes('');
                setUploadNotice({
                    kind: 'success',
                    text: 'This upload is already verified and added.',
                });
                reload();
                return;
            }
            const method = getText(upload, 'method') || 'PUT';
            const headersValue = getValue(upload, 'requiredHeaders');
            if (
                !assetId ||
                !uploadUrl ||
                method !== 'PUT' ||
                !isRecord(headersValue)
            )
                throw new Error(
                    'The upload service did not return a valid private upload request.',
                );
            const signedUrl = new URL(uploadUrl);
            if (
                signedUrl.protocol !== 'https:' ||
                signedUrl.username ||
                signedUrl.password
            )
                throw new Error(
                    'The upload service returned an invalid private upload request.',
                );
            const requiredHeaders: Record<string, string> = {};
            for (const [name, value] of Object.entries(headersValue)) {
                if (typeof value !== 'string')
                    throw new Error(
                        'The upload service returned invalid required headers.',
                    );
                requiredHeaders[name] = value;
            }
            const putResponse = await fetch(signedUrl.toString(), {
                method: 'PUT',
                headers: requiredHeaders,
                body: file,
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'error',
            });
            if (!putResponse.ok)
                throw new Error(
                    'The private media upload did not complete. Try starting a new upload.',
                );
            setFinalizeAssetId(assetId);
            await finalizeUpload(assetId, true, fingerprint);
        } catch (cause) {
            if (assetId) setFinalizeAssetId('');
            const errorText =
                cause instanceof Error
                    ? cause.message
                    : 'The private media upload could not be completed.';
            if (/MEDIA_UPLOAD_NOT_RETRYABLE|fresh key/i.test(errorText)) {
                idempotency.complete(fingerprint);
                setUploadIntentFingerprint('');
                setFreshKeyNeeded(true);
                setUploadNotice({
                    kind: 'error',
                    text: 'This upload intent can’t be retried with its previous key. Choose Start again to retry with a fresh key.',
                });
            } else {
                // Keep the idempotency key for transient/network failures so a retry can resume the same pending asset.
                setUploadNotice({ kind: 'error', text: errorText });
            }
        } finally {
            setUploadBusy(false);
        }
    };

    return (
        <>
            {state === 'ready' && <BodyPlaybackLane items={items} />}
            <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="min-h-10 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white"
            >
                + Upload private media
            </button>
            {uploadNotice && !uploadOpen && (
                <Notice kind={uploadNotice.kind}>{uploadNotice.text}</Notice>
            )}
            {uploadOpen && (
                <TrackerDialog
                    title="Upload private media"
                    onClose={() => setUploadOpen(false)}
                >
                    <div className="p-2">
                        {' '}
                        <Panel
                            title="Add private media"
                            description="Upload a supported image or video to private storage. The file is not published or shared by this action."
                        >
                            <form
                                onSubmit={uploadFile}
                                className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
                            >
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    File
                                    <input
                                        required
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                                        onChange={(event) =>
                                            setFile(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-bold"
                                    />
                                    <span className="text-xs font-normal text-stone-500">
                                        JPEG, PNG, WebP, MP4, WebM · up to 15 MB
                                        for images, 100 MB for videos
                                    </span>
                                </label>
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Activity date (IST)
                                    <input
                                        required
                                        type="date"
                                        value={activityDate}
                                        onChange={(event) =>
                                            setActivityDate(event.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    />
                                </label>
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Category
                                    <select
                                        value={category}
                                        onChange={(event) => {
                                            setCategory(event.target.value);
                                            if (event.target.value !== 'body')
                                                setPose('');
                                        }}
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    >
                                        <option value="body">Body</option>
                                        <option value="habit_evidence">
                                            Habit evidence
                                        </option>
                                        <option value="general">General</option>
                                    </select>
                                </label>
                                {category === 'body' && (
                                    <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                        Pose (optional)
                                        <select
                                            value={pose}
                                            onChange={(event) =>
                                                setPose(event.target.value)
                                            }
                                            className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                        >
                                            <option value="">
                                                Not specified
                                            </option>
                                            <option value="front">Front</option>
                                            <option value="back">Back</option>
                                            <option value="left_side">
                                                Left side
                                            </option>
                                            <option value="right_side">
                                                Right side
                                            </option>
                                            <option value="other">Other</option>
                                        </select>
                                    </label>
                                )}
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800 sm:col-span-2 lg:col-span-2">
                                    Private notes (optional)
                                    <textarea
                                        value={privateNotes}
                                        onChange={(event) =>
                                            setPrivateNotes(event.target.value)
                                        }
                                        maxLength={2000}
                                        rows={2}
                                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                        placeholder="Notes stay private"
                                    />
                                </label>
                                <div className="flex items-end sm:col-span-2 lg:col-span-3">
                                    <button
                                        type="submit"
                                        disabled={
                                            !file ||
                                            uploadBusy ||
                                            !activityDate ||
                                            Boolean(finalizeAssetId)
                                        }
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"
                                    >
                                        <Plus size={16} aria-hidden="true" />
                                        {uploadBusy
                                            ? 'Uploading…'
                                            : freshKeyNeeded
                                              ? 'Start again'
                                              : 'Upload privately'}
                                    </button>
                                </div>
                            </form>
                            {uploadNotice && (
                                <div className="mt-4">
                                    <Notice kind={uploadNotice.kind}>
                                        {uploadNotice.text}
                                    </Notice>
                                </div>
                            )}
                            {finalizeAssetId && !uploadBusy && (
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <p className="text-sm text-stone-700">
                                        The file is uploaded; final verification
                                        is still pending.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void finalizeUpload(
                                                finalizeAssetId,
                                                false,
                                                uploadIntentFingerprint,
                                            )
                                        }
                                        className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-100"
                                    >
                                        Retry verification
                                    </button>
                                </div>
                            )}
                        </Panel>
                    </div>
                </TrackerDialog>
            )}
            <Panel
                title="Body gallery"
                description="Image previews load as you scroll. Videos load when you choose Play."
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && items.length === 0 && (
                    <EmptyState title="No media available">
                        Items will appear here when private media metadata is
                        returned.
                    </EmptyState>
                )}
                {state === 'ready' && items.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                        {items.map((item, index) => {
                            const id = getText(item, 'id', 'mediaId', 'key');
                            const playback = id ? playing[id] : undefined;
                            const kind = getText(
                                item,
                                'type',
                                'mediaType',
                                'kind',
                            ).toLowerCase();
                            const isVideo = kind.includes('video');
                            const title =
                                getText(item, 'title', 'label', 'caption') ||
                                'Media item';
                            return (
                                <article
                                    key={id || `${title}-${index}`}
                                    className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
                                >
                                    <div className="grid h-32 place-items-center sm:h-36 bg-stone-100 p-2">
                                        {!isVideo ? (
                                            <PrivateImage
                                                id={id}
                                                alt={title}
                                                className="h-full w-full rounded-lg object-contain"
                                            />
                                        ) : playback?.url ? (
                                            <video
                                                controls
                                                playsInline
                                                preload="metadata"
                                                src={playback.url}
                                                className="h-full w-full object-contain"
                                                aria-label={title}
                                                onError={() =>
                                                    playbackError(id)
                                                }
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void loadMedia(item)
                                                }
                                                className="grid place-items-center gap-2 text-sm font-bold text-stone-600"
                                            >
                                                <Play size={24} />
                                                {playback?.busy
                                                    ? 'Loading…'
                                                    : 'Play video'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-stone-900">
                                                    {title}
                                                </h3>
                                                <p className="mt-1 text-xs text-stone-600">
                                                    {dateLabel(
                                                        getValue(
                                                            item,
                                                            'date',
                                                            'createdAt',
                                                        ),
                                                        {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                    {kind ? ` · ${kind}` : ''}
                                                    {getText(item, 'pose')
                                                        ? ` · ${getText(item, 'pose').replaceAll('_', ' ')}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                        {!id && (
                                            <p className="mt-2 text-xs text-amber-800">
                                                This item has no media
                                                identifier.
                                            </p>
                                        )}
                                        {playback?.error && (
                                            <p
                                                className="mt-2 text-xs text-rose-800"
                                                role="alert"
                                            >
                                                {playback.error}
                                            </p>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </Panel>
        </>
    );
}

type SummaryDraft = { title: string; body: string };
type SummaryMediaDraftState = {
    state: 'loading' | 'ready' | 'error';
    media: JsonRecord[];
    error?: string;
};
type PreparedSummaryDerivative = {
    sourceMediaAssetId: string;
    approvedMediaAssetId: string;
    previewUrl: string;
};
type ApprovedSummarySnapshot = {
    revisionNumber: number;
    title: string;
    body: string;
    mediaIds: string[];
};
function SummariesSection() {
    const [draftDate, setDraftDate] = useState(localDateValue);
    const { data, state, error, reload } = usePrivateData(
        `${endpointBySection.summaries}?date=${draftDate}`,
    );
    const [selectedDraftId, setSelectedDraftId] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [approvalInvalidated, setApprovalInvalidated] = useState<
        Record<string, boolean>
    >({});

    const [draftEdits, setDraftEdits] = useState<Record<string, SummaryDraft>>(
        {},
    );
    const [exactApproval, setExactApproval] = useState<Record<string, boolean>>(
        {},
    );
    const [approvalIds, setApprovalIds] = useState<Record<string, string>>({});
    const [approvedSnapshots, setApprovedSnapshots] = useState<
        Record<string, ApprovedSummarySnapshot>
    >({});
    const [mediaState, setMediaState] = useState<
        Record<string, SummaryMediaDraftState>
    >({});
    const [preparedMedia, setPreparedMedia] = useState<
        Record<string, PreparedSummaryDerivative[]>
    >({});
    const [selectedDerivativeIds, setSelectedDerivativeIds] = useState<
        Record<string, string[]>
    >({});
    const [busyId, setBusyId] = useState('');
    const idempotency = useIdempotencyKeys();
    const [notice, setNotice] = useState<{
        kind: 'success' | 'error';
        text: string;
    } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const drafts = getArray(dataRoot, 'drafts').filter(
        (draft) =>
            !['published', 'sent', 'delivered'].includes(
                getText(draft, 'state', 'status').toLowerCase(),
            ),
    );
    const approvals = getArray(dataRoot, 'approvals');
    const publications = getArray(dataRoot, 'publications');
    const history = getArray(dataRoot, 'history');

    const operation = async (
        id: string,
        action: 'create' | 'edit' | 'approve' | 'publish',
        body: JsonRecord,
        method: 'POST' | 'PATCH' = 'POST',
    ) => {
        const requestBody = { action, ...body };
        const fingerprint = JSON.stringify(requestBody);
        setBusyId(id || action);
        setNotice(null);
        try {
            const result = await requestPrivateJson(
                endpointBySection.summaries,
                {
                    method,
                    headers: {
                        'Idempotency-Key': idempotency.keyFor(fingerprint),
                    },
                    body: JSON.stringify(requestBody),
                },
            );
            idempotency.complete(fingerprint);
            setNotice({
                kind: 'success',
                text:
                    action === 'publish'
                        ? 'Approved snapshot published.'
                        : action === 'approve'
                          ? 'Exact text and selected derivatives approved.'
                          : action === 'create'
                            ? 'Draft created.'
                            : 'New draft revision saved.',
            });
            reload();
            return result;
        } catch (cause) {
            setNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The summary action could not be completed.',
            });
            return null;
        } finally {
            setBusyId('');
        }
    };

    const createDraft = async () => {
        const result = await operation('create', 'create', {
            activityDate: draftDate,
        });
        if (isRecord(result)) {
            const record = isRecord(result.data) ? result.data : result;
            setCreateOpen(false);
            const draft = isRecord(record.draft) ? record.draft : record;
            setSelectedDraftId(getText(draft, 'draftId', 'id'));
        }
    };

    const invalidateApproval = (id: string) => {
        setApprovalInvalidated((current) => ({ ...current, [id]: true }));
        setExactApproval((current) => ({ ...current, [id]: false }));
        setApprovalIds((current) => {
            const next = { ...current };
            delete next[id];
            return next;
        });
        setApprovedSnapshots((current) => {
            const next = { ...current };
            delete next[id];
            return next;
        });
    };

    const loadSummaryMedia = async (draftId: string, activityDate: string) => {
        invalidateApproval(draftId);
        setSelectedDerivativeIds((current) => {
            const next = { ...current };
            delete next[draftId];
            return next;
        });
        setMediaState((current) => ({
            ...current,
            [draftId]: {
                state: 'loading',
                media: current[draftId]?.media ?? [],
            },
        }));
        try {
            const result = await requestPrivateJson(
                `/api/samik-admin/summaries/media?activityDate=${encodeURIComponent(activityDate)}`,
            );
            const media = getArray(result, 'media');
            const linkedDerivatives = media.flatMap((item) => {
                const sourceMediaAssetId = getText(item, 'sourceMediaAssetId');
                return getArray(item, 'preparedDerivatives')
                    .map((derivative) => ({
                        sourceMediaAssetId,
                        approvedMediaAssetId: getText(
                            derivative,
                            'approvedMediaAssetId',
                        ),
                        previewUrl: getText(derivative, 'previewUrl'),
                    }))
                    .filter(
                        (derivative) =>
                            derivative.sourceMediaAssetId &&
                            derivative.approvedMediaAssetId &&
                            derivative.previewUrl,
                    );
            });
            setMediaState((current) => ({
                ...current,
                [draftId]: { state: 'ready', media },
            }));
            setPreparedMedia((current) => ({
                ...current,
                [draftId]: linkedDerivatives,
            }));
        } catch (cause) {
            setMediaState((current) => ({
                ...current,
                [draftId]: {
                    state: 'error',
                    media: [],
                    error:
                        cause instanceof Error
                            ? cause.message
                            : 'Images could not be loaded.',
                },
            }));
        }
    };

    const prepareSummaryDerivative = async (
        draftId: string,
        activityDate: string,
        sourceMediaAssetId: string,
    ) => {
        const fingerprint = JSON.stringify({
            action: 'prepare-summary-derivative',
            activityDate,
            sourceMediaAssetId,
        });
        setBusyId(`media:${sourceMediaAssetId}`);
        setNotice(null);
        try {
            const result = await requestPrivateJson(
                '/api/samik-admin/summaries/media',
                {
                    method: 'POST',
                    headers: {
                        'Idempotency-Key': idempotency.keyFor(fingerprint),
                    },
                    body: JSON.stringify({ activityDate, sourceMediaAssetId }),
                },
            );
            idempotency.complete(fingerprint);
            const record =
                isRecord(result) && isRecord(result.data)
                    ? result.data
                    : result;
            if (!isRecord(record))
                throw new Error('The sanitized preview was not returned.');
            const approvedMediaAssetId = getText(
                record,
                'approvedMediaAssetId',
            );
            const previewUrl = getText(record, 'previewUrl');
            if (!approvedMediaAssetId || !previewUrl)
                throw new Error('The sanitized preview was not returned.');
            setPreparedMedia((current) => ({
                ...current,
                [draftId]: [
                    ...(current[draftId] ?? []).filter(
                        (item) =>
                            item.sourceMediaAssetId !== sourceMediaAssetId,
                    ),
                    { sourceMediaAssetId, approvedMediaAssetId, previewUrl },
                ],
            }));
            setNotice({
                kind: 'success',
                text: 'Private sanitized preview is ready. Select it if you want it in the public post.',
            });
        } catch (cause) {
            setNotice({
                kind: 'error',
                text:
                    cause instanceof Error
                        ? cause.message
                        : 'The private derivative could not be prepared.',
            });
        } finally {
            setBusyId('');
        }
    };

    const saveEdit = async (
        draft: JsonRecord,
        id: string,
        title: string,
        body: string,
    ) => {
        const draftId = getText(draft, 'draftId', 'id');
        const revisionNumber = getNumber(draft, 'revisionNumber');
        if (!draftId || revisionNumber === null || !title.trim()) return;
        const result = await operation(
            id,
            'edit',
            { draftId, revisionNumber, title, body },
            'PATCH',
        );
        if (result) {
            invalidateApproval(id);
            setDraftEdits((current) => {
                const next = { ...current };
                delete next[id];
                return next;
            });
        }
    };

    const approveRevision = async (
        draft: JsonRecord,
        id: string,
        revisionNumber: number,
        title: string,
        body: string,
    ) => {
        const draftId = getText(draft, 'draftId', 'id');
        if (!draftId || !exactApproval[id]) return;
        const mediaIds = [...new Set(selectedDerivativeIds[id] ?? [])].sort();
        const selected = new Set(mediaIds);
        const publicMedia = (preparedMedia[id] ?? [])
            .filter((item) => selected.has(item.approvedMediaAssetId))
            .map(({ sourceMediaAssetId, approvedMediaAssetId }) => ({
                sourceMediaAssetId,
                approvedMediaAssetId,
            }));
        const result = await operation(id, 'approve', {
            draftId,
            revisionNumber,
            publicMedia,
        });
        if (!isRecord(result)) return;
        const record = isRecord(result.data) ? result.data : result;
        const approvalId = getText(record, 'approvalId');
        if (approvalId) {
            setApprovalInvalidated((current) => ({ ...current, [id]: false }));
            setApprovalIds((current) => ({ ...current, [id]: approvalId }));
            setApprovedSnapshots((current) => ({
                ...current,
                [id]: { revisionNumber, title, body, mediaIds },
            }));
        }
    };

    const publishApproval = async (
        id: string,
        approvalId: string,
        approvalMatches: boolean,
    ) => {
        if (!approvalId || !approvalMatches) return;
        const result = await operation(id, 'publish', { approvalId });
        if (result) invalidateApproval(id);
    };

    const selectedDraft = drafts.find(
        (draft) => getText(draft, 'draftId', 'id') === selectedDraftId,
    );
    const selectedId = selectedDraft
        ? getText(selectedDraft, 'draftId', 'id')
        : '';
    return (
        <>
            {createOpen && (
                <TrackerDialog
                    title="Create summary draft"
                    onClose={() => setCreateOpen(false)}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void createDraft();
                        }}
                        className="space-y-4"
                    >
                        <label className="grid gap-2 text-sm font-bold">
                            Date (IST)
                            <input
                                type="date"
                                required
                                value={draftDate}
                                max={localDateValue()}
                                onChange={(e) => setDraftDate(e.target.value)}
                                className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={Boolean(busyId) || !draftDate}
                            className="min-h-10 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-45"
                        >
                            {busyId ? 'Creating…' : 'Create draft'}
                        </button>
                        {notice && (
                            <Notice kind={notice.kind}>{notice.text}</Notice>
                        )}
                    </form>
                </TrackerDialog>
            )}
            <Panel
                title="Summary workspace"
                description="Write, review, then publish. Private source data stays out of automatic drafts."
                action={
                    <div className="flex min-w-0 flex-wrap items-end justify-between gap-3 lg:flex-nowrap">
                        <div className="flex min-w-0 flex-wrap items-end gap-2 sm:flex-nowrap">
                            <label className="grid min-w-0 gap-1 text-xs font-bold text-stone-700">
                                Date (IST)
                                <input
                                    type="date"
                                    max={localDateValue()}
                                    value={draftDate}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setDraftDate(e.target.value);
                                            setSelectedDraftId('');
                                        }
                                    }}
                                    className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal"
                                />
                            </label>
                            <button
                                type="button"
                                disabled={Boolean(busyId) || !draftDate}
                                onClick={() => {
                                    setNotice(null);
                                    setCreateOpen(true);
                                }}
                                className="min-h-10 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-40"
                            >
                                {busyId === 'create'
                                    ? 'Creating…'
                                    : '+ New draft'}
                            </button>
                        </div>
                        <p className="text-xs whitespace-nowrap text-stone-500">
                            {drafts.length} drafts ·{' '}
                            {
                                approvals.filter(
                                    (item) =>
                                        getValue(item, 'isCurrent') === true,
                                ).length
                            }{' '}
                            approved ·{' '}
                            {
                                publications.filter(
                                    (item) =>
                                        getText(item, 'status') === 'published',
                                ).length
                            }{' '}
                            published
                        </p>
                    </div>
                }
            >
                {notice && (
                    <div className="mt-3">
                        <Notice kind={notice.kind}>{notice.text}</Notice>
                    </div>
                )}
            </Panel>
            <Panel
                title="Review & publish"
                description="Select a draft to edit. Publishing always uses the approved version."
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {state === 'ready' && drafts.length === 0 && (
                    <EmptyState title="No drafts to review">
                        Drafts returned by the private summaries API will appear
                        here.
                    </EmptyState>
                )}
                {state === 'ready' && drafts.length > 0 && (
                    <div className="space-y-4">
                        <aside
                            aria-label="Summary drafts"
                            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {drafts.map((draft) => {
                                const draftId = getText(draft, 'draftId', 'id');
                                const approved = approvals.some(
                                    (item) =>
                                        getText(item, 'draftId') === draftId &&
                                        getValue(item, 'isCurrent') === true,
                                );
                                return (
                                    <button
                                        type="button"
                                        key={draftId}
                                        onClick={() =>
                                            setSelectedDraftId(draftId)
                                        }
                                        aria-pressed={draftId === selectedId}
                                        className={`min-w-[180px] rounded-xl border p-3 text-left lg:min-w-0 ${draftId === selectedId ? 'border-stone-800 bg-stone-100' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
                                    >
                                        <span className="block text-sm font-bold">
                                            {dateLabel(
                                                getValue(draft, 'activityDate'),
                                                {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                },
                                            )}
                                        </span>
                                        <span
                                            className={`mt-2 inline-block rounded-md px-2 py-1 text-[10px] font-bold ${approved ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
                                        >
                                            {approved ? 'Approved' : 'Draft'} ·
                                            v
                                            {getNumber(draft, 'revisionNumber')}
                                        </span>
                                    </button>
                                );
                            })}
                        </aside>
                        {selectedDraft && (
                            <TrackerDialog
                                title="Edit / review summary"
                                onClose={() => setSelectedDraftId('')}
                            >
                                {notice && (
                                    <div className="mb-4">
                                        <Notice kind={notice.kind}>
                                            {notice.text}
                                        </Notice>
                                    </div>
                                )}
                                {drafts
                                    .filter(
                                        (draft) =>
                                            getText(draft, 'draftId', 'id') ===
                                            selectedId,
                                    )
                                    .map((draft, index) => {
                                        const id =
                                            getText(draft, 'draftId', 'id') ||
                                            `draft-${index}`;
                                        const activityDate = getText(
                                            draft,
                                            'activityDate',
                                        );
                                        const original = {
                                            title: getText(draft, 'title'),
                                            body: getText(draft, 'body'),
                                        };
                                        const edit = draftEdits[id] ?? original;
                                        const revisionNumber = getNumber(
                                            draft,
                                            'revisionNumber',
                                        );
                                        const dirty =
                                            edit.title !== original.title ||
                                            edit.body !== original.body;
                                        const serverApprovalId = getText(
                                            draft,
                                            'approvalId',
                                        );
                                        const serverApproval = approvals.find(
                                            (item) =>
                                                getText(item, 'approvalId') ===
                                                    serverApprovalId &&
                                                getValue(item, 'isCurrent') ===
                                                    true,
                                        );
                                        const approvalId =
                                            approvalIds[id] ??
                                            (!approvalInvalidated[id]
                                                ? getText(
                                                      serverApproval ?? {},
                                                      'approvalId',
                                                  )
                                                : '');
                                        const draftMedia = mediaState[id];
                                        const derivatives =
                                            preparedMedia[id] ?? [];
                                        const serverMediaIds = getArray(
                                            serverApproval,
                                            'publicMedia',
                                        )
                                            .map((item) =>
                                                getText(
                                                    item,
                                                    'approvedMediaAssetId',
                                                ),
                                            )
                                            .sort();
                                        const selected = new Set(
                                            selectedDerivativeIds[id] ??
                                                (!approvalInvalidated[id]
                                                    ? serverMediaIds
                                                    : []),
                                        );
                                        const currentMediaIds = [
                                            ...selected,
                                        ].sort();
                                        const approvedSnapshot =
                                            approvedSnapshots[id] ??
                                            (!approvalInvalidated[id] &&
                                            serverApproval
                                                ? {
                                                      revisionNumber: getNumber(
                                                          serverApproval,
                                                          'revisionNumber',
                                                      ),
                                                      title: getText(
                                                          serverApproval,
                                                          'titleSnapshot',
                                                      ),
                                                      body: getText(
                                                          serverApproval,
                                                          'bodySnapshot',
                                                      ),
                                                      mediaIds: serverMediaIds,
                                                  }
                                                : undefined);
                                        const approvalMatches = Boolean(
                                            approvalId &&
                                            approvedSnapshot &&
                                            revisionNumber !== null &&
                                            !dirty &&
                                            approvedSnapshot.revisionNumber ===
                                                revisionNumber &&
                                            approvedSnapshot.title ===
                                                edit.title &&
                                            approvedSnapshot.body ===
                                                edit.body &&
                                            JSON.stringify(
                                                approvedSnapshot.mediaIds,
                                            ) ===
                                                JSON.stringify(currentMediaIds),
                                        );
                                        const needsReapproval =
                                            Boolean(
                                                serverApprovalId || approvalId,
                                            ) && !approvalMatches;
                                        const approvalLabel = approvalMatches
                                            ? 'Approved for this revision'
                                            : needsReapproval
                                              ? 'Stale approval · re-approval needed'
                                              : 'Needs approval';
                                        return (
                                            <article
                                                key={id}
                                                className="min-w-0 rounded-xl border border-stone-200 p-4"
                                            >
                                                <ol className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-4 text-xs font-bold text-stone-500">
                                                    {[
                                                        'Edit',
                                                        'Review',
                                                        'Publish',
                                                    ].map((step, i) => (
                                                        <li
                                                            key={step}
                                                            className={`flex items-center gap-2 ${i === (dirty ? 0 : approvalMatches ? 2 : 1) ? 'text-stone-950' : ''}`}
                                                        >
                                                            <span
                                                                className={`grid h-6 w-6 place-items-center rounded-full border ${i === (dirty ? 0 : approvalMatches ? 2 : 1) ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300'}`}
                                                            >
                                                                {i + 1}
                                                            </span>
                                                            {step}
                                                        </li>
                                                    ))}
                                                </ol>
                                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-extrabold text-stone-950">
                                                            {edit.title ||
                                                                'Untitled draft'}
                                                        </h3>
                                                        <p className="mt-1 text-xs text-stone-500">
                                                            {dateLabel(
                                                                activityDate,
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                },
                                                            )}{' '}
                                                            IST ·{' '}
                                                            {revisionNumber ===
                                                            null
                                                                ? 'revision not returned'
                                                                : `revision ${revisionNumber}`}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">
                                                        Draft
                                                    </span>
                                                    <span
                                                        className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${approvalMatches ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : needsReapproval ? 'border-rose-300 bg-rose-100 text-rose-900' : 'border-stone-300 bg-stone-100 text-stone-700'}`}
                                                    >
                                                        {approvalLabel}
                                                    </span>
                                                </div>
                                                {needsReapproval && (
                                                    <p
                                                        className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                                                        role="status"
                                                    >
                                                        A previous approval no
                                                        longer matches the
                                                        current title, body,
                                                        revision, or media
                                                        selection. Approve the
                                                        current snapshot again
                                                        before publishing.
                                                    </p>
                                                )}
                                                <div className="grid gap-3">
                                                    <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                                        Title
                                                        <input
                                                            value={edit.title}
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setDraftEdits(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [id]: {
                                                                            ...edit,
                                                                            title: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    }),
                                                                );
                                                                invalidateApproval(
                                                                    id,
                                                                );
                                                            }}
                                                            maxLength={160}
                                                            className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                                        />
                                                    </label>
                                                    <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                                        Body
                                                        <textarea
                                                            value={edit.body}
                                                            onChange={(
                                                                event,
                                                            ) => {
                                                                setDraftEdits(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [id]: {
                                                                            ...edit,
                                                                            body: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                    }),
                                                                );
                                                                invalidateApproval(
                                                                    id,
                                                                );
                                                            }}
                                                            rows={6}
                                                            maxLength={2750}
                                                            className="rounded-lg border border-stone-300 px-3 py-2 font-normal leading-6 focus:outline-none focus:ring-2 focus:ring-stone-300"
                                                        />
                                                        <span className="text-xs font-normal text-stone-500">
                                                            The exact final line
                                                            is kept as “posted
                                                            by Ullu 🦉” when you
                                                            save.
                                                        </span>
                                                    </label>
                                                </div>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            !dirty ||
                                                            !getText(
                                                                draft,
                                                                'draftId',
                                                                'id',
                                                            ) ||
                                                            revisionNumber ===
                                                                null ||
                                                            Boolean(busyId) ||
                                                            !edit.title.trim()
                                                        }
                                                        onClick={() =>
                                                            void saveEdit(
                                                                draft,
                                                                id,
                                                                edit.title,
                                                                edit.body,
                                                            )
                                                        }
                                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-100 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700"
                                                    >
                                                        {busyId === id
                                                            ? 'Saving…'
                                                            : 'Save new revision'}
                                                    </button>
                                                    {dirty && (
                                                        <span className="text-xs text-amber-800">
                                                            Unsaved edits must
                                                            be saved before
                                                            approval.
                                                        </span>
                                                    )}
                                                </div>
                                                <details
                                                    className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3"
                                                    aria-label="Public image derivatives"
                                                >
                                                    <summary className="cursor-pointer text-sm font-bold text-stone-800">
                                                        Public images (optional)
                                                        ·{' '}
                                                        {currentMediaIds.length}{' '}
                                                        selected
                                                    </summary>
                                                    <div className="mt-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <h4 className="font-bold text-stone-900">
                                                                    Optional
                                                                    public
                                                                    images
                                                                </h4>
                                                                <p className="text-xs text-stone-600">
                                                                    Only
                                                                    same-day
                                                                    photos are
                                                                    shown;
                                                                    weight-linked
                                                                    images are
                                                                    excluded.
                                                                    Body photos
                                                                    stay private
                                                                    by default.
                                                                    Prepare and
                                                                    preview a
                                                                    sanitized
                                                                    WebP, then
                                                                    explicitly
                                                                    select each
                                                                    derivative
                                                                    to publish.
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    Boolean(
                                                                        busyId,
                                                                    ) ||
                                                                    approvalMatches
                                                                }
                                                                onClick={() =>
                                                                    void loadSummaryMedia(
                                                                        id,
                                                                        activityDate,
                                                                    )
                                                                }
                                                                className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 disabled:opacity-50"
                                                            >
                                                                {draftMedia?.state ===
                                                                'loading'
                                                                    ? 'Loading…'
                                                                    : draftMedia?.state ===
                                                                        'ready'
                                                                      ? 'Refresh images'
                                                                      : 'Load eligible images'}
                                                            </button>
                                                        </div>
                                                        {draftMedia?.error && (
                                                            <p
                                                                className="mt-2 text-sm text-rose-800"
                                                                role="alert"
                                                            >
                                                                {
                                                                    draftMedia.error
                                                                }
                                                            </p>
                                                        )}
                                                        {draftMedia?.state ===
                                                            'ready' &&
                                                            draftMedia.media
                                                                .length ===
                                                                0 && (
                                                                <p className="mt-3 text-sm text-stone-600">
                                                                    No eligible
                                                                    same-day
                                                                    images are
                                                                    available.
                                                                    You can
                                                                    approve text
                                                                    with no
                                                                    images
                                                                    selected.
                                                                </p>
                                                            )}
                                                        {draftMedia?.media.map(
                                                            (item) => {
                                                                const sourceId =
                                                                    getText(
                                                                        item,
                                                                        'sourceMediaAssetId',
                                                                    );
                                                                const prepared =
                                                                    derivatives.find(
                                                                        (
                                                                            derivative,
                                                                        ) =>
                                                                            derivative.sourceMediaAssetId ===
                                                                            sourceId,
                                                                    );
                                                                const checked =
                                                                    Boolean(
                                                                        prepared &&
                                                                        selected.has(
                                                                            prepared.approvedMediaAssetId,
                                                                        ),
                                                                    );
                                                                return (
                                                                    <div
                                                                        key={
                                                                            sourceId
                                                                        }
                                                                        className="mt-3 grid gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
                                                                    >
                                                                        <div>
                                                                            <Image
                                                                                unoptimized
                                                                                src={getText(
                                                                                    item,
                                                                                    'previewUrl',
                                                                                )}
                                                                                alt="Private original image preview"
                                                                                width={
                                                                                    240
                                                                                }
                                                                                height={
                                                                                    180
                                                                                }
                                                                                className="max-h-36 w-full rounded-lg object-contain"
                                                                            />
                                                                            <p className="mt-1 text-xs text-stone-500">
                                                                                Private
                                                                                original
                                                                                ·{' '}
                                                                                {getText(
                                                                                    item,
                                                                                    'category',
                                                                                ) ===
                                                                                'body'
                                                                                    ? 'body photo'
                                                                                    : getText(
                                                                                          item,
                                                                                          'category',
                                                                                      ).replace(
                                                                                          '_',
                                                                                          ' ',
                                                                                      )}
                                                                            </p>
                                                                            {getText(
                                                                                item,
                                                                                'category',
                                                                            ) ===
                                                                                'body' && (
                                                                                <p className="text-xs font-semibold text-amber-800">
                                                                                    Private
                                                                                    unless
                                                                                    you
                                                                                    select
                                                                                    the
                                                                                    sanitized
                                                                                    derivative
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                Boolean(
                                                                                    busyId,
                                                                                ) ||
                                                                                Boolean(
                                                                                    prepared,
                                                                                ) ||
                                                                                approvalMatches
                                                                            }
                                                                            onClick={() =>
                                                                                void prepareSummaryDerivative(
                                                                                    id,
                                                                                    activityDate,
                                                                                    sourceId,
                                                                                )
                                                                            }
                                                                            className="min-h-10 rounded-lg border border-stone-300 px-3 text-xs font-bold text-stone-800 disabled:opacity-50"
                                                                        >
                                                                            {busyId ===
                                                                            `media:${sourceId}`
                                                                                ? 'Preparing…'
                                                                                : prepared
                                                                                  ? 'Prepared'
                                                                                  : 'Prepare safe preview'}
                                                                        </button>
                                                                        <div>
                                                                            {prepared ? (
                                                                                <>
                                                                                    <Image
                                                                                        unoptimized
                                                                                        src={
                                                                                            prepared.previewUrl
                                                                                        }
                                                                                        alt="Sanitized WebP derivative preview"
                                                                                        width={
                                                                                            240
                                                                                        }
                                                                                        height={
                                                                                            180
                                                                                        }
                                                                                        className="max-h-36 w-full rounded-lg object-contain"
                                                                                    />
                                                                                    <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs leading-5 text-stone-800">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            disabled={
                                                                                                dirty ||
                                                                                                Boolean(
                                                                                                    busyId,
                                                                                                ) ||
                                                                                                approvalMatches
                                                                                            }
                                                                                            checked={
                                                                                                checked
                                                                                            }
                                                                                            onChange={(
                                                                                                event,
                                                                                            ) => {
                                                                                                setSelectedDerivativeIds(
                                                                                                    (
                                                                                                        current,
                                                                                                    ) => ({
                                                                                                        ...current,
                                                                                                        [id]: event
                                                                                                            .target
                                                                                                            .checked
                                                                                                            ? [
                                                                                                                  ...(current[
                                                                                                                      id
                                                                                                                  ] ??
                                                                                                                      []),
                                                                                                                  prepared.approvedMediaAssetId,
                                                                                                              ]
                                                                                                            : (
                                                                                                                  current[
                                                                                                                      id
                                                                                                                  ] ??
                                                                                                                  []
                                                                                                              ).filter(
                                                                                                                  (
                                                                                                                      assetId,
                                                                                                                  ) =>
                                                                                                                      assetId !==
                                                                                                                      prepared.approvedMediaAssetId,
                                                                                                              ),
                                                                                                    }),
                                                                                                );
                                                                                                invalidateApproval(
                                                                                                    id,
                                                                                                );
                                                                                            }}
                                                                                            className="mt-1 h-4 w-4 accent-stone-950"
                                                                                        />
                                                                                        <span>
                                                                                            Include
                                                                                            this
                                                                                            sanitized
                                                                                            derivative
                                                                                            in
                                                                                            the
                                                                                            public
                                                                                            post
                                                                                        </span>
                                                                                    </label>
                                                                                </>
                                                                            ) : (
                                                                                <p className="text-sm text-stone-500">
                                                                                    No
                                                                                    public
                                                                                    derivative
                                                                                    prepared
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                        {derivatives.length >
                                                            0 && (
                                                            <p className="mt-3 text-xs text-stone-600">
                                                                Selected
                                                                derivatives:{' '}
                                                                {selected.size}.
                                                                Unchecked
                                                                previews stay
                                                                private.
                                                            </p>
                                                        )}
                                                    </div>
                                                </details>
                                                {approvalMatches && (
                                                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                                                        This saved version is
                                                        approved with{' '}
                                                        {currentMediaIds.length}{' '}
                                                        public images.
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                invalidateApproval(
                                                                    id,
                                                                )
                                                            }
                                                            className="ml-2 text-xs font-bold underline"
                                                        >
                                                            Change image
                                                            selection or
                                                            reapprove
                                                        </button>
                                                    </div>
                                                )}
                                                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-5 text-stone-800">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(
                                                            exactApproval[id],
                                                        )}
                                                        disabled={
                                                            approvalMatches ||
                                                            dirty ||
                                                            Boolean(busyId) ||
                                                            !edit.body.trim()
                                                        }
                                                        onChange={(event) => {
                                                            setExactApproval(
                                                                (current) => ({
                                                                    ...current,
                                                                    [id]: event
                                                                        .target
                                                                        .checked,
                                                                }),
                                                            );
                                                            setApprovalIds(
                                                                (current) => {
                                                                    const next =
                                                                        {
                                                                            ...current,
                                                                        };
                                                                    delete next[
                                                                        id
                                                                    ];
                                                                    return next;
                                                                },
                                                            );
                                                            setApprovedSnapshots(
                                                                (current) => {
                                                                    const next =
                                                                        {
                                                                            ...current,
                                                                        };
                                                                    delete next[
                                                                        id
                                                                    ];
                                                                    return next;
                                                                },
                                                            );
                                                        }}
                                                        className="mt-1 h-4 w-4 accent-stone-950"
                                                    />
                                                    <span>
                                                        <strong>
                                                            I approve this exact
                                                            title and body, plus
                                                            only the selected
                                                            sanitized image
                                                            derivatives.
                                                        </strong>
                                                        <span className="block text-xs text-stone-600">
                                                            The server records
                                                            an immutable
                                                            snapshot for
                                                            revision{' '}
                                                            {revisionNumber ??
                                                                '—'}
                                                            . Any edit or
                                                            media-selection
                                                            change needs a new
                                                            approval.
                                                        </span>
                                                    </span>
                                                </label>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            !exactApproval[
                                                                id
                                                            ] ||
                                                            dirty ||
                                                            revisionNumber ===
                                                                null ||
                                                            approvalMatches ||
                                                            Boolean(busyId)
                                                        }
                                                        onClick={() =>
                                                            revisionNumber !==
                                                                null &&
                                                            void approveRevision(
                                                                draft,
                                                                id,
                                                                revisionNumber,
                                                                edit.title,
                                                                edit.body,
                                                            )
                                                        }
                                                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700"
                                                    >
                                                        {approvalMatches
                                                            ? 'Revision approved'
                                                            : busyId === id
                                                              ? 'Working…'
                                                              : 'Approve exact snapshot'}
                                                    </button>
                                                    {approvalMatches && (
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                dirty ||
                                                                !approvalId ||
                                                                Boolean(busyId)
                                                            }
                                                            onClick={() =>
                                                                void publishApproval(
                                                                    id,
                                                                    approvalId,
                                                                    approvalMatches,
                                                                )
                                                            }
                                                            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700"
                                                        >
                                                            {busyId === id
                                                                ? 'Publishing…'
                                                                : 'Publish approved snapshot'}
                                                        </button>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                            </TrackerDialog>
                        )}
                    </div>
                )}
            </Panel>
            <Panel
                title="Publication history"
                description="Public posts and their delivery status."
            >
                {state === 'ready' && publications.length === 0 && (
                    <EmptyState title="No sent summaries">
                        Published items will be listed here when returned by the
                        private API.
                    </EmptyState>
                )}
                {state === 'ready' && publications.length > 0 && (
                    <ul className="divide-y divide-stone-200">
                        {publications.map((item, index) => (
                            <li
                                key={
                                    getText(item, 'id', 'publicationId') ||
                                    `publication-${index}`
                                }
                                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div>
                                    <p className="font-bold text-stone-900">
                                        {getText(
                                            item,
                                            'title',
                                            'titleSnapshot',
                                        ) || 'Summary'}
                                    </p>
                                    <p className="mt-1 text-sm text-stone-600">
                                        {getText(item, 'status') || 'Sent'}
                                        {getValue(item, 'publishedAt')
                                            ? ` · ${dateLabel(getValue(item, 'publishedAt'), { month: 'short', day: 'numeric', year: 'numeric' })}`
                                            : ''}
                                    </p>
                                    {getText(item, 'publicUrl') && (
                                        <a
                                            href={getText(item, 'publicUrl')}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 inline-flex text-sm font-bold underline underline-offset-2"
                                        >
                                            Open publication
                                        </a>
                                    )}
                                </div>
                                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-900">
                                    Sent
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
            <Panel
                title="Revision history"
                description="Saved versions and approvals."
            >
                {state === 'ready' && history.length === 0 && (
                    <EmptyState title="No summary history">
                        Draft changes and publication events will appear here.
                    </EmptyState>
                )}
                {state === 'ready' && history.length > 0 && (
                    <ul
                        tabIndex={0}
                        className="max-h-56 overflow-y-auto divide-y divide-stone-200"
                    >
                        {history.slice(0, 40).map((item, index) => (
                            <li
                                key={getText(item, 'id') || `history-${index}`}
                                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                            >
                                <div>
                                    <p className="text-sm font-bold text-stone-800">
                                        {getText(item, 'type')
                                            .replaceAll('.', ' · ')
                                            .replaceAll('_', ' ')}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {getText(item, 'activityDate')
                                            ? `${getText(item, 'activityDate')} IST`
                                            : ''}
                                        {getNumber(item, 'revisionNumber') !==
                                        null
                                            ? ` · revision ${getNumber(item, 'revisionNumber')}`
                                            : ''}
                                        {getText(item, 'errorCode')
                                            ? ` · ${getText(item, 'errorCode')}`
                                            : ''}
                                    </p>
                                </div>
                                <time className="text-xs text-stone-500">
                                    {dateLabel(getValue(item, 'occurredAt'), {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    })}
                                </time>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </>
    );
}

const API_SCOPES = [
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
const OAUTH_SCOPES = ['openid', 'offline_access', ...API_SCOPES] as const;

function IntegrationsSection() {
    const { data, state, error, reload } = usePrivateData(
        endpointBySection.integrations,
    );
    const { busy, message, setMessage, submit } = useMutation();
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15000);
        return () => window.clearInterval(timer);
    }, []);
    const [keyFormOpen, setKeyFormOpen] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [expiration, setExpiration] = useState('90');
    const [duration, setDuration] = useState('1');
    const [durationUnit, setDurationUnit] = useState('hours');
    const [expirationDate, setExpirationDate] = useState('');
    const [oneTimeSecret, setOneTimeSecret] = useState('');
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const keys = getArray(dataRoot, 'keys', 'items').filter((key) => {
        if (getValue(key, 'revokedAt', 'revoked_at')) return false;
        const expiresAt = getText(key, 'expiresAt', 'expires_at');
        return !expiresAt || new Date(expiresAt).getTime() > now;
    });
    const availableScopeValue = getValue(
        isRecord(dataRoot) ? dataRoot : {},
        'availableScopes',
    );
    const availableScopes = Array.isArray(availableScopeValue)
        ? availableScopeValue.filter(
              (scope): scope is string => typeof scope === 'string',
          )
        : [...API_SCOPES];
    const oauth =
        isRecord(dataRoot) && isRecord(dataRoot.oauth) ? dataRoot.oauth : {};
    const oauthScopesRaw = getValue(oauth, 'scopes');
    const oauthScopes = Array.isArray(oauthScopesRaw)
        ? oauthScopesRaw.filter(
              (scope): scope is string => typeof scope === 'string',
          )
        : [...OAUTH_SCOPES];

    const toggleScope = (scope: string) =>
        setSelectedScopes((current) =>
            current.includes(scope)
                ? current.filter((item) => item !== scope)
                : [...current, scope],
        );
    const issueKey = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!keyName.trim() || selectedScopes.length === 0 || busy) return;
        setOneTimeSecret('');
        const result = await submit(endpointBySection.integrations, 'POST', {
            label: keyName.trim(),
            scopes: selectedScopes,
            ...(expiration === 'custom'
                ? {
                      expiresInMinutes:
                          Number(duration) *
                          (durationUnit === 'days'
                              ? 1440
                              : durationUnit === 'hours'
                                ? 60
                                : 1),
                  }
                : expiration === 'date'
                  ? { expiresAt: new Date(expirationDate).toISOString() }
                  : { expiresInDays: Number(expiration) }),
        });
        if (!result.ok) return;
        setKeyFormOpen(false);
        setKeyName('');
        setSelectedScopes([]);
        const createEnvelope =
            isRecord(result.data) && isRecord(result.data.data)
                ? result.data.data
                : {};
        const token = getText(createEnvelope, 'token');
        if (token) setOneTimeSecret(token);
        else
            setMessage({
                kind: 'error',
                text: 'The key was created, but the one-time token was missing from the response. Revoke it and issue another key if needed.',
            });
        reload();
    };

    const revoke = async (item: JsonRecord) => {
        const id = getText(item, 'id', 'keyId');
        if (
            !id ||
            getValue(item, 'revokedAt', 'revoked_at') ||
            !window.confirm(
                'Revoke this API key? Any integration using it will lose access.',
            )
        )
            return;
        const result = await submit(endpointBySection.integrations, 'DELETE', {
            id,
        });
        if (result.ok) reload();
    };

    return (
        <>
            {oneTimeSecret && (
                <ApiTokenDialog
                    token={oneTimeSecret}
                    onClose={() => setOneTimeSecret('')}
                />
            )}
            <Panel
                title="API access"
                description="Manage scoped API keys and their expiration."
                action={
                    <button
                        type="button"
                        disabled={state !== 'ready' || busy}
                        onClick={() => {
                            setMessage(null);
                            setKeyFormOpen(true);
                        }}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50"
                    >
                        <Plus size={16} aria-hidden="true" /> Create new key
                    </button>
                }
            >
                <StatusPanel state={state} error={error} onRetry={reload} />
                {!keyFormOpen && message && (
                    <Notice kind={message.kind}>{message.text}</Notice>
                )}
                {keyFormOpen && (
                    <ApiKeyFormDialog onClose={() => setKeyFormOpen(false)}>
                        <form onSubmit={issueKey} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Key label
                                    <input
                                        required
                                        maxLength={80}
                                        value={keyName}
                                        onChange={(event) =>
                                            setKeyName(event.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                        placeholder="A name for this integration"
                                    />
                                </label>
                                <label className="grid content-start gap-1.5 text-xs font-semibold text-stone-800">
                                    Expires after
                                    <select
                                        value={expiration}
                                        onChange={(event) =>
                                            setExpiration(event.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"
                                    >
                                        <option value="30">30 days</option>
                                        <option value="90">90 days</option>
                                        <option value="365">365 days</option>
                                        <option value="custom">
                                            Custom duration
                                        </option>
                                        <option value="date">
                                            Date and time
                                        </option>
                                    </select>
                                </label>
                            </div>
                            {expiration === 'custom' && (
                                <div className="flex flex-wrap gap-3">
                                    <label className="grid gap-1 text-xs font-bold">
                                        Duration
                                        <input
                                            type="number"
                                            min="1"
                                            max={
                                                durationUnit === 'days'
                                                    ? 365
                                                    : durationUnit === 'hours'
                                                      ? 8760
                                                      : 525600
                                            }
                                            step="1"
                                            value={duration}
                                            required
                                            onChange={(e) =>
                                                setDuration(e.target.value)
                                            }
                                            className="min-h-10 rounded-lg border border-stone-300 px-3"
                                        />
                                    </label>
                                    <label className="grid gap-1 text-xs font-bold">
                                        Unit
                                        <select
                                            value={durationUnit}
                                            onChange={(e) =>
                                                setDurationUnit(e.target.value)
                                            }
                                            className="min-h-10 rounded-lg border border-stone-300 px-3"
                                        >
                                            <option value="minutes">
                                                Minutes
                                            </option>
                                            <option value="hours">Hours</option>
                                            <option value="days">Days</option>
                                        </select>
                                    </label>
                                </div>
                            )}
                            {expiration === 'date' && (
                                <label className="grid max-w-sm gap-1 text-xs font-bold">
                                    Expires at (local time)
                                    <input
                                        type="datetime-local"
                                        required
                                        value={expirationDate}
                                        onChange={(e) =>
                                            setExpirationDate(e.target.value)
                                        }
                                        className="min-h-10 rounded-lg border border-stone-300 px-3"
                                    />
                                </label>
                            )}
                            <p className="text-xs text-stone-500">
                                Access stops automatically at the expiration
                                time, including keys with a one-hour duration.
                            </p>
                            <fieldset disabled={busy} className="space-y-2">
                                <legend className="mb-2 text-sm font-bold text-stone-800">
                                    Allowed scopes
                                </legend>
                                <label className="mb-3 flex items-center gap-3 rounded-lg border border-stone-300 bg-stone-50 px-3 py-3 text-sm font-bold">
                                    <input
                                        type="checkbox"
                                        checked={
                                            availableScopes.length > 0 &&
                                            availableScopes.every((scope) =>
                                                selectedScopes.includes(scope),
                                            )
                                        }
                                        onChange={(event) =>
                                            setSelectedScopes(
                                                event.target.checked
                                                    ? [...availableScopes]
                                                    : [],
                                            )
                                        }
                                        className="h-4 w-4 accent-stone-950"
                                    />
                                    All access{' '}
                                    <span className="ml-auto text-xs font-normal text-stone-500">
                                        {selectedScopes.length} /{' '}
                                        {availableScopes.length} scopes
                                    </span>
                                </label>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {availableScopes.map((scope) => (
                                        <label
                                            key={scope}
                                            className="flex min-h-11 items-center gap-3 rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-800"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedScopes.includes(
                                                    scope,
                                                )}
                                                onChange={() =>
                                                    toggleScope(scope)
                                                }
                                                className="h-4 w-4 accent-stone-950"
                                            />
                                            {scope}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <button
                                type="submit"
                                disabled={
                                    busy ||
                                    !keyName.trim() ||
                                    selectedScopes.length === 0
                                }
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"
                            >
                                <KeyRound size={15} aria-hidden="true" />
                                {busy ? 'Working…' : 'Issue scoped key'}
                            </button>
                            {message && (
                                <Notice kind={message.kind}>
                                    {message.text}
                                </Notice>
                            )}
                        </form>
                    </ApiKeyFormDialog>
                )}
                {state === 'ready' && (
                    <div>
                        <h3 className="font-bold text-stone-900">
                            Active keys
                        </h3>
                        {keys.length === 0 ? (
                            <p className="mt-2 text-sm text-stone-600">
                                No active API keys. Create a new key to connect
                                an integration.
                            </p>
                        ) : (
                            <ul className="mt-3 divide-y divide-stone-200">
                                {keys.map((item, index) => {
                                    const id = getText(item, 'id', 'keyId');
                                    const rawScopes = getValue(
                                        item,
                                        'scopes',
                                        'permissions',
                                    );
                                    const scopes = Array.isArray(rawScopes)
                                        ? rawScopes.filter(
                                              (scope): scope is string =>
                                                  typeof scope === 'string',
                                          )
                                        : [];
                                    const revoked = Boolean(
                                        getValue(
                                            item,
                                            'revokedAt',
                                            'revoked_at',
                                        ),
                                    );
                                    const expires = getText(
                                        item,
                                        'expiresAt',
                                        'expires_at',
                                    );
                                    const expired =
                                        !!expires &&
                                        new Date(expires).getTime() <= now;
                                    return (
                                        <li
                                            key={
                                                id ||
                                                `${getText(item, 'label')}-${index}`
                                            }
                                            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900">
                                                    {getText(
                                                        item,
                                                        'label',
                                                        'name',
                                                    ) || 'API key'}{' '}
                                                    <span className="font-normal text-stone-500">
                                                        {getText(
                                                            item,
                                                            'keyPrefix',
                                                            'key_prefix',
                                                            'prefix',
                                                        )
                                                            ? `· ${getText(item, 'keyPrefix', 'key_prefix', 'prefix')}`
                                                            : ''}
                                                    </span>{' '}
                                                    {(revoked || expired) && (
                                                        <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                                            {revoked
                                                                ? 'Revoked'
                                                                : 'Expired'}
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="mt-1 text-xs text-stone-600">
                                                    {scopes.length
                                                        ? `Scopes: ${scopes.join(', ')}`
                                                        : 'Scopes not returned'}
                                                    {getValue(
                                                        item,
                                                        'expiresAt',
                                                        'expires_at',
                                                    )
                                                        ? ` · expires ${dateLabel(getValue(item, 'expiresAt', 'expires_at'), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                                                        : ''}
                                                    {getValue(
                                                        item,
                                                        'createdAt',
                                                        'created_at',
                                                    )
                                                        ? ` · created ${dateLabel(getValue(item, 'createdAt', 'created_at'))}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={
                                                    !id ||
                                                    revoked ||
                                                    expired ||
                                                    busy
                                                }
                                                onClick={() =>
                                                    void revoke(item)
                                                }
                                                className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-rose-300 bg-white px-3 text-sm font-bold text-rose-900 hover:bg-rose-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
                                            >
                                                <X
                                                    size={15}
                                                    aria-hidden="true"
                                                />{' '}
                                                Revoke
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </Panel>
            <Panel
                title="MCP access log"
                description="Recent authenticated requests and tool calls. Arguments, image contents, and keys are never logged."
            >
                <button
                    type="button"
                    onClick={reload}
                    className="mb-3 rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold"
                >
                    Refresh logs
                </button>
                <div className="max-h-80 overflow-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white">
                            <tr>
                                {[
                                    'Time (IST)',
                                    'Tool / request',
                                    'Client',
                                    'Outcome',
                                    'Duration',
                                ].map((label) => (
                                    <th key={label} className="p-2">
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {getArray(dataRoot, 'logs').map((log) => (
                                <tr
                                    key={getText(log, 'id')}
                                    className="border-t border-stone-200"
                                >
                                    <td className="p-2">
                                        {dateLabel(
                                            getText(log, 'occurred_at'),
                                            {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit',
                                            },
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {getText(log, 'tool_name') ||
                                            getText(log, 'method')}
                                    </td>
                                    <td className="p-2 break-all">
                                        {getText(log, 'client_id')}
                                    </td>
                                    <td className="p-2">
                                        {getText(log, 'outcome')} ·{' '}
                                        {getText(log, 'http_status')}
                                    </td>
                                    <td className="p-2">
                                        {getText(log, 'duration_ms')} ms
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!getArray(dataRoot, 'logs').length && (
                        <p className="p-3 text-sm text-stone-500">
                            No MCP requests recorded yet.
                        </p>
                    )}
                </div>
            </Panel>
            <Panel
                title="OAuth provider"
                description="MCP supports OAuth sign-in and consent, alongside scoped API keys."
            >
                <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-extrabold text-stone-700">
                        {getText(oauth, 'status') ===
                        'configured_after_private_environment_setup'
                            ? 'OAuth supported'
                            : getText(oauth, 'status') ||
                              'Loading configuration…'}
                    </span>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-stone-200 p-3">
                        <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                            MCP endpoint
                        </dt>
                        <dd className="mt-1 break-all text-sm font-medium text-stone-900">
                            {getText(oauth, 'endpoint') || 'Not configured'}
                        </dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 p-3">
                        <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                            Authorization server
                        </dt>
                        <dd className="mt-1 break-all text-sm font-medium text-stone-900">
                            {getText(oauth, 'authorizationServer') ||
                                'Not configured'}
                        </dd>
                    </div>
                    <div className="rounded-lg border border-stone-200 p-3 sm:col-span-2">
                        <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                            OAuth scopes
                        </dt>
                        <dd className="mt-2 flex flex-wrap gap-2">
                            {oauthScopes.map((scope) => (
                                <span
                                    key={scope}
                                    className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700"
                                >
                                    {scope}
                                </span>
                            ))}
                        </dd>
                    </div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-stone-500">
                    OAuth clients sign in and approve scopes through the consent
                    page. API-key clients use a scoped key instead. OAuth access
                    is separate from automatic reminder delivery.
                </p>
            </Panel>
            <Panel
                title="Delivery status"
                description="Automatic check-in reminders are not connected. MCP data access works independently."
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                            Reminder scheduler
                        </p>
                        <p className="mt-1 font-extrabold text-stone-900">
                            Not configured
                        </p>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                            Notification provider
                        </p>
                        <p className="mt-1 font-extrabold text-stone-900">
                            Not connected
                        </p>
                    </div>
                </div>
            </Panel>
        </>
    );
}

const pageMeta: Record<Section, { title: string; intro: string }> = {
    progress: {
        title: 'Progress',
        intro: 'Review recorded habits and update a status with a clear, deliberate action.',
    },
    'check-ins': {
        title: 'Check-ins',
        intro: 'Answer scheduled check-ins and review recent entries.',
    },
    food: {
        title: 'Food',
        intro: 'Log meals, view calorie estimates, and compare daily intake with your weight.',
    },
    weight: {
        title: 'Weight',
        intro: 'Track your weight, review image readings, and edit saved measurements.',
    },
    body: {
        title: 'Body',
        intro: 'Compare your progress over time and manage private photos and videos.',
    },
    summaries: {
        title: 'Summaries',
        intro: 'Write a summary, review it, and choose what to publish.',
    },
    integrations: {
        title: 'Integrations',
        intro: 'Manage API keys, permissions, and connected services.',
    },
};

export default function AccountabilityPage({ section }: { section: Section }) {
    const meta = pageMeta[section];
    const content =
        section === 'progress' ? (
            <ProgressSection />
        ) : section === 'check-ins' ? (
            <CheckInsSection />
        ) : section === 'food' ? (
            <FoodSection />
        ) : section === 'weight' ? (
            <WeightSection />
        ) : section === 'body' ? (
            <BodySection />
        ) : section === 'summaries' ? (
            <SummariesSection />
        ) : (
            <IntegrationsSection />
        );
    return (
        <AccountabilityShell
            active={section}
            title={meta.title}
            intro={meta.intro}
        >
            {content}
        </AccountabilityShell>
    );
}
