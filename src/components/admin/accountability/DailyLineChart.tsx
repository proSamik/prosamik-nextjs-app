'use client';

import { useEffect, useRef, useState } from 'react';

export type DailyChartPoint = {
    date: string;
    value: number;
    details?: string[];
};
const dayMs = 86400000;
const shortDate = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
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
    const figure = useRef<HTMLElement>(null);
    const [width, setWidth] = useState(600);
    const [hover, setHover] = useState<number | null>(null);
    useEffect(() => {
        const observer = new ResizeObserver(([entry]) =>
            setWidth(Math.max(240, entry.contentRect.width)),
        );
        if (figure.current) observer.observe(figure.current);
        return () => observer.disconnect();
    }, []);
    const count = Math.max(
        1,
        Math.round((Date.parse(to) - Date.parse(from)) / dayMs),
    );
    const visible = points
        .filter((p) => p.date >= from && p.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date));
    const left = unit === 'kcal' ? 60 : 48,
        right = width - 20,
        top = 32,
        bottom = 248;
    const low = Math.min(
        ...visible.map((p) => p.value),
        visible.length ? Infinity : 0,
    );
    const high = Math.max(
        ...visible.map((p) => p.value),
        visible.length ? -Infinity : 1,
    );
    const padding = Math.max(
        (high - low) * 0.15,
        high * 0.02,
        unit === 'kg' ? 0.2 : 1,
    );
    const min = Math.max(0, low - padding),
        max = high + padding;
    const x = (date: string) =>
        left +
        ((Date.parse(date) - Date.parse(from)) / dayMs / count) *
            (right - left);
    const y = (value: number) =>
        bottom - ((value - min) / (max - min)) * (bottom - top);
    const cursorDate =
        hover === null
            ? ''
            : new Date(Date.parse(from) + hover * dayMs)
                  .toISOString()
                  .slice(0, 10);
    const nearest =
        hover === null
            ? undefined
            : visible.reduce<DailyChartPoint | undefined>(
                  (best, point) =>
                      !best ||
                      Math.abs(
                          Date.parse(point.date) - Date.parse(cursorDate),
                      ) <
                          Math.abs(
                              Date.parse(best.date) - Date.parse(cursorDate),
                          )
                          ? point
                          : best,
                  undefined,
              );
    const date = nearest?.date ?? cursorDate;
    const details = nearest
        ? visible
              .filter((p) => p.date === date)
              .flatMap((p) => [
                  `${p.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`,
                  ...(p.details ?? []),
              ])
        : (emptyDetails[date] ?? ['No recorded values in this range.']);
    const selectAt = (clientX: number) => {
        const bounds = figure.current!.getBoundingClientRect();
        setHover(
            Math.max(
                0,
                Math.min(
                    count,
                    Math.round(
                        ((clientX - bounds.left - left) / (right - left)) *
                            count,
                    ),
                ),
            ),
        );
    };
    return (
        <figure
            ref={figure}
            aria-label={label}
            className="relative min-w-0"
            onPointerLeave={() => setHover(null)}
        >
            <svg
                viewBox={`0 0 ${width} 288`}
                className="h-72 w-full rounded-xl border border-stone-200 bg-stone-50"
                role="group"
                aria-label={label}
            >
                <text x={left} y={18} fontSize={11} fill="#78716c">
                    {unit}
                </text>
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
                                x={left - 10}
                                y={y(value) + 4}
                                textAnchor="end"
                                fontSize={12}
                                fill="#57534e"
                            >
                                {value.toLocaleString(undefined, {
                                    maximumFractionDigits:
                                        unit === 'kg' ? 1 : 0,
                                })}
                            </text>
                        </g>
                    );
                })}
                <path
                    d={visible
                        .map(
                            (p, i) =>
                                `${i ? 'L' : 'M'}${x(p.date)},${y(p.value)}`,
                        )
                        .join(' ')}
                    fill="none"
                    stroke="#429367"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                />
                {visible.map((p, i) => (
                    <circle
                        key={`${p.date}-${i}`}
                        cx={x(p.date)}
                        cy={y(p.value)}
                        r={date === p.date ? 5 : 3.5}
                        fill="white"
                        stroke="#429367"
                        strokeWidth={2}
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
                <text x={left} y={276} fontSize={12} fill="#57534e">
                    {shortDate(from)}
                </text>
                {width > 480 && (
                    <text
                        x={(left + right) / 2}
                        y={276}
                        fontSize={12}
                        textAnchor="middle"
                        fill="#57534e"
                    >
                        {shortDate(
                            new Date(
                                Date.parse(from) +
                                    Math.floor(count / 2) * dayMs,
                            )
                                .toISOString()
                                .slice(0, 10),
                        )}
                    </text>
                )}
                <text
                    x={right}
                    y={276}
                    textAnchor="end"
                    fontSize={12}
                    fill="#57534e"
                >
                    {shortDate(to)}
                </text>
                <rect
                    x={left}
                    y={top}
                    width={right - left}
                    height={bottom - top}
                    fill="transparent"
                    tabIndex={0}
                    role="slider"
                    aria-label="Explore recorded values; use left and right arrows"
                    aria-valuemin={0}
                    aria-valuemax={count}
                    aria-valuenow={hover ?? 0}
                    aria-valuetext={
                        date
                            ? `${shortDate(date)}: ${details.join('. ')}`
                            : shortDate(from)
                    }
                    onFocus={() => setHover(0)}
                    onBlur={() => setHover(null)}
                    onPointerMove={(e) => selectAt(e.clientX)}
                    onPointerDown={(e) => selectAt(e.clientX)}
                    onKeyDown={(e) => {
                        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')
                            return;
                        e.preventDefault();
                        const index = visible.findIndex((p) => p === nearest);
                        const next =
                            visible[
                                Math.max(
                                    0,
                                    Math.min(
                                        visible.length - 1,
                                        index +
                                            (e.key === 'ArrowLeft' ? -1 : 1),
                                    ),
                                )
                            ];
                        if (next)
                            setHover(
                                Math.round(
                                    (Date.parse(next.date) - Date.parse(from)) /
                                        dayMs,
                                ),
                            );
                    }}
                />
            </svg>
            {hover !== null && (
                <div
                    role="status"
                    className="absolute top-2 z-10 max-h-56 w-64 max-w-[calc(100%-16px)] overflow-y-auto overscroll-contain rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-lg"
                    style={{
                        left: Math.max(
                            8,
                            Math.min(
                                width - Math.min(256, width - 16) - 8,
                                x(date) - 128,
                            ),
                        ),
                    }}
                >
                    <strong className="mb-2 block">
                        {shortDate(date)} · IST
                    </strong>
                    {nearest && date !== cursorDate && (
                        <p className="mb-2 text-stone-500">
                            Nearest record to {shortDate(cursorDate)}
                        </p>
                    )}
                    {details.map((text, i) => (
                        <p key={i} className="mt-1">
                            {text}
                        </p>
                    ))}
                </div>
            )}
        </figure>
    );
}
