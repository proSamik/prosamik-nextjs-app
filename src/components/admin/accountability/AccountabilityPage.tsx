'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { addActivityDays, getMondayStartOfWeek, toIstActivityDate, type ActivityDate } from '@/lib/accountability-domain';
import { CHECK_IN_SLOTS, HABITS, type HabitKey } from '@/lib/accountability-constants';
import { Activity, Check, CircleHelp, Clock3, FileText, KeyRound, LoaderCircle, LockKeyhole, Play, Plus, RefreshCw, Scale, ShieldCheck, UserRoundCheck, X } from 'lucide-react';

type Section = 'progress' | 'check-ins' | 'weight' | 'body' | 'summaries' | 'integrations';
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
    { key: 'progress', label: 'Progress', href: '/samik-admin/progress', description: 'Habits and current progress', icon: Activity },
    { key: 'check-ins', label: 'Check-ins', href: '/samik-admin/check-ins', description: 'Daily notes and weekly view', icon: UserRoundCheck },
    { key: 'weight', label: 'Weight', href: '/samik-admin/weight', description: 'Recorded measurements', icon: Scale },
    { key: 'body', label: 'Body', href: '/samik-admin/body', description: 'Private media gallery', icon: Play },
    { key: 'summaries', label: 'Summaries', href: '/samik-admin/summaries', description: 'Review before sharing', icon: FileText },
    { key: 'integrations', label: 'Integrations', href: '/samik-admin/integrations', description: 'Scoped access and setup', icon: KeyRound },
];

const endpointBySection: Record<Section, string> = {
    progress: '/api/samik-admin/progress',
    'check-ins': '/api/samik-admin/check-ins',
    weight: '/api/samik-admin/weight',
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
        if (record[key] !== undefined && record[key] !== null) return record[key];
    }
    return undefined;
}

function getText(record: JsonRecord, ...keys: string[]): string {
    const value = getValue(record, ...keys);
    return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function getNumber(record: JsonRecord, ...keys: string[]): number | null {
    const value = getValue(record, ...keys);
    const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    return Number.isFinite(numeric) ? numeric : null;
}

function getArray(value: unknown, ...keys: string[]): JsonRecord[] {
    if (Array.isArray(value)) return value.filter(isRecord);
    if (!isRecord(value)) return [];
    const envelopeData = value.data;
    if (Array.isArray(envelopeData)) return envelopeData.filter(isRecord);
    if (isRecord(envelopeData)) {
        const nested = getArray(envelopeData, ...keys);
        if (nested.length || keys.some((key) => Array.isArray(envelopeData[key]))) return nested;
    }
    for (const key of keys) {
        const list = value[key];
        if (Array.isArray(list)) return list.filter(isRecord);
    }
    return [];
}

function dateLabel(value: unknown, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
    if (typeof value !== 'string' && typeof value !== 'number') return 'Date not set';
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00+05:30`) : new Date(value);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'Asia/Kolkata' }).format(date);
}

function localDateValue(): ActivityDate {
    return toIstActivityDate(new Date());
}

function timestampForActivityDate(value: unknown): number {
    if (typeof value !== 'string' && typeof value !== 'number') return Number.NaN;
    const raw = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00+05:30`) : new Date(value);
    return date.getTime();
}

async function requestPrivateJson(path: string, init: RequestInit = {}): Promise<unknown> {
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
        let message = 'The request could not be completed. Please try again.';
        try {
            const body: unknown = await response.json();
            if (isRecord(body) && typeof body.error === 'string') message = body.error;
        } catch { /* Use the generic request message when there is no JSON error response. */ }
        throw new Error(message);
    }
    if (response.status === 204) return null;
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) return null;
    return response.json();
}

function usePrivateData(endpoint: string) {
    const [data, setData] = useState<unknown>(null);
    const [state, setState] = useState<LoadState>('loading');
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    const reload = useCallback(() => setVersion((value) => value + 1), []);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        setState('loading');
        setError('');
        fetch(endpoint, { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: controller.signal })
            .then(async (response) => {
                if (!response.ok) {
                    let message = 'Private data could not be loaded. Please try again.';
                    try {
                        const body: unknown = await response.json();
                        if (isRecord(body) && typeof body.error === 'string') message = body.error;
                    } catch { /* Keep the generic loading error. */ }
                    throw new Error(message);
                }
                return response.json();
            })
            .then((result: unknown) => {
                if (!active) return;
                setData(result);
                setState('ready');
            })
            .catch((cause: unknown) => {
                if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
                setError(cause instanceof Error ? cause.message : 'Private data could not be loaded.');
                setState('error');
            });
        return () => { active = false; controller.abort(); };
    }, [endpoint, version]);

    return { data, state, error, reload };
}

