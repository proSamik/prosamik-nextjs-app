'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function ApiKeyFormDialog({
    children,
    onClose,
}: {
    children: ReactNode;
    onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);

    return (
        <dialog
            ref={dialog}
            onCancel={onClose}
            aria-labelledby="create-api-key-title"
            className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 text-stone-950 shadow-xl backdrop:bg-black/40 sm:p-6"
        >
            <div className="mb-2 flex items-center justify-between gap-3">
                <h2 id="create-api-key-title" className="text-lg font-bold">
                    Create new API key
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close create key dialog"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700"
                >
                    <X size={20} aria-hidden="true" />
                </button>
            </div>
            <p className="mb-5 text-sm text-stone-600">
                Choose permissions and expiration. The key is shown once after
                creation.
            </p>
            {children}
        </dialog>
    );
}
