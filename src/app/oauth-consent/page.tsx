import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyOAuthQueryParams } from '@better-auth/oauth-provider';
import OAuthConsentForm from '@/components/auth/OAuthConsentForm';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const metadata: Metadata = {
    title: 'Review Prosamik access',
    robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function OAuthConsentPage({
    searchParams,
}: {
    searchParams: SearchParams | Promise<SearchParams>;
}) {
    const rawSearchParams = await searchParams;
    const signedQuery = new URLSearchParams();
    for (const [key, value] of Object.entries(rawSearchParams).sort(([left], [right]) => left.localeCompare(right))) {
        for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
            signedQuery.append(key, item);
        }
    }

    const query = signedQuery.toString();
    const context = await auth.$context;
    if (!(await verifyOAuthQueryParams(query, context.secret))) {
        return (
            <main className="mx-auto w-full max-w-xl px-4 pt-12">
                <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-stone-950">This connection request has expired</h1>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Return to the client and start a new connection request.</p>
                </section>
            </main>
        );
    }

    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session?.user?.email || !isAllowedAdminEmail(session.user.email)) {
        const returnPath = `/oauth-consent?${query}`;
        redirect(`/sign-in?next=${encodeURIComponent(returnPath)}`);
    }

    const clientId = signedQuery.get('client_id');
    const requestedScopes = (signedQuery.get('scope') || '')
        .split(/\s+/)
        .filter(Boolean);
    if (!clientId) {
        return (
            <main className="mx-auto w-full max-w-xl px-4 pt-12">
                <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-stone-950">The connection request is incomplete</h1>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Return to the client and start a new connection request.</p>
                </section>
            </main>
        );
    }

    const publicClient = await auth.api.getOAuthClientPublic({
        query: { client_id: clientId },
        headers: requestHeaders,
    }).catch(() => null);
    const clientName = publicClient && 'client_name' in publicClient && typeof publicClient.client_name === 'string'
        ? publicClient.client_name
        : 'an MCP client';
    const clientUri = publicClient && 'client_uri' in publicClient && typeof publicClient.client_uri === 'string'
        ? publicClient.client_uri
        : null;

    return (
        <main className="mx-auto w-full max-w-3xl px-4 pt-6 sm:pt-12">
            <OAuthConsentForm
                clientName={clientName}
                clientUri={clientUri}
                requestedScopes={requestedScopes}
            />
        </main>
    );
}
