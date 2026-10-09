'use client';
import { useEffect, useRef, useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
export function ApiTokenDialog({
    token,
    onClose,
}: {
    token: string;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (token && !dialog.current?.open) dialog.current?.showModal();
    }, [token]);
    return (
        <dialog
            ref={dialog}
            onCancel={onClose}
            onClose={onClose}
            aria-labelledby="new-key-title"
            className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-[600px] rounded-2xl border border-stone-200 bg-white p-6 text-stone-950 shadow-xl backdrop:bg-black/40"
        >
            <div className="flex items-center justify-between">
                <h2 id="new-key-title" className="text-lg font-bold">
                    New API key
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close key dialog"
                >
                    <X size={20} />
                </button>
            </div>
            <p className="my-3 text-sm text-stone-600">
                Copy this key now. It is shown only once.
            </p>
            <div className="flex gap-2">
                <input
                    ref={input}
                    readOnly
                    value={token}
                    aria-label="New API key"
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 p-3 font-mono text-xs"
                />
                <button
                    type="button"
                    aria-label={copied ? 'Key copied' : 'Copy API key'}
                    className="rounded-lg bg-stone-950 px-4 text-white"
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(token);
                            setCopied(true);
                            setError('');
                        } catch {
                            input.current?.select();
                            setError(
                                'Copy is unavailable. The key is selected; press Command/Ctrl+C.',
                            );
                        }
                    }}
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
            </div>
            <p role="status" className="mt-2 text-xs">
                {copied ? 'Copied to clipboard.' : error}
            </p>
            <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold"
            >
                Done
            </button>
        </dialog>
    );
}
