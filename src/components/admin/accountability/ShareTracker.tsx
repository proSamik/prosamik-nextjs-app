'use client';
import { Share2 } from 'lucide-react';
import { useState } from 'react';
/** Exports only the card the owner explicitly shares. No public URL is created. */
export default function ShareTracker({
    title,
    days,
    stats,
}: {
    title: string;
    days?: { date: string; status: string }[];
    stats?: { label: string; value: number }[];
}) {
    const [message, setMessage] = useState('');
    const share = async () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1100;
            canvas.height = days ? 320 : 240;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Image export unavailable.');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#111';
            ctx.font = 'bold 26px sans-serif';
            ctx.fillText(title, 32, 45);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText('IST · Selected tracker snapshot', 32, 72);
            if (days) {
                days.forEach((day, i) => {
                    ctx.fillStyle =
                        day.status === 'complete' ? '#00b983' : '#ebedf0';
                    ctx.fillRect(
                        32 + Math.floor(i / 7) * 19,
                        100 + (i % 7) * 20,
                        16,
                        16,
                    );
                });
                ctx.fillStyle = '#666';
                ctx.fillText(
                    `${days[0]?.date ?? ''} — ${days.at(-1)?.date ?? ''} · Completed / Incomplete / Not updated`,
                    32,
                    285,
                );
            }
            stats?.forEach((stat, i) => {
                ctx.fillStyle = '#111';
                ctx.font = 'bold 38px sans-serif';
                ctx.fillText(String(stat.value), 40 + i * 350, 140);
                ctx.font = '18px sans-serif';
                ctx.fillText(stat.label, 40 + i * 350, 180);
            });
            const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(
                    (value) =>
                        value
                            ? resolve(value)
                            : reject(new Error('Export failed.')),
                    'image/png',
                ),
            );
            const file = new File(
                [blob],
                `${title.replace(/[^a-z0-9]/gi, '-')}.png`,
                { type: 'image/png' },
            );
            if (navigator.canShare?.({ files: [file] }))
                await navigator.share({ title, files: [file] });
            else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = file.name;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            setMessage('Exported');
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : 'Export failed.',
            );
        }
    };
    return (
        <div className="absolute right-3 top-3 z-20">
            <button
                type="button"
                onClick={() => void share()}
                aria-label={`Share ${title} card`}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm"
            >
                <Share2 size={16} />
            </button>
            {message && (
                <span
                    role="status"
                    className="absolute right-0 top-10 w-44 rounded bg-white p-2 text-xs shadow"
                >
                    {message}
                </span>
            )}
        </div>
    );
}
