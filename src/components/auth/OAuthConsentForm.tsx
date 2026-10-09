'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

const scopeLabels: Record<string, string> = {
    openid: 'Identify the account authorizing this connection',
    offline_access: 'Keep this connection active using refresh tokens',
    'food:read': 'Read food entries, calorie estimates, and daily totals',
    'food:write': 'Record and correct food entries and calorie estimates',
    'content:read': 'Read authorized Prosamik application content',
    'progress:read': 'Read private habits, no-fap records, weight measurements, streaks, and trends',
    'progress:write': 'Record or correct habits, no-fap statuses, and weight measurements',
    'check-ins:read': 'Read check-ins and reminder state',
    'check-ins:write': 'Record check-in responses and reminder results',
    'media:read': 'Read authorized private body photos/videos and temporary media links',
    'media:write': 'Upload private photos/videos and attach them to progress',
    'summaries:write': 'Read, create, edit, and approve private daily summary revisions',
    'summaries:publish': 'Publish only a separately reviewed public text/media snapshot',
};

export default function OAuthConsentForm({
    clientName,
    clientUri,
    requestedScopes,
}: {
    clientName: string;
    clientUri: string | null;
    requestedScopes: string[];
}) {
    const [selectedScopes, setSelectedScopes] = useState<string[]>(requestedScopes.filter((scope) => scope === 'openid'));
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);

    const toggleScope = (scope: string) => setSelectedScopes((current) => (
        current.includes(scope)
            ? current.filter((item) => item !== scope)
            : [...current, scope]
    ));

    const submitConsent = async (accept: boolean) => {
        setError('');
        setPending(true);
        try {
            const result = await authClient.oauth2.consent({
                accept,
                ...(accept ? { scope: selectedScopes.join(' ') } : {}),
            });
            if (result.error) {
                setError(result.error.message || 'The consent request could not be completed.');
                return;
            }
            if (result.data?.redirect && result.data.url) {
                window.location.assign(result.data.url);
                return;
            }
            setError('The authorization server did not return a redirect. Please restart the connection.');
        } catch {
            setError('The consent request could not be completed. Please restart the connection.');
        } finally {
            setPending(false);
        }
    };

    return (
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-stone-300 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Prosamik connection request</p>
            <h1 className="mt-3 text-2xl font-black text-stone-950">Review access for {clientName}</h1>
            {clientUri ? <p className="mt-2 break-all text-sm text-stone-500">Client website: {clientUri}</p> : null}
            <p className="mt-5 text-sm leading-6 text-stone-700">
                Choose what this client may access. Reading progress does not grant permission to record or publish it.
            </p>

            <fieldset className="mt-5 space-y-3" disabled={pending}>
                <legend className="mb-2 text-sm font-bold text-stone-900">Requested permissions</legend>
                {requestedScopes.length === 0 ? (
                    <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-600">No application data scopes were requested.</p>
                ) : requestedScopes.map((scope) => (
                    <label key={scope} className="flex gap-3 rounded-xl border border-stone-200 p-3 text-sm">
                        <input
                            type="checkbox"
                            checked={selectedScopes.includes(scope)}
                            onChange={() => toggleScope(scope)}
                            className="mt-0.5 h-4 w-4 accent-stone-900"
                        />
                        <span>
                            <span className="block font-semibold text-stone-900">{scope}</span>
                            <span className="mt-0.5 block leading-5 text-stone-600">{scopeLabels[scope] || 'Access requested by this client'}</span>
                        </span>
                    </label>
                ))}
            </fieldset>

            {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => void submitConsent(true)}
                    disabled={pending || selectedScopes.length === 0}
                    className="rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {pending ? 'Working…' : 'Approve selected access'}
                </button>
                <button
                    type="button"
                    onClick={() => void submitConsent(false)}
                    disabled={pending}
                    className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 disabled:opacity-50"
                >
                    Deny
                </button>
            </div>
        </section>
    );
}
