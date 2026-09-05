'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type DragEvent,
    type FormEvent,
} from 'react';
import {
    Check,
    ImagePlus,
    LoaderCircle,
    Pencil,
    Quote,
    RotateCcw,
    Search,
    Send,
    Trash2,
    UploadCloud,
    Video,
    X,
} from 'lucide-react';
import type { RandomThought, RandomThoughtMedia, RandomThoughtQuote } from '@/lib/random-thoughts';
import RandomThoughtCard from '@/components/RandomThoughtCard';
import QuotedThoughtPreview from '@/components/QuotedThoughtPreview';
import DateTimeRangeFilter, { type DateTimeRangeValue } from '@/components/admin/DateTimeRangeFilter';

type RandomThoughtsAdminProps = {
    initialThoughts: RandomThought[];
};

type PendingAttachment = {
    id: string;
    file: File;
    previewUrl: string;
    type: 'image' | 'video';
};

type PresignedUpload = {
    uploadUrl: string;
    url: string;
    mediaType: 'image' | 'video';
};

type UploadedMedia = {
    url: string;
    type: 'image' | 'video';
    posterUrl: string | null;
};

type Notice = {
    kind: 'success' | 'error';
    text: string;
} | null;

function toQuotePreview(thought: RandomThought): RandomThoughtQuote {
    return {
        id: thought.id,
        slug: thought.slug,
        content: thought.content,
        media: thought.media[0] ?? null,
        createdTimeZone: thought.createdTimeZone,
        createdAt: thought.createdAt,
    };
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usePendingAttachments() {
    const [items, setItems] = useState<PendingAttachment[]>([]);
    const itemsRef = useRef(items);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    useEffect(() => () => {
        itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    }, []);

    const add = useCallback((incoming: File[]) => {
        const accepted = incoming.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));

        setItems((current) => {
            const fingerprints = new Set(current.map((item) => (
                `${item.file.name}:${item.file.size}:${item.file.lastModified}`
            )));
            const additions = accepted.flatMap((file) => {
                const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
                if (fingerprints.has(fingerprint)) return [];
                fingerprints.add(fingerprint);

                return [{
                    id: crypto.randomUUID(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
                }];
            });
            return [...current, ...additions];
        });

        return incoming.length - accepted.length;
    }, []);

    const remove = useCallback((id: string) => {
        setItems((current) => {
            const item = current.find((candidate) => candidate.id === id);
            if (item) URL.revokeObjectURL(item.previewUrl);
            return current.filter((candidate) => candidate.id !== id);
        });
    }, []);

    const clear = useCallback(() => {
        setItems((current) => {
            current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
            return [];
        });
    }, []);

    return { items, add, remove, clear };
}

async function cleanupUploads(urls: string[]) {
    if (urls.length === 0) return;

    await fetch('/api/random-thoughts/media/presign', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
    }).catch(() => undefined);
}

function uploadedMediaUrls(media: UploadedMedia[]): string[] {
    return media.flatMap((item) => [item.url, ...(item.posterUrl ? [item.posterUrl] : [])]);
}

