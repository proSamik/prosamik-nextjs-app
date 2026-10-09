'use client';

import { useState } from 'react';

export type DailyChartPoint = {
    date: string;
    value: number;
    details?: string[];
};
const dayMs = 86400000;
export function DailyLineChart({
    points,
    from,
    to,
    unit,
    label,
    emptyDetails = {},
}: {
    points: DailyChartPoint[];
    from: string;
    to: string;
    unit: string;
    label: string;
    emptyDetails?: Record<string, string[]>;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const count = Math.max(
        1,
        Math.round((Date.parse(to) - Date.parse(from)) / dayMs),
    );
    const left = 70,
        right = 900,
        top = 28,
        bottom = 244;
    const low = Math.min(...points.map((p) => p.value));
    const high = Math.max(...points.map((p) => p.value));
    const padding = Math.max((high - low) * 0.15, high * 0.02, 1);
    const min = Math.max(0, low - padding),
        max = high + padding;
    const x = (date: string) =>
        left +
        ((Date.parse(date) - Date.parse(from)) / dayMs / count) *
            (right - left);
    const y = (value: number) =>
        bottom - ((value - min) / (max - min)) * (bottom - top);
    const date =
        hover === null
            ? ''
            : new Date(Date.parse(from) + hover * dayMs)
                  .toISOString()
                  .slice(0, 10);
    const selected = points.filter((p) => p.date === date);
    const details = selected.length
        ? selected.flatMap((p) => [
              `${p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`,
              ...(p.details ?? []),
          ])
        : (emptyDetails[date] ?? ['No entry recorded for this day.']);
    const percent = hover === null ? 0 : (x(date) / 940) * 100;
    return (
        <figure aria-label={label} className="relative">
            <svg
                viewBox="0 0 940 286"
                preserveAspectRatio="none"
                className="h-72 w-full rounded-xl border border-stone-200 bg-stone-50"
                role="group"
                aria-label={label}
                onPointerLeave={() => setHover(null)}
            >
                {[0, 1, 2, 3].map((i) => {
                    const value = min + ((max - min) * i) / 3;
                    return (
                        <g key={i}>
                            <line
                                x1={left}
                                x2={right}
                                y1={y(value)}
                                y2={y(value)}
                                stroke="#d6d3d1"
                                strokeDasharray="3 5"
                            />
                            <text
                                x={left - 12}
                                y={y(value) + 4}
                                textAnchor="end"
                                fontSize="12"
                                fill="#57534e"
                            >
                                {value.toLocaleString(undefined, {
                                    maximumFractionDigits: 1,
                                })}
                            </text>
                        </g>
                    );
                })}
                <path
                    d={points
                        .map(
                            (p, i) =>
                                `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`,
                        )
                        .join(' ')}
                    fill="none"
                    stroke="#429367"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />
                {points.map((p, i) => (
                    <circle
                        key={`${p.date}-${i}`}
                        cx={x(p.date)}
                        cy={y(p.value)}
                        r="4"
                        fill="white"
                        stroke="#429367"
                        strokeWidth="2"
                    />
                ))}
                {hover !== null && (
                    <line
                        x1={x(date)}
                        x2={x(date)}
                        y1={top}
                        y2={bottom}
                        stroke="#78716c"
                        strokeDasharray="4 4"
                    />
                )}
                <text x={left} y="272" fontSize="12" fill="#57534e">
                    {from}
                </text>
                <text
                    x={right}
                    y="272"
                    textAnchor="end"
                    fontSize="12"
                    fill="#57534e"
                >
                    {to}
                </text>
                <rect
                    x={left}
                    y={top}
                    width={right - left}
                    height={bottom - top}
                    fill="transparent"
                    tabIndex={0}
                    role="slider"
                    aria-label="Explore chart by day; use left and right arrows"
                    aria-valuemin={0}
                    aria-valuemax={count}
                    aria-valuenow={hover ?? 0}
                    aria-valuetext={
                        date ? `${date}: ${details.join('. ')}` : from
                    }
                    onFocus={() => setHover((current) => current ?? 0)}
                    onBlur={() => setHover(null)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            e.preventDefault();
                            setHover((v) =>
                                Math.max(
                                    0,
                                    Math.min(
                                        count,
                                        (v ?? 0) +
                                            (e.key === 'ArrowLeft' ? -1 : 1),
                                    ),
                                ),
                            );
                        }
                    }}
                    onPointerMove={(e) => {
                        const bounds =
                            e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                        const cursor =
                            ((e.clientX - bounds.left) / bounds.width) * 940;
                        setHover(
                            Math.max(
                                0,
                                Math.min(
                                    count,
                                    Math.round(
                                        ((cursor - left) / (right - left)) *
                                            count,
                                    ),
                                ),
                            ),
                        );
                    }}
                />
            </svg>
            {hover !== null && (
                <div
                    role="status"
                    className="pointer-events-none absolute top-2 z-10 max-h-64 w-64 overflow-hidden rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-lg"
                    style={{
                        left: `${Math.min(100, Math.max(0, percent))}%`,
                        transform:
                            percent > 65
                                ? 'translateX(-100%)'
                                : percent < 25
                                  ? 'none'
                                  : 'translateX(-50%)',
                    }}
                >
                    <strong className="block mb-2">{date} · IST</strong>
                    {details.map((text, i) => (
                        <p key={i} className="mt-1">
                            {text}
                        </p>
                    ))}
                </div>
            )}
            <figcaption className="mt-2 text-xs text-stone-500">
                Move across the chart to inspect each day. The line connects
                recorded totals; missing days have no recorded value.
            </figcaption>
        </figure>
    );
}