function AccountabilityShell({ active, title, intro, children }: {
    active: Section;
    title: string;
    intro: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    return (
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8 lg:px-8">
            <header className="mb-7 border-b border-stone-300 pb-6 sm:mb-8 sm:pb-7">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <Link href="/samik-admin" className="mb-3 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-600 hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">
                            <LockKeyhole size={12} aria-hidden="true" /> Private workspace
                        </Link>
                        <h1 className="text-3xl font-black tracking-[-0.045em] text-stone-950 sm:text-4xl">{title}</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{intro}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                        <ShieldCheck size={15} aria-hidden="true" /> Private · no-store data
                    </div>
                </div>
            </header>

            <nav aria-label="Accountability sections" className="mb-7 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">
                {sections.map(({ key, label, href, icon: Icon }) => {
                    const current = active === key || pathname === href;
                    return (
                        <Link key={key} href={href} aria-current={current ? 'page' : undefined}
                            className={`flex min-w-[120px] items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 sm:min-w-0 ${current ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'}`}>
                            <Icon size={16} className="shrink-0" aria-hidden="true" /> {label}
                        </Link>
                    );
                })}
            </nav>

            <div className="space-y-5">{children}</div>
        </main>
    );
}

function Panel({ title, description, children, action }: {
    title: string;
    description?: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-stone-300 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-stone-950">{title}</h2>
                    {description && <p className="mt-1 text-sm leading-5 text-stone-600">{description}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function StatusPanel({ state, error, onRetry }: { state: LoadState; error: string; onRetry: () => void }) {
    if (state === 'loading') {
        return <div className="flex min-h-28 items-center justify-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-medium text-stone-600" role="status" aria-live="polite"><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> Loading private data…</div>;
    }
    if (state === 'error') {
        return <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert"><div><p className="font-bold text-rose-950">Couldn’t load this section</p><p className="mt-1 text-sm text-rose-800">{error}</p></div><button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-3 text-sm font-bold text-rose-900 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"><RefreshCw size={15} aria-hidden="true" /> Try again</button></div>;
    }
    return null;
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
    return <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center"><CircleHelp size={22} className="mx-auto text-stone-500" aria-hidden="true" /><h3 className="mt-2 font-bold text-stone-900">{title}</h3><p className="mx-auto mt-1 max-w-xl text-sm leading-5 text-stone-600">{children}</p></div>;
}

function Notice({ kind, children }: { kind: 'success' | 'error' | 'info'; children: ReactNode }) {
    const style = kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-sky-200 bg-sky-50 text-sky-900';
    return <p className={`rounded-lg border px-3 py-2 text-sm ${style}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>;
}

function statusOf(record: JsonRecord): HabitStatus {
    const raw = getValue(record, 'status', 'completionStatus', 'state');
    const complete = getValue(record, 'completed', 'isCompleted');
    if (complete === true) return 'completed';
    if (complete === false) return 'incomplete';
    if (typeof raw !== 'string') return 'unknown';
    const normalized = raw.toLowerCase().trim();
    if (['completed', 'complete', 'done', 'success'].includes(normalized)) return 'completed';
    if (['incomplete', 'not completed', 'missed', 'failed'].includes(normalized)) return 'incomplete';
    return 'unknown';
}

const statusStyle: Record<HabitStatus, string> = {
    unknown: 'border-slate-300 bg-slate-100 text-slate-800',
    incomplete: 'border-amber-300 bg-amber-100 text-amber-900',
    completed: 'border-emerald-300 bg-emerald-100 text-emerald-900',
};
const statusLabel: Record<HabitStatus, string> = { unknown: 'Unknown', incomplete: 'Incomplete', completed: 'Completed' };

function StatusBadge({ status }: { status: HabitStatus }) {
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusStyle[status]}`}>{statusLabel[status]}</span>;
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
    const complete = useCallback((fingerprint: string) => { keys.current.delete(fingerprint); }, []);
    return { keyFor, complete };
}

function useMutation() {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const submit = useCallback(async (path: string, method: 'POST' | 'PATCH' | 'DELETE', body: unknown): Promise<{ ok: boolean; data?: unknown }> => {
        setBusy(true);
        setMessage(null);
        try {
            const data = await requestPrivateJson(path, { method, body: JSON.stringify(body) });
            setMessage({ kind: 'success', text: 'Saved.' });
            return { ok: true, data };
        } catch (cause) {
            setMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'The change could not be saved.' });
            return { ok: false };
        } finally {
            setBusy(false);
        }
    }, []);
    return { busy, message, setMessage, submit };
}

const habitFields = {
    physical_workout: ['activity', 'durationMinutes'],
    direct_marketing: ['outreachCount', 'outreachChannel'],
    email_writing: ['emailDraftedCount', 'emailSentCount'],
    video_content: ['videoStage', 'notes'],
} satisfies Record<typeof HABITS[number]['key'], readonly string[]>;
const habitDefinitions = HABITS.map((habit) => ({ ...habit, fields: habitFields[habit.key] }));

function ProgressSection() {
    const [activityDate, setActivityDate] = useState(localDateValue);
    const endpoint = `${endpointBySection.progress}?from=${encodeURIComponent(activityDate)}&to=${encodeURIComponent(activityDate)}`;
    const { data, state, error, reload } = usePrivateData(endpoint);
    const [saving, setSaving] = useState(false);
    const idempotency = useIdempotencyKeys();
    const [progressNotice, setProgressNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const habits = getArray(dataRoot, 'habits', 'items', 'progress');
    const targetDate = isRecord(dataRoot) ? getText(dataRoot, 'toDate', 'date', 'activityDate') || activityDate : activityDate;

    const saveHabit = async (habitKey: HabitKey, current: JsonRecord | undefined, status: HabitStatus, details: JsonRecord) => {
        const payload = { type: 'habit', habitKey, activityDate: targetDate, status: status === 'completed' ? 'complete' : status, ...details };
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
            setProgressNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The change could not be saved.' });
            return false;
        } finally { setSaving(false); }
    };

    return <>
        <Panel title="Habit progress" description="Status colors distinguish unknown, incomplete, and completed records. Choose an explicit action to save one of the four habit keys.">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="grid max-w-xs gap-1.5 text-sm font-bold text-stone-800">Activity date <span className="text-xs font-normal text-stone-500">IST</span><input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" /></label>
                <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600"><span className="font-bold">Status key</span>{(['unknown', 'incomplete', 'completed'] as HabitStatus[]).map((status) => <StatusBadge key={status} status={status} />)}</div>
            </div>
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && <div className="space-y-3">
                {habitDefinitions.map((definition) => {
                    const current = habits.find((habit) => getText(habit, 'habitKey', 'habit_key', 'key') === definition.key);
                    return <HabitProgressCard key={`${activityDate}-${definition.key}`} habitKey={definition.key} label={definition.label} fields={definition.fields} current={current} disabled={saving} onSave={saveHabit} />;
                })}
            </div>}
            {progressNotice && <div className="mt-4"><Notice kind={progressNotice.kind}>{progressNotice.text}</Notice></div>}
        </Panel>
        <Panel title="Progress history" description="Only history records returned by the private API are shown.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && (() => {
                const history = getArray(dataRoot, 'habitHistory', 'history', 'historyItems', 'days');
                return history.length === 0 ? <EmptyState title="No history available">No past progress records were returned for this view.</EmptyState> : <ul className="divide-y divide-stone-200">{history.map((item, index) => {
                    const definition = habitDefinitions.find((habit) => habit.key === getText(item, 'habitKey', 'habit_key'));
                    return <li key={getText(item, 'id') || `${getText(item, 'date')}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="font-semibold text-stone-900">{definition?.label || 'Progress entry'}</span><span className="text-stone-600">{dateLabel(getValue(item, 'date', 'activityDate', 'createdAt'))}</span><StatusBadge status={statusOf(item)} /></li>;
                })}</ul>;
            })()}
        </Panel>
    </>;
}

function HabitProgressCard({ habitKey, label, fields, current, disabled, onSave }: {
    habitKey: HabitKey;
    label: string;
    fields: readonly string[];
    current?: JsonRecord;
    disabled: boolean;
    onSave: (habitKey: HabitKey, current: JsonRecord | undefined, status: HabitStatus, details: JsonRecord) => Promise<boolean>;
}) {
    const [activity, setActivity] = useState(() => getText(current ?? {}, 'activity'));
    const [durationMinutes, setDurationMinutes] = useState(() => getText(current ?? {}, 'durationMinutes', 'duration_minutes'));
    const [outreachCount, setOutreachCount] = useState(() => getText(current ?? {}, 'outreachCount', 'outreach_count'));
    const [outreachChannel, setOutreachChannel] = useState(() => getText(current ?? {}, 'outreachChannel', 'outreach_channel'));
    const [emailDraftedCount, setEmailDraftedCount] = useState(() => getText(current ?? {}, 'emailDraftedCount', 'email_drafted_count'));
    const [emailSentCount, setEmailSentCount] = useState(() => getText(current ?? {}, 'emailSentCount', 'email_sent_count'));
    const [videoStage, setVideoStage] = useState(() => getText(current ?? {}, 'videoStage', 'video_stage'));
    const [notes, setNotes] = useState(() => getText(current ?? {}, 'notes'));
    const [localBusy, setLocalBusy] = useState(false);
    const status = current ? statusOf(current) : 'unknown';

    const detailValue = (field: string): string => ({ activity, durationMinutes, outreachCount, outreachChannel, emailDraftedCount, emailSentCount, videoStage, notes }[field] ?? '');
    const setField = (field: string, value: string) => {
        if (field === 'activity') setActivity(value);
        if (field === 'durationMinutes') setDurationMinutes(value);
        if (field === 'outreachCount') setOutreachCount(value);
        if (field === 'outreachChannel') setOutreachChannel(value);
        if (field === 'emailDraftedCount') setEmailDraftedCount(value);
        if (field === 'emailSentCount') setEmailSentCount(value);
        if (field === 'videoStage') setVideoStage(value);
        if (field === 'notes') setNotes(value);
    };
    const details: JsonRecord = {};
    for (const field of fields) {
        const value = detailValue(field);
        details[field] = value === '' ? null : ['durationMinutes', 'outreachCount', 'emailDraftedCount', 'emailSentCount'].includes(field) ? Number(value) : value;
    }
    const invalidOutreach = fields.includes('outreachCount') && Number(outreachCount) > 0 && !outreachChannel;
    const update = async (next: HabitStatus) => {
        setLocalBusy(true);
        try { await onSave(habitKey, current, next, details); } finally { setLocalBusy(false); }
    };

    return <article className="rounded-xl border border-stone-200 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-stone-950">{label}</h3><StatusBadge status={status} /></div><p className="mt-1 text-xs text-stone-500">Key: {habitKey}</p></div>
            <div className="flex flex-wrap gap-2">
                <button type="button" disabled={disabled || localBusy || invalidOutreach || status === 'completed'} onClick={() => void update('completed')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Check size={15} aria-hidden="true" /> Mark complete</button>
                <button type="button" disabled={disabled || localBusy || invalidOutreach || status === 'incomplete'} onClick={() => void update('incomplete')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><X size={15} aria-hidden="true" /> Mark incomplete</button>
                <button type="button" disabled={disabled || localBusy || invalidOutreach || status === 'unknown'} onClick={() => void update('unknown')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2"><CircleHelp size={15} aria-hidden="true" /> Mark unknown</button>
                <button type="button" disabled={disabled || localBusy || invalidOutreach} onClick={() => void update(status)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Check size={15} aria-hidden="true" /> Save details</button>
            </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.includes('activity') && <label className="grid gap-1 text-xs font-bold text-stone-700">Activity<input value={activity} onChange={(event) => setField('activity', event.target.value)} maxLength={200} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional activity detail" /></label>}
            {fields.includes('durationMinutes') && <label className="grid gap-1 text-xs font-bold text-stone-700">Duration (minutes)<input type="number" min="0" max="1440" step="1" value={durationMinutes} onChange={(event) => setField('durationMinutes', event.target.value)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional duration" /></label>}
            {fields.includes('outreachCount') && <label className="grid gap-1 text-xs font-bold text-stone-700">Outreach count<input type="number" min="0" max="999" step="1" value={outreachCount} onChange={(event) => setField('outreachCount', event.target.value)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional count" /></label>}
            {fields.includes('outreachChannel') && <label className="grid gap-1 text-xs font-bold text-stone-700">Outreach channel<select value={outreachChannel} onChange={(event) => setField('outreachChannel', event.target.value)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="">Not set</option><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="phone">Phone</option><option value="in_person">In person</option><option value="other">Other</option></select></label>}
            {fields.includes('emailDraftedCount') && <label className="grid gap-1 text-xs font-bold text-stone-700">Emails drafted<input type="number" min="0" max="10000" step="1" value={emailDraftedCount} onChange={(event) => setField('emailDraftedCount', event.target.value)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional count" /></label>}
            {fields.includes('emailSentCount') && <label className="grid gap-1 text-xs font-bold text-stone-700">Emails sent<input type="number" min="0" max="10000" step="1" value={emailSentCount} onChange={(event) => setField('emailSentCount', event.target.value)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional count" /></label>}
            {fields.includes('videoStage') && <label className="grid gap-1 text-xs font-bold text-stone-700">Video stage<select value={videoStage} onChange={(event) => setField('videoStage', event.target.value)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="">Not set</option><option value="idea">Idea</option><option value="planned">Planned</option><option value="scripted">Scripted</option><option value="recorded">Recorded</option><option value="edited">Edited</option><option value="published">Published</option></select></label>}
            {fields.includes('notes') && <label className="grid gap-1 text-xs font-bold text-stone-700 sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setField('notes', event.target.value)} rows={2} maxLength={2000} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional video notes" /></label>}
        </div>
    </article>;
}

function CheckInsSection() {
    const monday = getMondayStartOfWeek(localDateValue());
    const sunday = addActivityDays(monday, 6);
    const checkInEndpoint = `${endpointBySection['check-ins']}?from=${encodeURIComponent(monday)}&to=${encodeURIComponent(sunday)}`;
    const progressEndpoint = `${endpointBySection.progress}?from=${encodeURIComponent(monday)}&to=${encodeURIComponent(sunday)}`;
    const { data, state, error, reload } = usePrivateData(checkInEndpoint);
    const noFap = usePrivateData(progressEndpoint);
    const idempotency = useIdempotencyKeys();
    const [answerText, setAnswerText] = useState<Record<string, string>>({});
    const [answerBusy, setAnswerBusy] = useState('');
    const [answerNotice, setAnswerNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [noFapBusy, setNoFapBusy] = useState('');
    const [noFapNotice, setNoFapNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const slots = getArray(dataRoot, 'slots', 'checkIns', 'entries');
    const dayRows = getArray(dataRoot, 'days', 'dates');
    const flattenedSlots = [...slots, ...dayRows.flatMap((day) => getArray(day, 'slots').map((slot) => ({ ...slot, activityDate: getText(slot, 'activityDate', 'date') || getText(day, 'activityDate', 'date') })))];
    const noFapRoot = isRecord(noFap.data) && isRecord(noFap.data.data) ? noFap.data.data : noFap.data;
    const noFapWeek = isRecord(noFapRoot) && isRecord(noFapRoot.noFapWeek) ? noFapRoot.noFapWeek : {};
    const noFapStreak = isRecord(noFapRoot) && isRecord(noFapRoot.noFapStreak) ? noFapRoot.noFapStreak : {};
    const noFapDays = getArray(noFapRoot, 'noFapDays');
    const dateKeys = Array.from({ length: 7 }, (_, index) => addActivityDays(monday, index));
    const getSlot = (date: string, slotId: string) => flattenedSlots.find((slot) => getText(slot, 'activityDate', 'date') === date && getText(slot, 'slotId', 'id') === slotId);

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
            setAnswerNotice({ kind: 'success', text: 'Check-in answer saved.' });
            setAnswerText((current) => ({ ...current, [`${date}:${slotId}`]: '' }));
            reload();
        } catch (cause) {
            setAnswerNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The answer could not be saved.' });
        } finally { setAnswerBusy(''); }
    };

    const setNoFapStatus = async (date: string, status: 'success' | 'relapse' | 'not_tracked') => {
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
            setNoFapNotice({ kind: 'success', text: `No-fap status saved for ${dateLabel(date)}.` });
            noFap.reload();
        } catch (cause) {
            setNoFapNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The status could not be saved.' });
        } finally { setNoFapBusy(''); }
    };

    return <>
        <Panel title="Check-in slots · IST" description="Each day has four scheduled slots. Pending and missed slots can be answered; missed slots accept a late answer.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && dateKeys.length > 0 && <div className="space-y-4">
                {dateKeys.map((date) => <section key={date} className="rounded-xl border border-stone-200 p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-extrabold text-stone-950">{dateLabel(date, { weekday: 'long', month: 'short', day: 'numeric' })}</h3><span className="text-xs font-semibold text-stone-500">{date}</span></div>
                    <div className="grid gap-3 xl:grid-cols-2">{CHECK_IN_SLOTS.map((slotDef) => {
                        const record = getSlot(date, slotDef.id);
                        const rawStatus = getText(record ?? {}, 'status').toLowerCase();
                        const status = !record ? 'unavailable' : rawStatus === 'answered' ? 'answered' : rawStatus === 'missed' ? 'missed' : 'pending';
                        const answerKey = `${date}:${slotDef.id}`;
                        const reminder = isRecord(getValue(record ?? {}, 'reminder')) ? getValue(record ?? {}, 'reminder') as JsonRecord : {};
                        const reminderToken = getText(record ?? {}, 'reminderStatus', 'reminderState') || getText(reminder, 'status') || 'not scheduled';
                        const reminderState = reminderToken.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
                        return <article key={slotDef.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold text-stone-900">{slotDef.label}</h4><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${status === 'answered' ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : status === 'missed' ? 'border-rose-300 bg-rose-100 text-rose-900' : status === 'pending' ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>{status[0].toUpperCase() + status.slice(1)}</span></div>
                            <p className="mt-1 text-xs text-stone-600">Reminder: {reminderState}</p>
                            {status === 'answered' ? <p className="mt-3 whitespace-pre-wrap rounded-lg border border-stone-200 bg-white p-3 text-sm leading-5 text-stone-800">{getText(record ?? {}, 'response', 'answer') || 'No response text returned.'}</p> : <div className="mt-3 space-y-2"><label className="grid gap-1 text-xs font-bold text-stone-700">Response<textarea value={answerText[answerKey] ?? ''} onChange={(event) => setAnswerText((current) => ({ ...current, [answerKey]: event.target.value }))} rows={2} maxLength={4000} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Write a check-in response" /></label><button type="button" disabled={!record || date > localDateValue() || !answerText[answerKey]?.trim() || Boolean(answerBusy)} onClick={() => void submitAnswer(date, slotDef.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Check size={15} aria-hidden="true" />{answerBusy === answerKey ? 'Saving…' : status === 'missed' ? 'Answer late' : 'Answer check-in'}</button>{!record && <p className="text-xs text-stone-500">This slot is not present in the API response yet.</p>}{date > localDateValue() && <p className="text-xs text-stone-500">Available on this activity date.</p>}</div>}
                        </article>;
                    })}</div>
                </section>)}
            </div>}
            {answerNotice && <div className="mt-4"><Notice kind={answerNotice.kind}>{answerNotice.text}</Notice></div>}
        </Panel>
        <Panel title="No-fap · this week" description="Weekly totals and day statuses are read from the private progress response. Missing statuses stay unknown.">
            <StatusPanel state={noFap.state} error={noFap.error} onRetry={noFap.reload} />
            {noFap.state === 'ready' && <>
                <div className="mb-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Success days</p><p className="mt-1 text-3xl font-black tabular-nums text-emerald-950">{getNumber(noFapWeek, 'successDays') ?? '—'}<span className="text-base font-bold text-emerald-800"> / 7</span></p></div><div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-stone-600">Consecutive winning weeks</p><p className="mt-1 text-3xl font-black tabular-nums text-stone-950">{getNumber(noFapStreak, 'consecutiveWinningWeeks') ?? '—'}</p></div></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{dateKeys.map((date) => {
                    const entry = noFapDays.find((item) => getText(item, 'date', 'activityDate') === date);
                    const status = getText(entry ?? {}, 'status').toLowerCase();
                    const label = status === 'success' ? 'Success' : status === 'relapse' ? 'Relapse' : status === 'not_tracked' ? 'Not tracked' : 'Unknown';
                    const color = status === 'success' ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : status === 'relapse' ? 'border-rose-300 bg-rose-100 text-rose-900' : status === 'not_tracked' ? 'border-slate-300 bg-slate-100 text-slate-800' : 'border-stone-300 bg-white text-stone-600';
                    return <div key={date} className={`rounded-xl border p-3 ${color}`}><p className="text-xs font-bold uppercase">{dateLabel(date, { weekday: 'short' })}</p><p className="mt-1 text-sm font-extrabold">{dateLabel(date)}</p><p className="mt-2 text-xs font-bold">{label}</p><div className="mt-3 flex flex-wrap gap-1">{(['success', 'relapse', 'not_tracked'] as const).map((option) => <button key={option} type="button" disabled={date > localDateValue() || noFapBusy === date || status === option} onClick={() => void setNoFapStatus(date, option)} className="min-h-8 rounded-md border border-current/25 bg-white/70 px-2 text-[10px] font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">{option === 'not_tracked' ? 'Not tracked' : option[0].toUpperCase() + option.slice(1)}</button>)}</div></div>;
                })}</div>
                <p className="mt-3 text-xs text-stone-500">Future dates can’t be updated. Status actions are recorded for the exact IST activity date.</p>
            </>}
            {noFapNotice && <div className="mt-4"><Notice kind={noFapNotice.kind}>{noFapNotice.text}</Notice></div>}
        </Panel>
    </>;
}

function WeightSection() {
    const { data, state, error, reload } = usePrivateData(endpointBySection.weight);
    const [date, setDate] = useState(localDateValue);
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState('');
    const [notes, setNotes] = useState('');
    const [primary, setPrimary] = useState(false);
    const [busy, setBusy] = useState(false);
    const idempotency = useIdempotencyKeys();
    const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [imageValue, setImageValue] = useState('');
    const [imageUnit, setImageUnit] = useState('');
    const [imageNotes, setImageNotes] = useState('');
    const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
    const [imageBusy, setImageBusy] = useState(false);
    const [imageNotice, setImageNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [confirmingId, setConfirmingId] = useState('');
    const [confirmNotice, setConfirmNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const entries = useMemo(() => getArray(dataRoot, 'entries', 'weights', 'measurements').flatMap((record) => {
        const originalValue = Number(getValue(record, 'originalValue', 'original_value'));
        const rawDate = getValue(record, 'date', 'activityDate', 'measuredAt', 'createdAt');
        const rawMeasuredAt = getValue(record, 'measuredAt', 'measured_at', 'date', 'activityDate', 'createdAt');
        const timestamp = timestampForActivityDate(rawMeasuredAt);
        const dateValue = getText(record, 'date', 'activityDate') || (typeof rawDate === 'string' ? rawDate.slice(0, 10) : '');
        if (!Number.isFinite(originalValue) || !Number.isFinite(timestamp) || !dateValue) return [];
        const weightKgValue = Number(getValue(record, 'weightKg', 'weight_kg'));
        const confirmationStatus = getText(record, 'confirmationStatus', 'confirmation_status').toLowerCase();
        return [{
            record,
            value: Number.isFinite(weightKgValue) ? weightKgValue : Number.NaN,
            timestamp,
            date: dateValue,
            originalValue,
            originalUnit: getText(record, 'originalUnit', 'original_unit') || 'Unit not set',
            isPrimary: getValue(record, 'isPrimary', 'is_primary') === true,
            confirmationStatus,
            source: getText(record, 'source') || 'unknown',
            id: getText(record, 'id'),
        }];
    }).sort((a, b) => a.timestamp - b.timestamp), [dataRoot]);
    const primaryValue = getValue(isRecord(dataRoot) ? dataRoot : {}, 'primaryMeasurements');
    const primaryIds = Array.isArray(primaryValue)
        ? new Set(primaryValue.filter(isRecord).map((entry) => getText(entry, 'id')).filter(Boolean))
        : null;
    const chartEntries = entries.filter((entry) => entry.isPrimary
        && entry.confirmationStatus === 'confirmed'
        && Number.isFinite(entry.value)
        && (!primaryIds || primaryIds.has(entry.id)));
    const latest = isRecord(dataRoot) && isRecord(dataRoot.latest) ? dataRoot.latest : null;
    const firstInRange = isRecord(dataRoot) && isRecord(dataRoot.firstInRange) ? dataRoot.firstInRange : null;
    const missingValue = getValue(isRecord(dataRoot) ? dataRoot : {}, 'missingDates');
    const missingDates = Array.isArray(missingValue)
        ? [...new Set(missingValue.filter((item): item is string => typeof item === 'string'))].sort()
        : [];
    const evidenceEndpoint = `${endpointBySection.body}?category=weight_evidence&from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`;
    const evidenceResource = usePrivateData(evidenceEndpoint);
    const evidenceRoot = isRecord(evidenceResource.data) && isRecord(evidenceResource.data.data) ? evidenceResource.data.data : evidenceResource.data;
    const evidenceImages = getArray(evidenceRoot, 'items', 'media').filter((item) => (
        getText(item, 'category') !== 'body'
        && getText(item, 'date', 'activityDate') === date
        && getText(item, 'type', 'contentType', 'content_type').toLowerCase().startsWith('image/')
    ));

    const changeActivityDate = (nextDate: string) => {
        setDate(nextDate);
        setSelectedEvidenceIds([]);
        setImageValue(''); setImageUnit(''); setImageNotes('');
        setImageNotice(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const numeric = Number(value);
        if (!date || !value || !Number.isFinite(numeric) || numeric <= 0 || !unit || busy) return;
        const payload = { activityDate: date, originalValue: numeric, originalUnit: unit, notes: notes.trim() || undefined, isPrimary: primary };
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
            setValue(''); setNotes(''); setPrimary(false); reload();
        } catch (cause) {
            setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The measurement could not be saved.' });
        } finally { setBusy(false); }
    };

    const handleImageCandidate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const numeric = Number(imageValue);
        const evidenceAssetIds = [...new Set(selectedEvidenceIds)].sort();
        if (!date || !imageValue || !Number.isFinite(numeric) || numeric <= 0 || !imageUnit || evidenceAssetIds.length === 0 || imageBusy) return;
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
        setImageBusy(true); setImageNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setImageNotice({ kind: 'success', text: 'Image-derived candidate saved. It is pending your confirmation and is not charted.' });
            setImageValue(''); setImageUnit(''); setImageNotes(''); setSelectedEvidenceIds([]); reload();
        } catch (cause) {
            setImageNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The candidate could not be saved.' });
        } finally { setImageBusy(false); }
    };

    const confirmReading = async (id: string) => {
        if (!id || confirmingId) return;
        const payload = { id, confirmationStatus: 'confirmed' };
        const fingerprint = JSON.stringify(payload);
        setConfirmingId(id); setConfirmNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, {
                method: 'PATCH',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            idempotency.complete(fingerprint);
            setConfirmNotice({ kind: 'success', text: 'Reading confirmed. It remains off the chart until you choose Make primary.' });
            reload();
        } catch (cause) {
            setConfirmNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The reading could not be confirmed.' });
        } finally { setConfirmingId(''); }
    };

    const setPrimaryEntry = async (id: string) => {
        if (!id || busy) return;
        const payload = { id, isPrimary: true };
        const fingerprint = JSON.stringify(payload);
        setBusy(true); setNotice(null);
        try {
            await requestPrivateJson(endpointBySection.weight, { method: 'PATCH', headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) }, body: JSON.stringify(payload) });
            idempotency.complete(fingerprint);
            setNotice({ kind: 'success', text: 'Primary measurement updated.' }); reload();
        } catch (cause) {
            setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The primary measurement could not be updated.' });
        } finally { setBusy(false); }
    };

    return <>
        <Panel title="Record a measurement" description="Save the original value and unit. Choose whether this manual entry should be the primary measurement.">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Activity date <span className="text-xs font-normal text-stone-500">IST</span><input required type="date" value={date} onChange={(event) => changeActivityDate(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" /></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Original value<input required type="number" inputMode="decimal" step="any" min="0.01" max="1000" value={value} onChange={(event) => setValue(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Enter a value" /></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Original unit<select required value={unit} onChange={(event) => setUnit(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="">Choose a unit</option><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="st">Stones (st)</option></select></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Notes <span className="text-xs font-normal text-stone-500">optional</span><input maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional note" /></label>
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-stone-800 lg:col-span-3"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} className="h-4 w-4 accent-stone-950" />Set this as the primary measurement</label>
                <button type="submit" disabled={busy || !date || !value || !unit || !Number.isFinite(Number(value)) || Number(value) <= 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Plus size={16} aria-hidden="true" />{busy ? 'Saving…' : 'Save measurement'}</button>
            </form>
            {notice && <div className="mt-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
        </Panel>
        <Panel title="Image-derived candidate" description="Transcribe the value and unit yourself. The selected same-day photo is provenance only; no OCR or value inference is used.">
            <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Image-based entries stay pending owner confirmation and cannot become primary or affect the chart until confirmed.</div>
            <StatusPanel state={evidenceResource.state} error={evidenceResource.error} onRetry={evidenceResource.reload} />
            {evidenceResource.state === 'ready' && evidenceImages.length === 0 && <EmptyState title="No same-day weight evidence images">Upload or choose a non-body private image for {dateLabel(date, { month: 'short', day: 'numeric', year: 'numeric' })} in the <Link href="/samik-admin/body" className="font-bold underline underline-offset-2">private media workspace</Link> using General or Habit evidence. Body photos are excluded.</EmptyState>}
            {evidenceResource.state === 'ready' && evidenceImages.length > 0 && <fieldset className="mb-4 space-y-2"><legend className="mb-2 text-sm font-bold text-stone-800">Same-day private images for provenance</legend>{evidenceImages.map((item, index) => {
                const id = getText(item, 'id', 'assetId');
                const checked = selectedEvidenceIds.includes(id);
                return <label key={id || `evidence-${index}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3"><input type="checkbox" disabled={!id || imageBusy} checked={checked} onChange={(event) => setSelectedEvidenceIds((current) => event.target.checked ? [...new Set([...current, id])] : current.filter((assetId) => assetId !== id))} className="mt-1 h-4 w-4 accent-stone-950" /><span className="min-w-0"><span className="block font-bold text-stone-900">{getText(item, 'title', 'displayName') || 'Private image'}</span><span className="mt-1 block text-xs text-stone-600">{dateLabel(getValue(item, 'date'), { month: 'short', day: 'numeric', year: 'numeric' })} IST · {getText(item, 'type', 'contentType').replace('image/', '').toUpperCase()}{getValue(item, 'byteSize') ? ` · ${Math.round(Number(getValue(item, 'byteSize')) / 1024)} KB` : ''}</span></span></label>;
            })}</fieldset>}
            {evidenceResource.state === 'ready' && evidenceImages.length > 0 && <form onSubmit={handleImageCandidate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Transcribed value<input required type="number" inputMode="decimal" step="any" min="0.01" max="1000" value={imageValue} onChange={(event) => setImageValue(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Enter the reading yourself" /></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Unit<select required value={imageUnit} onChange={(event) => setImageUnit(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="">Choose a unit</option><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="st">Stones (st)</option></select></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800 lg:col-span-1">Notes <span className="text-xs font-normal text-stone-500">optional</span><input maxLength={2000} value={imageNotes} onChange={(event) => setImageNotes(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Optional note" /></label>
                <button type="submit" disabled={imageBusy || !date || !imageValue || !imageUnit || selectedEvidenceIds.length === 0 || !Number.isFinite(Number(imageValue)) || Number(imageValue) <= 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700">{imageBusy ? 'Saving…' : 'Save pending candidate'}</button>
            </form>}
            {imageNotice && <div className="mt-4"><Notice kind={imageNotice.kind}>{imageNotice.text}</Notice></div>}
        </Panel>
        <Panel title="Recorded weight" description="Only explicit confirmed primary measurements are plotted. Missing dates come from the same confirmed-primary set; no values are filled in.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && chartEntries.length === 0 && <EmptyState title="No confirmed primary measurements">Pending, rejected, and non-primary entries stay out of the chart. Confirm a candidate, then choose Make primary.</EmptyState>}
            {state === 'ready' && chartEntries.length > 0 && <>
                {latest && <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"><span className="font-bold text-stone-800">Latest confirmed primary:</span> <span className="font-semibold text-stone-700">{getText(latest, 'originalValue')} {getText(latest, 'originalUnit')}</span></div>}
                <WeightChart entries={chartEntries} unit="kg" />
            </>}
            {state === 'ready' && missingDates.length > 0 && <details className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3"><summary className="cursor-pointer text-sm font-bold text-stone-800">Dates without a confirmed primary measurement ({missingDates.length})</summary><ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600 sm:grid-cols-4 lg:grid-cols-7">{missingDates.map((missingDate) => <li key={missingDate}>{dateLabel(missingDate, { month: 'short', day: 'numeric', year: 'numeric' })}</li>)}</ul></details>}
            {firstInRange && <p className="mt-2 text-xs text-stone-500">First confirmed primary in range: {dateLabel(getValue(firstInRange, 'date'), { month: 'short', day: 'numeric', year: 'numeric' })}.</p>}
        </Panel>
        <Panel title="Measurement history" description="All entries remain in history. Image-derived candidates need an explicit confirmation; only confirmed readings may be selected as primary.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && entries.length === 0 && <EmptyState title="No measurements available">Saved manual entries and image-derived candidates will appear here.</EmptyState>}
            {state === 'ready' && entries.length > 0 && <ul className="divide-y divide-stone-200">{entries.slice().reverse().map((entry, index) => {
                const { record, date: itemDate, originalValue, originalUnit, isPrimary, confirmationStatus, source, id } = entry;
                const statusStyle = confirmationStatus === 'confirmed' ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : confirmationStatus === 'rejected' ? 'border-rose-300 bg-rose-100 text-rose-900' : 'border-amber-300 bg-amber-100 text-amber-900';
                const statusLabel = confirmationStatus === 'pending' ? 'Pending owner confirmation' : confirmationStatus ? confirmationStatus[0].toUpperCase() + confirmationStatus.slice(1) : 'Status not returned';
                return <li key={id || `${itemDate}-${index}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-extrabold tabular-nums text-stone-950">{originalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {originalUnit}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusStyle}`}>{statusLabel}</span>{isPrimary && confirmationStatus === 'confirmed' && <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">Primary</span>}{confirmationStatus === 'confirmed' && !isPrimary && <span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">Non-primary</span>}</div><p className="mt-1 text-sm text-stone-600">{dateLabel(itemDate, { month: 'short', day: 'numeric', year: 'numeric' })} IST · {source === 'image' ? 'Image provenance · owner-transcribed' : source === 'manual' ? 'Manual entry' : `Source: ${source}`}{getText(record, 'notes') ? ` · ${getText(record, 'notes')}` : ''}</p></div><div className="flex flex-wrap gap-2">{confirmationStatus === 'pending' && <button type="button" disabled={!id || Boolean(confirmingId)} onClick={() => void confirmReading(id)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700">{confirmingId === id ? 'Confirming…' : 'Confirm reading'}</button>}{confirmationStatus === 'confirmed' && !isPrimary && <button type="button" disabled={!id || busy} onClick={() => void setPrimaryEntry(id)} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">Make primary</button>}</div></li>;
            })}</ul>}
            {confirmNotice && <div className="mt-4"><Notice kind={confirmNotice.kind}>{confirmNotice.text}</Notice></div>}
        </Panel>
    </>;
}

function WeightChart({ entries, unit }: { entries: { record: JsonRecord; value: number; timestamp: number; date: unknown }[]; unit: string }) {
    const width = 760;
    const height = 300;
    const pad = { top: 20, right: 24, bottom: 42, left: 55 };
    const observedMin = Math.min(...entries.map((item) => item.value));
    const observedMax = Math.max(...entries.map((item) => item.value));
    const spread = Math.max(observedMax - observedMin, Math.max(Math.abs(observedMax) * 0.04, 1));
    const minY = observedMin - spread * 0.15;
    const maxY = observedMax + spread * 0.15;
    const minTime = entries[0].timestamp;
    const maxTime = entries[entries.length - 1].timestamp;
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const points = entries.map((item, index) => ({
        x: pad.left + (maxTime === minTime ? plotWidth / 2 : ((item.timestamp - minTime) / (maxTime - minTime)) * plotWidth),
        y: pad.top + ((maxY - item.value) / (maxY - minY)) * plotHeight,
        item,
        key: getText(item.record, 'id') || `${item.timestamp}-${index}`,
    }));
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const ticks = [0, 1, 2, 3].map((index) => maxY - ((maxY - minY) * index) / 3);
    const first = entries[0];
    const last = entries[entries.length - 1];
    return <figure className="w-full" aria-labelledby="weight-chart-title">
        <figcaption id="weight-chart-title" className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600"><span className="font-semibold">Recorded values over time</span><span>{entries.length} {entries.length === 1 ? 'record' : 'records'}{unit ? ` · ${unit}` : ''}</span></figcaption>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-50 p-2 sm:p-4"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Weight chart showing ${entries.length} recorded ${entries.length === 1 ? 'measurement' : 'measurements'}${unit ? ` in ${unit}` : ''}`} className="min-w-[540px] w-full">
            {ticks.map((tick, index) => {
                const y = pad.top + ((maxY - tick) / (maxY - minY)) * plotHeight;
                return <g key={index}><line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#d6d3d1" strokeDasharray="3 5" /><text x={pad.left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#57534e">{tick.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text></g>;
            })}
            {entries.length > 1 && <path d={path} fill="none" stroke="#0c0a09" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
            {points.map(({ x, y, item, key }) => <g key={key}><circle cx={x} cy={y} r="6" fill="#fff" stroke="#0c0a09" strokeWidth="3"><title>{`${item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''} · ${dateLabel(item.date, { month: 'short', day: 'numeric', year: 'numeric' })}`}</title></circle></g>)}
            <text x={pad.left} y={height - 12} fontSize="11" fill="#57534e">{dateLabel(first.date)}</text>
            <text x={width - pad.right} y={height - 12} textAnchor="end" fontSize="11" fill="#57534e">{dateLabel(last.date)}</text>
        </svg></div>
        <p className="mt-2 text-xs text-stone-500">The line connects observations only; intermediate dates are not estimated.</p>
    </figure>;
}

function BodyPlaybackLane({ items }: { items: JsonRecord[] }) {
    const chronologicalItems = useMemo(() => items.slice().sort((left, right) => {
        const leftDate = getText(left, 'date', 'activityDate');
        const rightDate = getText(right, 'date', 'activityDate');
        const byDate = leftDate.localeCompare(rightDate);
        if (byDate !== 0) return byDate;
        const leftTime = timestampForActivityDate(getValue(left, 'uploadedAt', 'createdAt'));
        const rightTime = timestampForActivityDate(getValue(right, 'uploadedAt', 'createdAt'));
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime - rightTime;
        return getText(left, 'id').localeCompare(getText(right, 'id'));
    }), [items]);
    const [position, setPosition] = useState(0);
    const [media, setMedia] = useState<{ itemId: string; url: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [speed, setSpeed] = useState('1');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const currentItem = chronologicalItems[position];
    const itemId = currentItem ? getText(currentItem, 'id', 'mediaId', 'key') : '';
    const currentType = getText(currentItem ?? {}, 'type', 'mediaType', 'kind').toLowerCase();
    const isVideo = currentType.includes('video');
    const currentDate = currentItem ? getText(currentItem, 'date', 'activityDate', 'uploadedAt') : '';
    const speedValue = Number(speed);

    useEffect(() => {
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreference = () => setReducedMotion(preference.matches);
        updatePreference();
        preference.addEventListener('change', updatePreference);
        return () => preference.removeEventListener('change', updatePreference);
    }, []);

    useEffect(() => {
        if (position >= chronologicalItems.length) {
            setPosition(Math.max(chronologicalItems.length - 1, 0));
            setMedia(null);
            setPlaying(false);
        }
    }, [chronologicalItems.length, position]);

    const loadAt = useCallback(async (nextPosition: number, startAfterLoad: boolean) => {
        const item = chronologicalItems[nextPosition];
        const id = item ? getText(item, 'id', 'mediaId', 'key') : '';
        if (!item || !id || loading) return;
        setPosition(nextPosition);
        setMedia(null);
        setError('');
        setNotice('');
        setLoading(true);
        try {
            const result = await requestPrivateJson(`${endpointBySection.body}?id=${encodeURIComponent(id)}`);
            const response = isRecord(result) ? result : {};
            const url = getText(response, 'url');
            if (!url) throw new Error('The media service did not return a playable item.');
            setMedia({ itemId: id, url });
            if (startAfterLoad && reducedMotion) {
                setPlaying(false);
                setNotice('Reduced motion is enabled. Use Previous and Next to step through items manually.');
            } else {
                setPlaying(startAfterLoad);
            }
        } catch {
            setPlaying(false);
            setError('This item could not be loaded. Its short-lived link may have expired, or this format may not play in this browser. Refresh to request a new link.');
        } finally { setLoading(false); }
    }, [chronologicalItems, loading, reducedMotion]);

    const advance = useCallback(async () => {
        if (position >= chronologicalItems.length - 1) {
            setPlaying(false);
            setNotice('Reached the most recent available item.');
            return;
        }
        await loadAt(position + 1, true);
    }, [loadAt, position, chronologicalItems.length]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.playbackRate = speedValue;
            if (playing && !reducedMotion) {
                void video.play().catch(() => {
                    setPlaying(false);
                    setNotice('Playback could not start automatically. Use the video controls to start it.');
                });
            } else {
                video.pause();
            }
        }
    }, [media, playing, reducedMotion, speedValue]);

    useEffect(() => {
        if (!playing || reducedMotion || !media || media.itemId !== itemId || isVideo) return;
        const timer = window.setTimeout(() => { void advance(); }, 3000 / speedValue);
        return () => window.clearTimeout(timer);
    }, [playing, reducedMotion, media, itemId, isVideo, speedValue, advance]);

    useEffect(() => {
        if (!reducedMotion) return;
        setPlaying(false);
        setNotice('Reduced motion is enabled. Automatic advance is paused; use Previous and Next to step manually.');
    }, [reducedMotion]);

    const startOrPause = () => {
        if (!currentItem || !itemId || loading) return;
        if (playing) {
            setPlaying(false);
            videoRef.current?.pause();
            return;
        }
        if (media?.itemId === itemId) {
            if (reducedMotion) {
                setNotice('Reduced motion is enabled. Use Previous and Next to step manually.');
                return;
            }
            setNotice('');
            setPlaying(true);
            return;
        }
        void loadAt(position, true);
    };

    const stepTo = (nextPosition: number) => {
        if (loading || nextPosition < 0 || nextPosition >= chronologicalItems.length) return;
        setPlaying(false);
        setMedia(null);
        setError('');
        setPosition(nextPosition);
        setNotice('Item selected. Press Play to request its media.');
    };

    const reportPlaybackError = () => {
        setPlaying(false);
        setMedia(null);
        setError('This item could not be played. Its short-lived link may have expired, or this format may not be supported. Refresh to request a new link.');
    };

    if (chronologicalItems.length === 0) {
        return <Panel title="Day one to current" description="Chronological playback uses only media records returned by the private API."><EmptyState title="No timeline items available">Returned media items will appear here in date order. No dates or records are filled in.</EmptyState></Panel>;
    }

    const firstDate = getText(chronologicalItems[0], 'date', 'activityDate');
    const selectedMediaIsReady = media?.itemId === itemId;
    return <Panel title="Day one to current" description="Chronological playback requests one item at a time. Nothing is preloaded; gaps between recorded dates remain empty.">
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:flex-row sm:items-center">
            <div><p className="text-sm font-bold text-stone-900">{dateLabel(firstDate, { month: 'short', day: 'numeric', year: 'numeric' })} → {dateLabel(localDateValue(), { month: 'short', day: 'numeric', year: 'numeric' })} IST</p><p className="mt-1 text-xs text-stone-600">{position + 1} of {chronologicalItems.length} returned items{currentDate ? ` · ${dateLabel(currentDate, { month: 'short', day: 'numeric', year: 'numeric' })} IST` : ''}{currentType ? ` · ${currentType}` : ''}</p></div>
            <label className="flex items-center gap-2 text-sm font-bold text-stone-800">Speed<select value={speed} onChange={(event) => setSpeed(event.target.value)} className="min-h-10 rounded-lg border border-stone-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid min-h-[280px] place-items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100 p-3 sm:min-h-[400px]">
                {loading && <p className="flex items-center gap-2 text-sm font-semibold text-stone-600" role="status"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Requesting this item…</p>}
                {!loading && !selectedMediaIsReady && <div className="text-center"><Play size={26} className="mx-auto text-stone-500" aria-hidden="true" /><p className="mt-2 font-bold text-stone-800">Media is not loaded</p><p className="mt-1 text-xs text-stone-600">Press Play to request only this item.</p></div>}
                {!loading && selectedMediaIsReady && currentItem && (isVideo
                    ? <video ref={videoRef} key={media.itemId} controls playsInline preload="none" src={media.url} className="max-h-[70vh] max-w-full rounded-lg" aria-label="Timeline media item" onEnded={() => { if (reducedMotion) setPlaying(false); else void advance(); }} onError={reportPlaybackError} />
                    : <Image unoptimized width={1200} height={900} sizes="(max-width: 1024px) 100vw, 75vw" src={media.url} alt={getText(currentItem, 'title', 'label') || `Timeline item ${position + 1}`} className="max-h-[70vh] max-w-full rounded-lg object-contain" loading="eager" onError={reportPlaybackError} />)}
            </div>
            <div className="flex flex-row items-center justify-center gap-2 lg:flex-col lg:items-stretch">
                <button type="button" disabled={position === 0 || loading} onClick={() => stepTo(position - 1)} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">Previous</button>
                <button type="button" disabled={loading} onClick={startOrPause} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Play size={15} aria-hidden="true" />{playing ? 'Pause' : 'Play'}</button>
                <button type="button" disabled={position >= chronologicalItems.length - 1 || loading} onClick={() => stepTo(position + 1)} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">Next</button>
                {error && <button type="button" disabled={loading} onClick={() => void loadAt(position, false)} className="min-h-11 rounded-lg border border-rose-300 bg-rose-50 px-3 text-sm font-bold text-rose-900 hover:bg-rose-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700">Refresh current item</button>}
                {reducedMotion && <p className="text-center text-xs leading-5 text-stone-600 lg:mt-2">Reduced motion is on. Manual stepping is available; automatic advance is paused.</p>}
            </div>
        </div>
        {error && <div className="mt-3"><Notice kind="error">{error}</Notice></div>}
        {notice && !error && <p className="mt-3 text-sm text-stone-600" role="status">{notice}</p>}
    </Panel>;
}

function BodySection() {
    const { data, state, error, reload } = usePrivateData(endpointBySection.body);
    const items = getArray(data, 'items', 'media', 'entries');
    const [playing, setPlaying] = useState<Record<string, { busy: boolean; url?: string; error?: string }>>({});
    const [file, setFile] = useState<File | null>(null);
    const [activityDate, setActivityDate] = useState(localDateValue);
    const [category, setCategory] = useState('body');
    const [pose, setPose] = useState('');
    const [privateNotes, setPrivateNotes] = useState('');
    const [uploadBusy, setUploadBusy] = useState(false);
    const idempotency = useIdempotencyKeys();
    const [uploadIntentFingerprint, setUploadIntentFingerprint] = useState('');
    const [finalizeAssetId, setFinalizeAssetId] = useState('');
    const [uploadNotice, setUploadNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [freshKeyNeeded, setFreshKeyNeeded] = useState(false);

    const playbackError = (id: string) => {
        setPlaying((current) => ({ ...current, [id]: { busy: false, error: 'This item could not be played. Its short-lived link may have expired, or this format may not be supported. Refresh to request a new link.' } }));
    };

    const loadMedia = async (item: JsonRecord, refresh = false) => {
        const id = getText(item, 'id', 'mediaId', 'key');
        if (!id || playing[id]?.busy || (playing[id]?.url && !refresh)) return;
        setPlaying((current) => ({ ...current, [id]: { busy: true } }));
        try {
            const result = await requestPrivateJson(`${endpointBySection.body}?id=${encodeURIComponent(id)}`);
            const response = isRecord(result) ? result : {};
            const url = getText(response, 'url', 'mediaUrl', 'src');
            if (!url) throw new Error('No media URL was returned for this item.');
            setPlaying((current) => ({ ...current, [id]: { busy: false, url } }));
        } catch {
            setPlaying((current) => ({ ...current, [id]: { busy: false, error: 'This item could not be loaded. Its short-lived link may have expired or the format may not be supported. Refresh to request a new link.' } }));
        }
    };

    const finalizeUpload = async (assetId: string, busyAlready = false, intentFingerprint = uploadIntentFingerprint) => {
        if (!assetId || (uploadBusy && !busyAlready)) return;
        if (!busyAlready) setUploadBusy(true);
        setUploadNotice(null);
        try {
            await requestPrivateJson(endpointBySection.body, { method: 'PATCH', body: JSON.stringify({ action: 'finalize', assetId }) });
            setFinalizeAssetId('');
            if (intentFingerprint) idempotency.complete(intentFingerprint);
            setUploadIntentFingerprint('');
            setFile(null); setPose(''); setPrivateNotes('');
            setUploadNotice({ kind: 'success', text: 'Private media upload verified and added.' });
            reload();
        } catch (cause) {
            setUploadNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The private upload could not be finalized.' });
            setFinalizeAssetId(assetId);
        } finally { if (!busyAlready) setUploadBusy(false); }
    };

    const uploadFile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!file || uploadBusy) return;
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
        if (!allowedTypes.includes(file.type)) {
            setUploadNotice({ kind: 'error', text: 'Choose a JPEG, PNG, WebP, MP4, or WebM file.' });
            return;
        }
        const maxBytes = file.type.startsWith('image/') ? 15 * 1024 * 1024 : 100 * 1024 * 1024;
        if (file.size <= 0 || file.size > maxBytes) {
            setUploadNotice({ kind: 'error', text: 'This file is outside the supported size limit.' });
            return;
        }
        const payload = { action: 'initiate', localDate: activityDate, category, pose: category === 'body' ? (pose || null) : null, privateNotes: privateNotes.trim() || undefined, displayName: file.name, contentType: file.type, byteSize: file.size };
        const fingerprint = JSON.stringify({ ...payload, fileLastModified: file.lastModified });
        setUploadIntentFingerprint(fingerprint);
        setUploadBusy(true); setUploadNotice(null); setFinalizeAssetId(''); setFreshKeyNeeded(false);
        let assetId = '';
        try {
            const initiation = await requestPrivateJson(endpointBySection.body, {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(payload),
            });
            const upload = isRecord(initiation) && isRecord(initiation.data) ? initiation.data : isRecord(initiation) ? initiation : {};
            assetId = getText(upload, 'assetId');
            const uploadUrl = getText(upload, 'uploadUrl');
            const uploadStatus = getText(upload, 'status');
            if (assetId && uploadStatus === 'ready' && !uploadUrl) {
                idempotency.complete(fingerprint);
                setUploadIntentFingerprint('');
                setFile(null); setPose(''); setPrivateNotes('');
                setUploadNotice({ kind: 'success', text: 'This upload is already verified and added.' });
                reload();
                return;
            }
            const method = getText(upload, 'method') || 'PUT';
            const headersValue = getValue(upload, 'requiredHeaders');
            if (!assetId || !uploadUrl || method !== 'PUT' || !isRecord(headersValue)) throw new Error('The upload service did not return a valid private upload request.');
            const signedUrl = new URL(uploadUrl);
            if (signedUrl.protocol !== 'https:' || signedUrl.username || signedUrl.password) throw new Error('The upload service returned an invalid private upload request.');
            const requiredHeaders: Record<string, string> = {};
            for (const [name, value] of Object.entries(headersValue)) {
                if (typeof value !== 'string') throw new Error('The upload service returned invalid required headers.');
                requiredHeaders[name] = value;
            }
            const putResponse = await fetch(signedUrl.toString(), { method: 'PUT', headers: requiredHeaders, body: file, cache: 'no-store', credentials: 'omit', redirect: 'error' });
            if (!putResponse.ok) throw new Error('The private media upload did not complete. Try starting a new upload.');
            setFinalizeAssetId(assetId);
            await finalizeUpload(assetId, true, fingerprint);
        } catch (cause) {
            if (assetId) setFinalizeAssetId('');
            const errorText = cause instanceof Error ? cause.message : 'The private media upload could not be completed.';
            if (/MEDIA_UPLOAD_NOT_RETRYABLE|fresh key/i.test(errorText)) {
                idempotency.complete(fingerprint);
                setUploadIntentFingerprint('');
                setFreshKeyNeeded(true);
                setUploadNotice({ kind: 'error', text: 'This upload intent can’t be retried with its previous key. Choose Start again to retry with a fresh key.' });
            } else {
                // Keep the idempotency key for transient/network failures so a retry can resume the same pending asset.
                setUploadNotice({ kind: 'error', text: errorText });
            }
        } finally { setUploadBusy(false); }
    };

    return <>
        <Panel title="Add private media" description="Upload a supported image or video to private storage. The file is not published or shared by this action.">
            <form onSubmit={uploadFile} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">File<input required type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-bold" /><span className="text-xs font-normal text-stone-500">JPEG, PNG, WebP, MP4, WebM · up to 15 MB for images, 100 MB for videos</span></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Activity date <span className="text-xs font-normal text-stone-500">IST</span><input required type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" /></label>
                <label className="grid gap-1.5 text-sm font-bold text-stone-800">Category<select value={category} onChange={(event) => { setCategory(event.target.value); if (event.target.value !== 'body') setPose(''); }} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="body">Body</option><option value="habit_evidence">Habit evidence</option><option value="general">General</option></select></label>
                {category === 'body' && <label className="grid gap-1.5 text-sm font-bold text-stone-800">Pose <span className="text-xs font-normal text-stone-500">optional</span><select value={pose} onChange={(event) => setPose(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="">Not specified</option><option value="front">Front</option><option value="back">Back</option><option value="left_side">Left side</option><option value="right_side">Right side</option><option value="other">Other</option></select></label>}
                <label className="grid gap-1.5 text-sm font-bold text-stone-800 sm:col-span-2 lg:col-span-2">Private notes <span className="text-xs font-normal text-stone-500">optional</span><textarea value={privateNotes} onChange={(event) => setPrivateNotes(event.target.value)} maxLength={2000} rows={2} className="rounded-lg border border-stone-300 px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="Notes stay private" /></label>
                <div className="flex items-end"><button type="submit" disabled={!file || uploadBusy || !activityDate || Boolean(finalizeAssetId)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Plus size={16} aria-hidden="true" />{uploadBusy ? 'Uploading…' : freshKeyNeeded ? 'Start again' : 'Upload privately'}</button></div>
            </form>
            {uploadNotice && <div className="mt-4"><Notice kind={uploadNotice.kind}>{uploadNotice.text}</Notice></div>}
            {finalizeAssetId && !uploadBusy && <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-sm text-stone-700">The file is uploaded; final verification is still pending.</p><button type="button" onClick={() => void finalizeUpload(finalizeAssetId, false, uploadIntentFingerprint)} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-100">Retry verification</button></div>}
        </Panel>
        {state === 'ready' && <BodyPlaybackLane items={items} />}
        <Panel title="Body gallery" description="Media is requested for one item only after you choose Play. No image or video is preloaded in the gallery.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && items.length === 0 && <EmptyState title="No media available">Items will appear here when private media metadata is returned.</EmptyState>}
            {state === 'ready' && items.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, index) => {
                    const id = getText(item, 'id', 'mediaId', 'key');
                    const playback = id ? playing[id] : undefined;
                    const kind = getText(item, 'type', 'mediaType', 'kind').toLowerCase();
                    const isVideo = kind.includes('video');
                    const title = getText(item, 'title', 'label', 'caption') || 'Media item';
                    return <article key={id || `${title}-${index}`} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                        <div className="grid aspect-[4/3] place-items-center bg-stone-100 p-3">
                            {!playback?.url && <div className="text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-stone-800 shadow-sm"><Play size={20} aria-hidden="true" /></div><p className="mt-2 text-xs font-semibold text-stone-500">Media remains unloaded</p></div>}
                            {playback?.url && (isVideo ? <video controls playsInline preload="none" src={playback.url} className="max-h-full max-w-full rounded-lg" aria-label={title} onError={() => id && playbackError(id)} /> : <Image unoptimized width={640} height={480} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" src={playback.url} alt={title} className="max-h-full max-w-full rounded-lg object-contain" loading="eager" onError={() => id && playbackError(id)} />)}
                        </div>
                        <div className="p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-stone-900">{title}</h3><p className="mt-1 text-xs text-stone-600">{dateLabel(getValue(item, 'date', 'createdAt'), { month: 'short', day: 'numeric', year: 'numeric' })}{kind ? ` · ${kind}` : ''}{getText(item, 'pose') ? ` · ${getText(item, 'pose').replaceAll('_', ' ')}` : ''}</p></div>
                            <button type="button" disabled={!id || playback?.busy || Boolean(playback?.url && !playback?.error)} onClick={() => void loadMedia(item, Boolean(playback?.error))} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Play size={14} aria-hidden="true" />{playback?.busy ? 'Loading…' : playback?.error ? 'Refresh' : playback?.url ? 'Loaded' : 'Play'}</button>
                        </div>{!id && <p className="mt-2 text-xs text-amber-800">This item has no media identifier.</p>}{playback?.error && <p className="mt-2 text-xs text-rose-800" role="alert">{playback.error}</p>}</div>
                    </article>;
                })}
            </div>}
        </Panel>
    </>;
}

type SummaryDraft = { title: string; body: string };
type SummaryMediaDraftState = { state: 'loading' | 'ready' | 'error'; media: JsonRecord[]; error?: string };
type PreparedSummaryDerivative = { sourceMediaAssetId: string; approvedMediaAssetId: string; previewUrl: string };
type ApprovedSummarySnapshot = { revisionNumber: number; title: string; body: string; mediaIds: string[] };
function SummariesSection() {
    const { data, state, error, reload } = usePrivateData(endpointBySection.summaries);
    const [draftDate, setDraftDate] = useState(localDateValue);
    const [draftEdits, setDraftEdits] = useState<Record<string, SummaryDraft>>({});
    const [exactApproval, setExactApproval] = useState<Record<string, boolean>>({});
    const [approvalIds, setApprovalIds] = useState<Record<string, string>>({});
    const [approvedSnapshots, setApprovedSnapshots] = useState<Record<string, ApprovedSummarySnapshot>>({});
    const [mediaState, setMediaState] = useState<Record<string, SummaryMediaDraftState>>({});
    const [preparedMedia, setPreparedMedia] = useState<Record<string, PreparedSummaryDerivative[]>>({});
    const [selectedDerivativeIds, setSelectedDerivativeIds] = useState<Record<string, string[]>>({});
    const [busyId, setBusyId] = useState('');
    const idempotency = useIdempotencyKeys();
    const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const drafts = getArray(dataRoot, 'drafts').filter((draft) => !['published', 'sent', 'delivered'].includes(getText(draft, 'state', 'status').toLowerCase()));
    const approvals = getArray(dataRoot, 'approvals');
    const publications = getArray(dataRoot, 'publications');
    const history = getArray(dataRoot, 'history');

    const operation = async (id: string, action: 'create' | 'edit' | 'approve' | 'publish', body: JsonRecord, method: 'POST' | 'PATCH' = 'POST') => {
        const requestBody = { action, ...body };
        const fingerprint = JSON.stringify(requestBody);
        setBusyId(id || action); setNotice(null);
        try {
            const result = await requestPrivateJson(endpointBySection.summaries, {
                method,
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify(requestBody),
            });
            idempotency.complete(fingerprint);
            setNotice({ kind: 'success', text: action === 'publish' ? 'Approved snapshot published.' : action === 'approve' ? 'Exact text and selected derivatives approved.' : action === 'create' ? 'Draft created.' : 'New draft revision saved.' });
            reload();
            return result;
        } catch (cause) {
            setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The summary action could not be completed.' });
            return null;
        } finally { setBusyId(''); }
    };

    const createDraft = async () => {
        await operation('create', 'create', { activityDate: draftDate });
    };

    const invalidateApproval = (id: string) => {
        setExactApproval((current) => ({ ...current, [id]: false }));
        setApprovalIds((current) => { const next = { ...current }; delete next[id]; return next; });
        setApprovedSnapshots((current) => { const next = { ...current }; delete next[id]; return next; });
    };

    const loadSummaryMedia = async (draftId: string, activityDate: string) => {
        invalidateApproval(draftId);
        setSelectedDerivativeIds((current) => { const next = { ...current }; delete next[draftId]; return next; });
        setMediaState((current) => ({ ...current, [draftId]: { state: 'loading', media: current[draftId]?.media ?? [] } }));
        try {
            const result = await requestPrivateJson(`/api/samik-admin/summaries/media?activityDate=${encodeURIComponent(activityDate)}`);
            const media = getArray(result, 'media');
            const linkedDerivatives = media.flatMap((item) => {
                const sourceMediaAssetId = getText(item, 'sourceMediaAssetId');
                return getArray(item, 'preparedDerivatives').map((derivative) => ({
                    sourceMediaAssetId,
                    approvedMediaAssetId: getText(derivative, 'approvedMediaAssetId'),
                    previewUrl: getText(derivative, 'previewUrl'),
                })).filter((derivative) => derivative.sourceMediaAssetId && derivative.approvedMediaAssetId && derivative.previewUrl);
            });
            setMediaState((current) => ({ ...current, [draftId]: { state: 'ready', media } }));
            setPreparedMedia((current) => ({ ...current, [draftId]: linkedDerivatives }));
        } catch (cause) {
            setMediaState((current) => ({ ...current, [draftId]: {
                state: 'error', media: [], error: cause instanceof Error ? cause.message : 'Images could not be loaded.',
            } }));
        }
    };

    const prepareSummaryDerivative = async (draftId: string, activityDate: string, sourceMediaAssetId: string) => {
        const fingerprint = JSON.stringify({ action: 'prepare-summary-derivative', activityDate, sourceMediaAssetId });
        setBusyId(`media:${sourceMediaAssetId}`); setNotice(null);
        try {
            const result = await requestPrivateJson('/api/samik-admin/summaries/media', {
                method: 'POST',
                headers: { 'Idempotency-Key': idempotency.keyFor(fingerprint) },
                body: JSON.stringify({ activityDate, sourceMediaAssetId }),
            });
            idempotency.complete(fingerprint);
            const record = isRecord(result) && isRecord(result.data) ? result.data : result;
            if (!isRecord(record)) throw new Error('The sanitized preview was not returned.');
            const approvedMediaAssetId = getText(record, 'approvedMediaAssetId');
            const previewUrl = getText(record, 'previewUrl');
            if (!approvedMediaAssetId || !previewUrl) throw new Error('The sanitized preview was not returned.');
            setPreparedMedia((current) => ({
                ...current,
                [draftId]: [...(current[draftId] ?? []).filter((item) => item.sourceMediaAssetId !== sourceMediaAssetId), { sourceMediaAssetId, approvedMediaAssetId, previewUrl }],
            }));
            setNotice({ kind: 'success', text: 'Private sanitized preview is ready. Select it if you want it in the public post.' });
        } catch (cause) {
            setNotice({ kind: 'error', text: cause instanceof Error ? cause.message : 'The private derivative could not be prepared.' });
        } finally { setBusyId(''); }
    };

    const saveEdit = async (draft: JsonRecord, id: string, title: string, body: string) => {
        const draftId = getText(draft, 'draftId', 'id');
        const revisionNumber = getNumber(draft, 'revisionNumber');
        if (!draftId || revisionNumber === null || !title.trim()) return;
        const result = await operation(id, 'edit', { draftId, revisionNumber, title, body }, 'PATCH');
        if (result) {
            invalidateApproval(id);
            setDraftEdits((current) => { const next = { ...current }; delete next[id]; return next; });
        }
    };

    const approveRevision = async (draft: JsonRecord, id: string, revisionNumber: number, title: string, body: string) => {
        const draftId = getText(draft, 'draftId', 'id');
        if (!draftId || !exactApproval[id]) return;
        const mediaIds = [...new Set(selectedDerivativeIds[id] ?? [])].sort();
        const selected = new Set(mediaIds);
        const publicMedia = (preparedMedia[id] ?? [])
            .filter((item) => selected.has(item.approvedMediaAssetId))
            .map(({ sourceMediaAssetId, approvedMediaAssetId }) => ({ sourceMediaAssetId, approvedMediaAssetId }));
        const result = await operation(id, 'approve', { draftId, revisionNumber, publicMedia });
        if (!isRecord(result)) return;
        const record = isRecord(result.data) ? result.data : result;
        const approvalId = getText(record, 'approvalId');
        if (approvalId) {
            setApprovalIds((current) => ({ ...current, [id]: approvalId }));
            setApprovedSnapshots((current) => ({ ...current, [id]: { revisionNumber, title, body, mediaIds } }));
        }
    };

    const publishApproval = async (id: string, approvalMatches: boolean) => {
        const approvalId = approvalIds[id];
        if (!approvalId || !approvedSnapshots[id] || !approvalMatches) return;
        const result = await operation(id, 'publish', { approvalId });
        if (result) invalidateApproval(id);
    };

    return <>
        <Panel title="Create a summary draft" description="Automatic drafts use only safe daily habit status labels. No-fap, weight, check-in text, body notes, and private image originals are excluded.">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="grid max-w-xs gap-1.5 text-sm font-bold text-stone-800">Activity date <span className="text-xs font-normal text-stone-500">IST</span><input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" /></label><button type="button" disabled={Boolean(busyId) || !draftDate} onClick={() => void createDraft()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><Plus size={16} aria-hidden="true" />{busyId === 'create' ? 'Creating…' : 'Create draft'}</button></div>
        </Panel>
        <Panel title="Summary status" description="Draft revisions, approvals, publication records, and audit history stay separate.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">Drafts</p><p className="mt-1 text-3xl font-black tabular-nums text-amber-950">{drafts.length}</p></div><div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-800">Approvals</p><p className="mt-1 text-3xl font-black tabular-nums text-sky-950">{approvals.length}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Published</p><p className="mt-1 text-3xl font-black tabular-nums text-emerald-950">{publications.filter((item) => getText(item, 'status') === 'published').length}</p></div></div>}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700"><Clock3 size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><p>Nothing is sent automatically. Publishing uses only the server-side approval ID after you approve the exact text and selected sanitized derivatives.</p></div>
            {notice && <div className="mt-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
        </Panel>
        <Panel title="Draft revisions" description="Edits create immutable revisions. Approval binds the selected revision, exact text, and only the prepared derivatives you check below.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && drafts.length === 0 && <EmptyState title="No drafts to review">Drafts returned by the private summaries API will appear here.</EmptyState>}
            {state === 'ready' && drafts.length > 0 && <div className="space-y-4">{drafts.map((draft, index) => {
                const id = getText(draft, 'draftId', 'id') || `draft-${index}`;
                const activityDate = getText(draft, 'activityDate');
                const original = { title: getText(draft, 'title'), body: getText(draft, 'body') };
                const edit = draftEdits[id] ?? original;
                const revisionNumber = getNumber(draft, 'revisionNumber');
                const dirty = edit.title !== original.title || edit.body !== original.body;
                const serverApprovalId = getText(draft, 'approvalId');
                const approvalId = approvalIds[id] ?? '';
                const draftMedia = mediaState[id];
                const derivatives = preparedMedia[id] ?? [];
                const selected = new Set(selectedDerivativeIds[id] ?? []);
                const currentMediaIds = [...selected].sort();
                const approvedSnapshot = approvedSnapshots[id];
                const approvalMatches = Boolean(approvalId && approvedSnapshot && revisionNumber !== null && !dirty
                    && approvedSnapshot.revisionNumber === revisionNumber
                    && approvedSnapshot.title === edit.title && approvedSnapshot.body === edit.body
                    && JSON.stringify(approvedSnapshot.mediaIds) === JSON.stringify(currentMediaIds));
                const needsReapproval = Boolean(serverApprovalId || approvalId) && !approvalMatches;
                const approvalLabel = approvalMatches ? 'Approved for this revision' : needsReapproval ? 'Stale approval · re-approval needed' : 'Needs approval';
                return <article key={id} className="rounded-xl border border-stone-200 p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-extrabold text-stone-950">{edit.title || 'Untitled draft'}</h3><p className="mt-1 text-xs text-stone-500">{dateLabel(activityDate, { month: 'short', day: 'numeric', year: 'numeric' })} IST · {revisionNumber === null ? 'revision not returned' : `revision ${revisionNumber}`}</p></div><span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900">Draft</span><span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${approvalMatches ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : needsReapproval ? 'border-rose-300 bg-rose-100 text-rose-900' : 'border-stone-300 bg-stone-100 text-stone-700'}`}>{approvalLabel}</span></div>
                    {needsReapproval && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="status">A previous approval no longer matches the current title, body, revision, or media selection. Approve the current snapshot again before publishing.</p>}
                    <div className="grid gap-3"><label className="grid gap-1.5 text-sm font-bold text-stone-800">Title<input value={edit.title} onChange={(event) => { setDraftEdits((current) => ({ ...current, [id]: { ...edit, title: event.target.value } })); invalidateApproval(id); }} maxLength={160} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" /></label><label className="grid gap-1.5 text-sm font-bold text-stone-800">Body<textarea value={edit.body} onChange={(event) => { setDraftEdits((current) => ({ ...current, [id]: { ...edit, body: event.target.value } })); invalidateApproval(id); }} rows={6} maxLength={2750} className="rounded-lg border border-stone-300 px-3 py-2 font-normal leading-6 focus:outline-none focus:ring-2 focus:ring-stone-300" /><span className="text-xs font-normal text-stone-500">The exact final line is kept as “posted by Ullu 🦉” when you save.</span></label></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={!dirty || !getText(draft, 'draftId', 'id') || revisionNumber === null || Boolean(busyId) || !edit.title.trim()} onClick={() => void saveEdit(draft, id, edit.title, edit.body)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-100 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">{busyId === id ? 'Saving…' : 'Save new revision'}</button>{dirty && <span className="text-xs text-amber-800">Unsaved edits must be saved before approval.</span>}</div>
                    <section className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3" aria-label="Public image derivatives">
                        <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold text-stone-900">Optional public images</h4><p className="text-xs text-stone-600">Only same-day photos are shown; weight-linked images are excluded. Body photos stay private by default. Prepare and preview a sanitized WebP, then explicitly select each derivative to publish.</p></div><button type="button" disabled={Boolean(busyId) || approvalMatches} onClick={() => void loadSummaryMedia(id, activityDate)} className="min-h-9 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 disabled:opacity-50">{draftMedia?.state === 'loading' ? 'Loading…' : draftMedia?.state === 'ready' ? 'Refresh images' : 'Load eligible images'}</button></div>
                        {draftMedia?.error && <p className="mt-2 text-sm text-rose-800" role="alert">{draftMedia.error}</p>}
                        {draftMedia?.state === 'ready' && draftMedia.media.length === 0 && <p className="mt-3 text-sm text-stone-600">No eligible same-day images are available. You can approve text with no images selected.</p>}
                        {draftMedia?.media.map((item) => {
                            const sourceId = getText(item, 'sourceMediaAssetId');
                            const prepared = derivatives.find((derivative) => derivative.sourceMediaAssetId === sourceId);
                            const checked = Boolean(prepared && selected.has(prepared.approvedMediaAssetId));
                            return <div key={sourceId} className="mt-3 grid gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                <div><Image unoptimized src={getText(item, 'previewUrl')} alt="Private original image preview" width={240} height={180} className="max-h-36 w-full rounded-lg object-contain" /><p className="mt-1 text-xs text-stone-500">Private original · {getText(item, 'category') === 'body' ? 'body photo' : getText(item, 'category').replace('_', ' ')}</p>{getText(item, 'category') === 'body' && <p className="text-xs font-semibold text-amber-800">Private unless you select the sanitized derivative</p>}</div>
                                <button type="button" disabled={Boolean(busyId) || Boolean(prepared) || approvalMatches} onClick={() => void prepareSummaryDerivative(id, activityDate, sourceId)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-xs font-bold text-stone-800 disabled:opacity-50">{busyId === `media:${sourceId}` ? 'Preparing…' : prepared ? 'Prepared' : 'Prepare safe preview'}</button>
                                <div>{prepared ? <><Image unoptimized src={prepared.previewUrl} alt="Sanitized WebP derivative preview" width={240} height={180} className="max-h-36 w-full rounded-lg object-contain" /><label className="mt-2 flex cursor-pointer items-start gap-2 text-xs leading-5 text-stone-800"><input type="checkbox" disabled={dirty || Boolean(busyId) || approvalMatches} checked={checked} onChange={(event) => { setSelectedDerivativeIds((current) => ({ ...current, [id]: event.target.checked ? [...(current[id] ?? []), prepared.approvedMediaAssetId] : (current[id] ?? []).filter((assetId) => assetId !== prepared.approvedMediaAssetId) })); invalidateApproval(id); }} className="mt-1 h-4 w-4 accent-stone-950" /><span>Include this sanitized derivative in the public post</span></label></> : <p className="text-sm text-stone-500">No public derivative prepared</p>}</div>
                            </div>;
                        })}
                        {derivatives.length > 0 && <p className="mt-3 text-xs text-stone-600">Selected derivatives: {selected.size}. Unchecked previews stay private.</p>}
                    </section>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-5 text-stone-800"><input type="checkbox" checked={Boolean(exactApproval[id])} disabled={approvalMatches || dirty || Boolean(busyId) || !edit.body.trim()} onChange={(event) => { setExactApproval((current) => ({ ...current, [id]: event.target.checked })); setApprovalIds((current) => { const next = { ...current }; delete next[id]; return next; }); setApprovedSnapshots((current) => { const next = { ...current }; delete next[id]; return next; }); }} className="mt-1 h-4 w-4 accent-stone-950" /><span><strong>I approve this exact title and body, plus only the selected sanitized image derivatives.</strong><span className="block text-xs text-stone-600">The server records an immutable snapshot for revision {revisionNumber ?? '—'}. Any edit or media-selection change needs a new approval.</span></span></label>
                    <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!exactApproval[id] || dirty || revisionNumber === null || approvalMatches || Boolean(busyId)} onClick={() => revisionNumber !== null && void approveRevision(draft, id, revisionNumber, edit.title, edit.body)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700">{approvalMatches ? 'Revision approved' : busyId === id ? 'Working…' : 'Approve exact snapshot'}</button>{approvalMatches && <button type="button" disabled={dirty || !approvalId || Boolean(busyId)} onClick={() => void publishApproval(id, approvalMatches)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-3 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700">{busyId === id ? 'Publishing…' : 'Publish approved snapshot'}</button>}</div>
                </article>;
            })}</div>}
        </Panel>
        <Panel title="Sent summaries" description="Publication status and links are server-returned; sent counts are separate from draft counts.">
            {state === 'ready' && publications.length === 0 && <EmptyState title="No sent summaries">Published items will be listed here when returned by the private API.</EmptyState>}
            {state === 'ready' && publications.length > 0 && <ul className="divide-y divide-stone-200">{publications.map((item, index) => <li key={getText(item, 'id', 'publicationId') || `publication-${index}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-bold text-stone-900">{getText(item, 'title', 'titleSnapshot') || 'Summary'}</p><p className="mt-1 text-sm text-stone-600">{getText(item, 'status') || 'Sent'}{getValue(item, 'publishedAt') ? ` · ${dateLabel(getValue(item, 'publishedAt'), { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>{getText(item, 'publicUrl') && <a href={getText(item, 'publicUrl')} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-sm font-bold underline underline-offset-2">Open publication</a>}</div><span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-900">Sent</span></li>)}</ul>}
        </Panel>
        <Panel title="Audit history" description="Immutable revisions, approvals, and publication attempts are listed without exposing private source records.">
            {state === 'ready' && history.length === 0 && <EmptyState title="No summary history">Draft changes and publication events will appear here.</EmptyState>}
            {state === 'ready' && history.length > 0 && <ul className="divide-y divide-stone-200">{history.slice(0, 40).map((item, index) => <li key={getText(item, 'id') || `history-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><div><p className="text-sm font-bold text-stone-800">{getText(item, 'type').replaceAll('.', ' · ').replaceAll('_', ' ')}</p><p className="text-xs text-stone-500">{getText(item, 'activityDate') ? `${getText(item, 'activityDate')} IST` : ''}{getNumber(item, 'revisionNumber') !== null ? ` · revision ${getNumber(item, 'revisionNumber')}` : ''}{getText(item, 'errorCode') ? ` · ${getText(item, 'errorCode')}` : ''}</p></div><time className="text-xs text-stone-500">{dateLabel(getValue(item, 'occurredAt'), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></li>)}</ul>}
        </Panel>
    </>;
}

const API_SCOPES = [
    'content:read', 'progress:read', 'progress:write', 'check-ins:read',
    'check-ins:write', 'media:read', 'media:write', 'summaries:write', 'summaries:publish',
] as const;
const OAUTH_SCOPES = ['openid', 'offline_access', ...API_SCOPES] as const;

function IntegrationsSection() {
    const { data, state, error, reload } = usePrivateData(endpointBySection.integrations);
    const { busy, message, setMessage, submit } = useMutation();
    const [keyName, setKeyName] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [expiresInDays, setExpiresInDays] = useState('90');
    const [oneTimeSecret, setOneTimeSecret] = useState('');
    const dataRoot = isRecord(data) && isRecord(data.data) ? data.data : data;
    const keys = getArray(dataRoot, 'keys', 'items');
    const availableScopeValue = getValue(isRecord(dataRoot) ? dataRoot : {}, 'availableScopes');
    const availableScopes = Array.isArray(availableScopeValue) ? availableScopeValue.filter((scope): scope is string => typeof scope === 'string') : [...API_SCOPES];
    const oauth = isRecord(dataRoot) && isRecord(dataRoot.oauth) ? dataRoot.oauth : {};
    const oauthScopesRaw = getValue(oauth, 'scopes');
    const oauthScopes = Array.isArray(oauthScopesRaw) ? oauthScopesRaw.filter((scope): scope is string => typeof scope === 'string') : [...OAUTH_SCOPES];

    const toggleScope = (scope: string) => setSelectedScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
    const issueKey = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!keyName.trim() || selectedScopes.length === 0 || busy) return;
        setOneTimeSecret('');
        const result = await submit(endpointBySection.integrations, 'POST', { label: keyName.trim(), scopes: selectedScopes, expiresInDays: Number(expiresInDays) });
        if (!result.ok) return;
        setKeyName('');
        setSelectedScopes([]);
        const createEnvelope = isRecord(result.data) && isRecord(result.data.data) ? result.data.data : {};
        const token = getText(createEnvelope, 'token');
        if (token) setOneTimeSecret(token);
        else setMessage({ kind: 'error', text: 'The key was created, but the one-time token was missing from the response. Revoke it and issue another key if needed.' });
        reload();
    };

    const revoke = async (item: JsonRecord) => {
        const id = getText(item, 'id', 'keyId');
        if (!id || getValue(item, 'revokedAt', 'revoked_at') || !window.confirm('Revoke this API key? Any integration using it will lose access.')) return;
        const result = await submit(endpointBySection.integrations, 'DELETE', { id });
        if (result.ok) reload();
    };

    return <>
        <Panel title="API access" description="Issue keys with only the scopes selected below. The raw token is shown once after creation.">
            <StatusPanel state={state} error={error} onRetry={reload} />
            {state === 'ready' && <form onSubmit={issueKey} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                    <label className="grid gap-1.5 text-sm font-bold text-stone-800">Key label<input required maxLength={80} value={keyName} onChange={(event) => setKeyName(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300" placeholder="A name for this integration" /></label>
                    <label className="grid gap-1.5 text-sm font-bold text-stone-800">Expires after<select value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} className="min-h-11 rounded-lg border border-stone-300 px-3 font-normal focus:outline-none focus:ring-2 focus:ring-stone-300"><option value="30">30 days</option><option value="90">90 days</option><option value="365">365 days</option></select></label>
                </div>
                <fieldset disabled={busy} className="space-y-2"><legend className="mb-2 text-sm font-bold text-stone-800">Allowed scopes</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{availableScopes.map((scope) => <label key={scope} className="flex min-h-11 items-center gap-3 rounded-lg border border-stone-200 px-3 text-sm font-medium text-stone-800"><input type="checkbox" checked={selectedScopes.includes(scope)} onChange={() => toggleScope(scope)} className="h-4 w-4 accent-stone-950" />{scope}</label>)}</div></fieldset>
                <button type="submit" disabled={busy || !keyName.trim() || selectedScopes.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 focus-visible:ring-offset-2"><KeyRound size={15} aria-hidden="true" />{busy ? 'Working…' : 'Issue scoped key'}</button>
                {message && <Notice kind={message.kind}>{message.text}</Notice>}
                {oneTimeSecret && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4" role="status"><p className="font-bold text-emerald-950">New API token</p><p className="mt-1 text-sm text-emerald-900">Copy this token now. It won’t be requested again by this screen.</p><code className="mt-3 block overflow-x-auto rounded-lg border border-emerald-200 bg-white p-3 text-sm text-stone-900">{oneTimeSecret}</code></div>}
            </form>}
            {state === 'ready' && <div className="mt-6 border-t border-stone-200 pt-5"><h3 className="font-bold text-stone-900">Existing keys</h3>{keys.length === 0 ? <p className="mt-2 text-sm text-stone-600">No API keys were returned.</p> : <ul className="mt-3 divide-y divide-stone-200">{keys.map((item, index) => {
                const id = getText(item, 'id', 'keyId');
                const rawScopes = getValue(item, 'scopes', 'permissions');
                const scopes = Array.isArray(rawScopes) ? rawScopes.filter((scope): scope is string => typeof scope === 'string') : [];
                const revoked = Boolean(getValue(item, 'revokedAt', 'revoked_at'));
                return <li key={id || `${getText(item, 'label')}-${index}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-bold text-stone-900">{getText(item, 'label', 'name') || 'API key'} <span className="font-normal text-stone-500">{getText(item, 'keyPrefix', 'key_prefix', 'prefix') ? `· ${getText(item, 'keyPrefix', 'key_prefix', 'prefix')}` : ''}</span> {revoked && <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">Revoked</span>}</p><p className="mt-1 text-xs text-stone-600">{scopes.length ? `Scopes: ${scopes.join(', ')}` : 'Scopes not returned'}{getValue(item, 'expiresAt', 'expires_at') ? ` · expires ${dateLabel(getValue(item, 'expiresAt', 'expires_at'))}` : ''}{getValue(item, 'createdAt', 'created_at') ? ` · created ${dateLabel(getValue(item, 'createdAt', 'created_at'))}` : ''}</p></div><button type="button" disabled={!id || revoked || busy} onClick={() => void revoke(item)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-rose-300 bg-white px-3 text-sm font-bold text-rose-900 hover:bg-rose-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"><X size={15} aria-hidden="true" /> Revoke</button></li>;
            })}</ul>}</div>}
        </Panel>
        <Panel title="OAuth provider" description="Provider setup and endpoint values are read from the private integration configuration.">
            <div className="mb-4 flex items-center gap-2"><span className="rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-extrabold text-stone-700">{getText(oauth, 'status') || 'Inactive · configurable'}</span></div>
            <dl className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-stone-200 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">MCP endpoint</dt><dd className="mt-1 break-all text-sm font-medium text-stone-900">{getText(oauth, 'endpoint') || 'Not configured'}</dd></div><div className="rounded-lg border border-stone-200 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">Authorization server</dt><dd className="mt-1 break-all text-sm font-medium text-stone-900">{getText(oauth, 'authorizationServer') || 'Not configured'}</dd></div><div className="rounded-lg border border-stone-200 p-3 sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">OAuth scopes</dt><dd className="mt-2 flex flex-wrap gap-2">{oauthScopes.map((scope) => <span key={scope} className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700">{scope}</span>)}</dd></div></dl>
            <p className="mt-3 text-xs leading-5 text-stone-500">Provider credentials and live delivery remain configurable. Confirm deployed metadata before sharing endpoint details with an external client.</p>
        </Panel>
        <Panel title="Delivery status" description="Scheduler and live delivery remain inactive until configured and tested.">
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Scheduled delivery</p><p className="mt-1 font-extrabold text-stone-900">Inactive · configurable</p></div><div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">Live delivery</p><p className="mt-1 font-extrabold text-stone-900">Inactive · not connected</p></div></div>
        </Panel>
    </>;
}

const pageMeta: Record<Section, { title: string; intro: string }> = {
    progress: { title: 'Progress', intro: 'Review recorded habits and update a status with a clear, deliberate action.' },
    'check-ins': { title: 'Check-ins', intro: 'Add a dated check-in, review recent entries, and see a weekly no-fap status view.' },
    weight: { title: 'Weight', intro: 'Review measurements as recorded, with gaps left visible rather than filled.' },
    body: { title: 'Body', intro: 'Browse private media metadata and load an individual item only when you choose Play.' },
    summaries: { title: 'Summaries', intro: 'Review drafts and approve the exact text before any publish request.' },
    integrations: { title: 'Integrations', intro: 'Manage scoped API keys and inspect configurable OAuth and delivery status.' },
};

export default function AccountabilityPage({ section }: { section: Section }) {
    const meta = pageMeta[section];
    const content = section === 'progress' ? <ProgressSection />
        : section === 'check-ins' ? <CheckInsSection />
            : section === 'weight' ? <WeightSection />
                : section === 'body' ? <BodySection />
                    : section === 'summaries' ? <SummariesSection />
                        : <IntegrationsSection />;
    return <AccountabilityShell active={section} title={meta.title} intro={meta.intro}>{content}</AccountabilityShell>;
}