function createVideoPosterFile(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const objectUrl = URL.createObjectURL(file);
        let settled = false;

        const cleanup = () => {
            clearTimeout(timeoutId);
            video.onloadedmetadata = null;
            video.onseeked = null;
            video.onerror = null;
            video.removeAttribute('src');
            video.load();
            URL.revokeObjectURL(objectUrl);
        };
        const fail = (message: string) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error(message));
        };
        const captureFrame = () => {
            if (settled) return;
            const sourceWidth = video.videoWidth;
            const sourceHeight = video.videoHeight;
            if (!sourceWidth || !sourceHeight) {
                fail(`Could not read a poster frame from ${file.name}.`);
                return;
            }

            const maximumDimension = 1600;
            const scale = Math.min(1, maximumDimension / Math.max(sourceWidth, sourceHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(sourceWidth * scale));
            canvas.height = Math.max(1, Math.round(sourceHeight * scale));
            const context = canvas.getContext('2d');
            if (!context) {
                fail(`Could not create a poster for ${file.name}.`);
                return;
            }

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    fail(`Could not encode a poster for ${file.name}.`);
                    return;
                }

                settled = true;
                cleanup();
                const baseName = file.name.replace(/\.[^.]+$/, '') || 'video';
                resolve(new File([blob], `${baseName}-poster.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                }));
            }, 'image/jpeg', 0.88);
        };

        const timeoutId = window.setTimeout(
            () => fail(`Creating a poster for ${file.name} took too long.`),
            20_000,
        );

        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.onloadedmetadata = () => {
            if (!Number.isFinite(video.duration) || video.duration <= 0) {
                fail(`Could not read the duration of ${file.name}.`);
                return;
            }

            video.onseeked = captureFrame;
            video.currentTime = Math.max(0, Math.min(1, video.duration * 0.1, video.duration - 0.001));
        };
        video.onerror = () => fail(`Could not load ${file.name} to create its social preview.`);
        video.src = objectUrl;
        video.load();
    });
}

function putFileDirectly(
    file: File,
    upload: PresignedUpload,
    onProgress: (progress: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', upload.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) onProgress(event.loaded / event.total);
        });
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(1);
                resolve();
                return;
            }
            reject(new Error(`R2 rejected ${file.name} (${xhr.status}).`));
        });
        xhr.addEventListener('error', () => {
            reject(new Error('Direct upload failed. Check the R2 bucket CORS policy.'));
        });
        xhr.addEventListener('abort', () => reject(new Error(`Upload cancelled for ${file.name}.`)));
        xhr.send(file);
    });
}

async function uploadAttachments(
    attachments: PendingAttachment[],
    onProgress: (progress: number) => void
): Promise<UploadedMedia[]> {
    if (attachments.length === 0) return [];

    const posterFiles = await Promise.all(attachments.map((attachment) => (
        attachment.type === 'video' ? createVideoPosterFile(attachment.file) : Promise.resolve(null)
    )));
    const assets: Array<{ file: File; attachmentIndex: number; kind: 'media' | 'poster' }> = [];
    attachments.forEach((attachment, index) => {
        assets.push({ file: attachment.file, attachmentIndex: index, kind: 'media' });
        const posterFile = posterFiles[index];
        if (posterFile) assets.push({ file: posterFile, attachmentIndex: index, kind: 'poster' });
    });

    const presignResponse = await fetch('/api/random-thoughts/media/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            files: assets.map(({ file }) => ({
                name: file.name,
                type: file.type,
                size: file.size,
            })),
        }),
    });
    const presignPayload = await presignResponse.json().catch(() => null);

    if (!presignResponse.ok || !Array.isArray(presignPayload?.data)) {
        throw new Error(presignPayload?.error || 'Unable to prepare direct uploads.');
    }

    const uploads = presignPayload.data as PresignedUpload[];
    if (uploads.length !== assets.length) {
        throw new Error('The upload service returned an incomplete response.');
    }

    const progress = uploads.map(() => 0);
    const updateProgress = (index: number, value: number) => {
        progress[index] = value;
        onProgress(progress.reduce((sum, current) => sum + current, 0) / progress.length);
    };

    try {
        await Promise.all(uploads.map((upload, index) => (
            putFileDirectly(assets[index].file, upload, (value) => updateProgress(index, value))
        )));
    } catch (error) {
        await cleanupUploads(uploads.map((upload) => upload.url));
        throw error;
    }

    return attachments.map((attachment, attachmentIndex) => {
        const mediaAssetIndex = assets.findIndex((asset) => (
            asset.attachmentIndex === attachmentIndex && asset.kind === 'media'
        ));
        const posterAssetIndex = assets.findIndex((asset) => (
            asset.attachmentIndex === attachmentIndex && asset.kind === 'poster'
        ));

        return {
            url: uploads[mediaAssetIndex].url,
            type: attachment.type,
            posterUrl: posterAssetIndex >= 0 ? uploads[posterAssetIndex].url : null,
        };
    });
}

type MediaDropzoneProps = {
    attachments: PendingAttachment[];
    disabled?: boolean;
    compact?: boolean;
    onFiles: (files: File[]) => void;
    onRemove: (id: string) => void;
};

function MediaDropzone({ attachments, disabled, compact, onFiles, onRemove }: MediaDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const receiveFiles = (files: FileList | null) => {
        if (files?.length) onFiles(Array.from(files));
        if (inputRef.current) inputRef.current.value = '';
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) receiveFiles(event.dataTransfer.files);
    };

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                disabled={disabled}
                onChange={(event) => receiveFiles(event.target.files)}
            />

            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label="Add images or videos"
                onClick={() => !disabled && inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (!disabled && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click();
                }}
                onDragEnter={(event) => {
                    event.preventDefault();
                    if (!disabled) setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
                }}
                onDrop={onDrop}
                className={`group flex cursor-pointer items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-5 text-left transition ${
                    compact ? 'min-h-24 py-4' : 'min-h-36 py-6'
                } ${
                    isDragging
                        ? 'border-[#e85d36] bg-[#fff4ed]'
                        : 'border-stone-300 bg-stone-50 hover:border-stone-500 hover:bg-white'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-black text-white shadow-sm transition group-hover:-translate-y-0.5">
                    <UploadCloud size={22} />
                </span>
                <span>
                    <span className="block text-sm font-bold text-stone-900">Drop images or videos here</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">
                        or click to browse. Select as many as you need.
                    </span>
                </span>
            </div>

            {attachments.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                            <div className="aspect-[4/3]">
                                {attachment.type === 'video' ? (
                                    <video src={attachment.previewUrl} className="h-full w-full object-cover" muted playsInline />
                                ) : (
                                    // Local object URLs cannot be served by the Next.js image optimizer.
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={attachment.previewUrl} alt="Selected attachment preview" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <button
                                type="button"
                                aria-label={`Remove ${attachment.file.name}`}
                                disabled={disabled}
                                onClick={() => onRemove(attachment.id)}
                                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/80 text-white shadow-lg transition hover:bg-[#d94722]"
                            >
                                <X size={16} />
                            </button>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-7 text-white">
                                <p className="truncate text-[11px] font-semibold">{attachment.file.name}</p>
                                <p className="text-[10px] text-white/70">{formatBytes(attachment.file.size)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3" aria-hidden="true">
                    <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-300">
                        <ImagePlus size={22} />
                    </div>
                    <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-300">
                        <Video size={22} />
                    </div>
                    <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 text-xs font-semibold text-stone-300">
                        + more
                    </div>
                </div>
            )}
        </div>
    );
}

function ExistingMediaEditor({
    media,
    removedIds,
    onToggle,
}: {
    media: RandomThoughtMedia[];
    removedIds: Set<number>;
    onToggle: (id: number) => void;
}) {
    if (media.length === 0) return null;

    return (
        <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Published media</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.map((item) => {
                    const removed = removedIds.has(item.id);
                    return (
                        <div key={item.id} className={`relative overflow-hidden rounded-2xl bg-stone-100 transition ${removed ? 'opacity-40 grayscale' : ''}`}>
                            <div className="aspect-[4/3]">
                                {item.type === 'video' ? (
                                    <video src={item.url} poster={item.posterUrl ?? undefined} className="h-full w-full object-cover" muted playsInline />
                                ) : (
                                    // Uploaded media uses dynamic CDN URLs and retains its source dimensions.
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.url} alt="Published attachment" className="h-full w-full object-cover" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => onToggle(item.id)}
                                className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-white shadow-lg ${removed ? 'bg-emerald-600' : 'bg-black/80 hover:bg-[#d94722]'}`}
                                aria-label={removed ? 'Keep this attachment' : 'Remove this attachment'}
                            >
                                {removed ? <RotateCcw size={15} /> : <X size={15} />}
                            </button>
                            {removed ? (
                                <span className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Will remove
                                </span>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ThoughtManager({
    thought,
    onQuote,
    onSaved,
    onDeleted,
}: {
    thought: RandomThought;
    onQuote: (thought: RandomThought) => void;
    onSaved: (thought: RandomThought) => void;
    onDeleted: (id: number) => void;
}) {
    const pending = usePendingAttachments();
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(thought.content);
    const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());
    const [notice, setNotice] = useState<Notice>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const resetEditor = () => {
        setContent(thought.content);
        setRemovedIds(new Set());
        pending.clear();
        setNotice(null);
        setUploadProgress(0);
    };

    const onFiles = (files: File[]) => {
        const rejected = pending.add(files);
        if (rejected > 0) setNotice({ kind: 'error', text: `${rejected} unsupported file${rejected === 1 ? '' : 's'} skipped.` });
    };

    const save = async (event: FormEvent) => {
        event.preventDefault();
        const text = content.trim();
        const remainingCount = thought.media.length - removedIds.size + pending.items.length;
        if (!text && remainingCount === 0 && !thought.quotedThought) {
            setNotice({ kind: 'error', text: 'Keep some text, an attachment, or the quoted post.' });
            return;
        }

        setIsSaving(true);
        setNotice(null);
        let uploaded: UploadedMedia[];

        try {
            uploaded = await uploadAttachments(pending.items, setUploadProgress);
            const response = await fetch(`/api/random-thoughts/${thought.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: text,
                    removeMediaIds: Array.from(removedIds),
                    media: uploaded,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.data) {
                await cleanupUploads(uploadedMediaUrls(uploaded));
                throw new Error(payload?.error || 'Unable to update this thought.');
            }

            onSaved(payload.data);
            setContent(payload.data.content);
            setRemovedIds(new Set());
            pending.clear();
            setUploadProgress(0);
            setIsEditing(false);
        } catch (error) {
            setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to update this thought.' });
        } finally {
            setIsSaving(false);
        }
    };

    const removeThought = async () => {
        if (!window.confirm('Delete this thought and all of its media? This cannot be undone.')) return;

        setIsDeleting(true);
        setNotice(null);
        try {
            const response = await fetch(`/api/random-thoughts/${thought.id}`, { method: 'DELETE' });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error || 'Unable to delete this thought.');
            onDeleted(thought.id);
        } catch (error) {
            setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to delete this thought.' });
            setIsDeleting(false);
        }
    };

    if (isEditing) {
        return (
            <form onSubmit={save} className="rounded-[26px] border border-stone-200 bg-white p-4 shadow-[0_16px_50px_rgba(28,25,23,0.07)] sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d94722]">Editing</p>
                        <h3 className="mt-1 text-lg font-bold">Refine this thought</h3>
                    </div>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                            resetEditor();
                            setIsEditing(false);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-100"
                        aria-label="Close editor"
                    >
                        <X size={17} />
                    </button>
                </div>

                <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={3000}
                    rows={5}
                    disabled={isSaving}
                    className="w-full resize-y rounded-2xl border border-stone-300 bg-stone-50 p-4 text-[15px] leading-7 outline-none transition focus:border-black focus:bg-white focus:ring-4 focus:ring-black/5"
                />
                <p className="mt-1 text-right text-[11px] font-medium text-stone-400">{content.length} / 3000</p>

                <div className="mt-5 space-y-5">
                    <ExistingMediaEditor
                        media={thought.media}
                        removedIds={removedIds}
                        onToggle={(id) => setRemovedIds((current) => {
                            const next = new Set(current);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                        })}
                    />
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Add more media</p>
                        <MediaDropzone
                            compact
                            attachments={pending.items}
                            disabled={isSaving}
                            onFiles={onFiles}
                            onRemove={pending.remove}
                        />
                    </div>
                </div>

                {isSaving && pending.items.length > 0 ? (
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-[#e85d36] transition-[width]" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
                    </div>
                ) : null}

                {notice ? (
                    <p className={`mt-4 text-sm ${notice.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{notice.text}</p>
                ) : null}

                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-5">
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                            resetEditor();
                            setIsEditing(false);
                        }}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                        {isSaving ? `Saving ${Math.round(uploadProgress * 100)}%` : 'Save changes'}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div className="overflow-hidden rounded-[26px] border border-stone-200 bg-white shadow-[0_16px_50px_rgba(28,25,23,0.07)]">
            <RandomThoughtCard thought={thought} />
            <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/80 px-4 py-3 sm:px-5">
                <span className="text-xs font-medium text-stone-400">Post #{thought.id}</span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onQuote(thought)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#b83b19] hover:bg-[#fff0e9]"
                    >
                        <Quote size={14} /> Quote
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-stone-700 hover:bg-white hover:shadow-sm"
                    >
                        <Pencil size={14} /> Edit
                    </button>
                    <button
                        type="button"
                        disabled={isDeleting}
                        onClick={removeThought}
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                        {isDeleting ? <LoaderCircle className="animate-spin" size={14} /> : <Trash2 size={14} />}
                        Delete
                    </button>
                </div>
            </div>
            {notice ? <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{notice.text}</p> : null}
        </div>
    );
}

export default function RandomThoughtsAdmin({ initialThoughts }: RandomThoughtsAdminProps) {
    const pending = usePendingAttachments();
    const composerRef = useRef<HTMLFormElement>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const [thoughts, setThoughts] = useState<RandomThought[]>(initialThoughts);
    const [content, setContent] = useState('');
    const [quotedThought, setQuotedThought] = useState<RandomThought | null>(null);
    const [notice, setNotice] = useState<Notice>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateTimeRangeValue>({ start: null, end: null });

    const searchPattern = useMemo(() => {
        if (!searchQuery.trim()) return { regex: null, error: '' };

        try {
            return { regex: new RegExp(searchQuery, 'i'), error: '' };
        } catch {
            return { regex: null, error: 'That regular expression is not valid yet.' };
        }
    }, [searchQuery]);

    const filteredThoughts = useMemo(() => thoughts.filter((thought) => {
        if (searchPattern.error) return false;
        if (searchPattern.regex && !searchPattern.regex.test(thought.content)) return false;

        const createdAt = new Date(thought.createdAt).getTime();
        if (dateRange.start && createdAt < dateRange.start.getTime()) return false;
        if (dateRange.end && createdAt > dateRange.end.getTime()) return false;
        return true;
    }), [dateRange.end, dateRange.start, searchPattern.error, searchPattern.regex, thoughts]);

    const hasArchiveFilters = Boolean(searchQuery || dateRange.start || dateRange.end);

    const onFiles = (files: File[]) => {
        const rejected = pending.add(files);
        if (rejected > 0) {
            setNotice({ kind: 'error', text: `${rejected} unsupported file${rejected === 1 ? '' : 's'} skipped.` });
        } else {
            setNotice(null);
        }
    };

    const clearDraft = () => {
        setContent('');
        setQuotedThought(null);
        pending.clear();
        setNotice(null);
        setUploadProgress(0);
    };

    const publish = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const text = content.trim();
        if (!text && pending.items.length === 0 && !quotedThought) {
            setNotice({ kind: 'error', text: 'Write something, add media, or quote an earlier post.' });
            return;
        }

        setIsPublishing(true);
        setNotice(null);
        let uploaded: UploadedMedia[];

        try {
            uploaded = await uploadAttachments(pending.items, setUploadProgress);
            const response = await fetch('/api/random-thoughts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: text,
                    media: uploaded,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    quotedThoughtId: quotedThought?.id ?? null,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.data) {
                await cleanupUploads(uploadedMediaUrls(uploaded));
                throw new Error(payload?.error || 'Unable to publish this thought.');
            }

            setThoughts((current) => [payload.data, ...current]);
            setContent('');
            setQuotedThought(null);
            pending.clear();
            setUploadProgress(0);
            setNotice({ kind: 'success', text: 'Published. It is live on your public feed.' });
        } catch (error) {
            setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to publish this thought.' });
        } finally {
            setIsPublishing(false);
        }
    };

    const quoteThought = (thought: RandomThought) => {
        setQuotedThought(thought);
        setNotice(null);
        requestAnimationFrame(() => {
            composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            contentRef.current?.focus({ preventScroll: true });
        });
    };

    return (
        <div className="space-y-10">
            <form ref={composerRef} onSubmit={publish} className="scroll-mt-6 overflow-hidden rounded-[30px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(28,25,23,0.10)]">
                <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#e85d36] shadow-[0_0_0_5px_rgba(232,93,54,0.12)]" />
                        <div>
                            <p className="text-sm font-bold text-stone-900">New thought</p>
                            <p className="text-[11px] font-medium text-stone-400">Private draft until you publish</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-500">Draft</span>
                </div>

                <div className="p-5 sm:p-7">
                    <textarea
                        ref={contentRef}
                        id="thought-content"
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={3000}
                        rows={6}
                        disabled={isPublishing}
                        placeholder="What is on your mind? No pressure, no performance..."
                        className="w-full resize-y border-0 bg-transparent text-lg leading-8 text-stone-900 outline-none placeholder:text-stone-300 sm:text-xl"
                    />
                    <div className="mb-5 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] font-medium text-stone-400">
                        <span>Text is optional when media or a quoted post is attached</span>
                        <span>{content.length} / 3000</span>
                    </div>

                    {quotedThought ? (
                        <div className="mb-5">
                            <QuotedThoughtPreview
                                quote={toQuotePreview(quotedThought)}
                                removable
                                onRemove={() => setQuotedThought(null)}
                            />
                        </div>
                    ) : null}

                    <MediaDropzone
                        attachments={pending.items}
                        disabled={isPublishing}
                        onFiles={onFiles}
                        onRemove={pending.remove}
                    />

                    {isPublishing && pending.items.length > 0 ? (
                        <div className="mt-5">
                            <div className="mb-2 flex justify-between text-[11px] font-bold text-stone-500">
                                <span>Uploading directly to R2</span>
                                <span>{Math.round(uploadProgress * 100)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                                <div className="h-full rounded-full bg-[#e85d36] transition-[width]" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
                            </div>
                        </div>
                    ) : null}

                    {notice ? (
                        <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
                            notice.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                            {notice.text}
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/80 px-5 py-4 sm:px-7">
                    <p className="text-xs font-medium text-stone-500">
                        {pending.items.length === 0
                            ? quotedThought ? `Quoting post #${quotedThought.id}` : 'No media selected'
                            : `${pending.items.length} attachment${pending.items.length === 1 ? '' : 's'} ready`}
                    </p>
                    <div className="flex items-center gap-2">
                        {(content || pending.items.length > 0 || quotedThought) ? (
                            <button
                                type="button"
                                disabled={isPublishing}
                                onClick={clearDraft}
                                className="rounded-xl px-4 py-2.5 text-sm font-bold text-stone-500 hover:bg-stone-200/70 disabled:opacity-50"
                            >
                                Clear
                            </button>
                        ) : null}
                        <button
                            type="submit"
                            disabled={isPublishing || (!content.trim() && pending.items.length === 0 && !quotedThought)}
                            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"
                        >
                            {isPublishing ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={16} />}
                            {isPublishing ? (pending.items.length ? `Uploading ${Math.round(uploadProgress * 100)}%` : 'Publishing...') : 'Publish thought'}
                        </button>
                    </div>
                </div>
            </form>

            <section className="mx-auto w-full max-w-[780px]">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d94722]">Your archive</p>
                        <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-950">Published thoughts</h2>
                    </div>
                    <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-bold text-stone-500">
                        {hasArchiveFilters ? `${filteredThoughts.length} of ${thoughts.length}` : `${thoughts.length} total`}
                    </span>
                </div>

                <div className="mb-5 rounded-[24px] border border-stone-200 bg-white p-3 shadow-[0_12px_40px_rgba(28,25,23,0.06)] sm:p-4">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                        <div>
                            <label htmlFor="archive-search" className="sr-only">Search published thoughts with a regular expression</label>
                            <div className={`flex min-h-12 items-center gap-3 rounded-2xl border bg-white px-4 transition focus-within:ring-4 focus-within:ring-[#e85d36]/10 ${
                                searchPattern.error ? 'border-red-300' : 'border-stone-200 focus-within:border-stone-400'
                            }`}>
                                <Search size={18} className="shrink-0 text-[#d94722]" />
                                <input
                                    id="archive-search"
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search text or regex, e.g. video|journal"
                                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-stone-900 outline-none placeholder:font-medium placeholder:text-stone-400"
                                />
                                {searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear archive search"
                                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-800"
                                    >
                                        <X size={14} />
                                    </button>
                                ) : null}
                            </div>
                            {searchPattern.error ? <p className="mt-1.5 px-1 text-xs font-semibold text-red-600">{searchPattern.error}</p> : null}
                        </div>

                        <DateTimeRangeFilter value={dateRange} onChange={setDateRange} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
                        <p className="text-[11px] font-medium text-stone-400">
                            Text patterns are case-insensitive. Dates use your device time zone.
                        </p>
                        {hasArchiveFilters ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setDateRange({ start: null, end: null });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-600 hover:bg-stone-100"
                            >
                                <X size={12} /> Clear all filters
                            </button>
                        ) : null}
                    </div>
                </div>

                {filteredThoughts.length > 0 ? (
                    <div className="space-y-5">
                        {filteredThoughts.map((thought) => (
                            <ThoughtManager
                                key={thought.id}
                                thought={thought}
                                onQuote={quoteThought}
                                onSaved={(updated) => {
                                    setThoughts((current) => current.map((item) => {
                                        if (item.id === updated.id) return updated;
                                        if (item.quotedThought?.id === updated.id) {
                                            return { ...item, quotedThought: toQuotePreview(updated) };
                                        }
                                        return item;
                                    }));
                                    setQuotedThought((current) => current?.id === updated.id ? updated : current);
                                }}
                                onDeleted={(id) => {
                                    setThoughts((current) => current
                                        .filter((item) => item.id !== id)
                                        .map((item) => item.quotedThought?.id === id
                                            ? { ...item, quotedThought: null }
                                            : item));
                                    setQuotedThought((current) => current?.id === id ? null : current);
                                }}
                            />
                        ))}
                    </div>
                ) : thoughts.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
                        <p className="text-base font-bold text-stone-700">Nothing published yet.</p>
                        <p className="mt-1 text-sm text-stone-400">Your first thought will appear here and on the public feed.</p>
                    </div>
                ) : (
                    <div className="rounded-[26px] border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
                        <p className="text-base font-bold text-stone-700">No thoughts match these filters.</p>
                        <p className="mt-1 text-sm text-stone-400">Try a broader pattern or clear the date and time range.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
