'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function RemoteOAuthConfig({
    endpoint,
    issuer,
}: {
    endpoint: string;
    issuer: string;
}) {
    const [copied, setCopied] = useState('');
    const [copyError, setCopyError] = useState('');
    const resource = new URL(endpoint || '/api/mcp', window.location.origin);
    const authorizationServer = new URL(
        issuer || '/api/auth',
        window.location.origin,
    );
    const discovery = new URL(
        `/.well-known/oauth-authorization-server${authorizationServer.pathname.replace(/\/$/, '')}`,
        authorizationServer.origin,
    ).toString();
    const resourceDiscovery = new URL(
        `/.well-known/oauth-protected-resource${resource.pathname}`,
        resource.origin,
    ).toString();
    const setup = JSON.stringify(
        {
            name: 'Prosamik Tracker',
            server_url: resource.toString(),
            authentication: 'OAuth',
            client_registration: 'CIMD',
        },
        null,
        2,
    );
    const copy = async (label: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(label);
            setCopyError('');
        } catch {
            setCopyError('Select the text and press Command/Ctrl+C to copy.');
        }
    };
    const fields = [
        ['MCP server URL', resource.toString()],
        ['Authentication', 'OAuth'],
        ['Client registration', 'CIMD (Client ID Metadata Document)'],
        ['OAuth client ID / secret', 'Leave blank when using CIMD'],
    ];

    return (
        <div className="space-y-5 text-sm">
            <p className="text-stone-600">
                Connect this tracker from ChatGPT’s remote connections using
                OAuth sign-in and your selected permissions.
            </p>
            {resource.protocol !== 'https:' && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    This is a local development URL. Open Integrations on your
                    deployed HTTPS site to copy a URL ChatGPT can reach.
                </p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                    <div
                        key={label}
                        className="min-w-0 rounded-xl border border-stone-200 p-3"
                    >
                        <dt className="text-xs font-bold text-stone-500">
                            {label}
                        </dt>
                        <dd className="mt-2 flex items-start gap-2">
                            <span className="min-w-0 flex-1 select-text break-all">
                                {value}
                            </span>
                            {label === 'MCP server URL' && (
                                <button
                                    type="button"
                                    onClick={() => void copy(label, value)}
                                    aria-label="Copy MCP server URL"
                                    className="grid min-h-9 min-w-9 place-items-center rounded-lg border border-stone-200"
                                >
                                    {copied === label ? (
                                        <Check size={16} />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </button>
                            )}
                        </dd>
                    </div>
                ))}
            </dl>
            <ol className="list-decimal space-y-2 pl-5 text-stone-700">
                <li>
                    Create a remote MCP connection in ChatGPT and paste the
                    server URL above.
                </li>
                <li>
                    Choose <strong>OAuth</strong> and <strong>CIMD</strong> if
                    asked for a client registration method. No API key or
                    manually issued client secret is needed.
                </li>
                <li>
                    Connect, sign in with your authorized Google account, and
                    approve the tracker permissions you want to grant. Enable{' '}
                    <code>summaries:write</code> to let the agent read, edit,
                    and approve summaries.
                </li>
            </ol>
            <div className="rounded-xl border border-stone-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-bold">Example connection settings</h3>
                    <button
                        type="button"
                        onClick={() => void copy('settings', setup)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 px-3 text-xs font-bold"
                    >
                        {copied === 'settings' ? (
                            <Check size={14} />
                        ) : (
                            <Copy size={14} />
                        )}{' '}
                        Copy
                    </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-stone-50 p-3 text-xs">
                    <code>{setup}</code>
                </pre>
                <p className="mt-2 text-xs text-stone-500">
                    These are the values to enter in the connection dialog, not
                    a client configuration file.
                </p>
            </div>
            <details className="rounded-xl border border-stone-200 p-3">
                <summary className="cursor-pointer font-bold">
                    OAuth discovery details
                </summary>
                <dl className="mt-3 space-y-3 text-xs">
                    {[
                        ['Protected resource metadata', resourceDiscovery],
                        ['Authorization server metadata', discovery],
                        [
                            'Authorization endpoint',
                            `${authorizationServer.toString().replace(/\/$/, '')}/oauth2/authorize`,
                        ],
                        [
                            'Token endpoint',
                            `${authorizationServer.toString().replace(/\/$/, '')}/oauth2/token`,
                        ],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt className="font-bold text-stone-500">
                                {label}
                            </dt>
                            <dd className="mt-1 select-text break-all">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </details>
            <p role="status" className="text-xs text-stone-600">
                {copyError || (copied ? 'Copied to clipboard.' : '')}
            </p>
            <a
                href="https://developers.openai.com/plugins/build/auth"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-semibold underline"
            >
                OpenAI OAuth connection guide ↗
            </a>
        </div>
    );
}
