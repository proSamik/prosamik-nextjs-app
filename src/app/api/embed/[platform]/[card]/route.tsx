import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import {
    buildRollingGraph,
    formatCardStreak,
    githubShareableData,
    youtubeShareableData,
    type ConsistencyCardKind,
    type ConsistencyPlatform,
    type ShareableConsistencyData,
} from '@/lib/consistencyCardData';
import {
    emptyGitHubConsistencyData,
    emptyYouTubeConsistencyData,
} from '@/lib/consistencyFallbacks';
import {
    EMBED_CACHE_SECONDS,
    getCachedGitHubConsistencyData,
    getCachedYouTubeConsistencyData,
} from '@/lib/consistencyEmbed';

interface ImageRouteContext {
    params: Promise<{ platform: string; card: string }>;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const imageHeaders = {
    'Cache-Control': `public, max-age=${EMBED_CACHE_SECONDS}, s-maxage=${EMBED_CACHE_SECONDS}, stale-while-revalidate=86400`,
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
};

function isPlatform(value: string): value is ConsistencyPlatform {
    return value === 'github' || value === 'youtube';
}

function isCard(value: string): value is ConsistencyCardKind {
    return value === 'graph' || value === 'streak';
}

function PlatformIcon({ platform }: { platform: ConsistencyPlatform }) {
    if (platform === 'youtube') {
        return (
            <svg width="25" height="18" viewBox="0 0 29 20">
                <path fill="#ef0016" d="M28.4 3.1A3.7 3.7 0 0 0 25.8.5C23.5 0 14.5 0 14.5 0S5.5 0 3.2.5A3.7 3.7 0 0 0 .6 3.1C0 5.4 0 10 0 10s0 4.6.6 6.9a3.7 3.7 0 0 0 2.6 2.6c2.3.5 11.3.5 11.3.5s9 0 11.3-.5a3.7 3.7 0 0 0 2.6-2.6c.6-2.3.6-6.9.6-6.9s0-4.6-.6-6.9Z" />
                <path fill="#fff" d="m11.6 14.3 7.5-4.3-7.5-4.3v8.6Z" />
            </svg>
        );
    }

    return (
        <svg width="22" height="22" viewBox="0 0 16 16" fill="#111827">
            <path d="M8 0C3.58 0 0 3.64 0 8.13c0 3.59 2.29 6.63 5.47 7.71.4.08.55-.18.55-.39 0-.19-.01-.83-.01-1.51-2.01.38-2.53-.5-2.69-.96-.09-.24-.48-.97-.82-1.16-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.83.72 1.23 1.87.88 2.33.67.07-.53.28-.88.51-1.08-1.78-.21-3.64-.91-3.64-4.02 0-.89.31-1.62.82-2.19-.08-.2-.36-1.04.08-2.16 0 0 .67-.22 2.2.84A7.5 7.5 0 0 1 8 3.91c.68 0 1.36.09 2 .27 1.53-1.06 2.2-.84 2.2-.84.44 1.12.16 1.96.08 2.16.51.57.82 1.3.82 2.19 0 3.12-1.87 3.81-3.65 4.02.29.25.54.74.54 1.51 0 1.09-.01 1.96-.01 2.23 0 .21.15.47.55.39A8.13 8.13 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z" />
        </svg>
    );
}

function Header({ data }: { data: ShareableConsistencyData }) {
    return (
        <div style={{
            height: 54,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #dfe3e8',
            padding: '0 20px',
        }}>
            <PlatformIcon platform={data.platform} />
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>{data.platformName}</span>
                <span style={{ fontSize: 12, color: '#667085' }}>{data.profileLabel}</span>
            </div>
        </div>
    );
}

function Frame({ children }: { children: ReactNode }) {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: 'transparent',
            fontFamily: 'Arial, sans-serif',
        }}>
            <div style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid #dfe3e8',
                borderRadius: 12,
                background: '#ffffff',
            }}>
                {children}
            </div>
        </div>
    );
}

function StreakImage({ data }: { data: ShareableConsistencyData }) {
    const stats = [
        { value: data.total.toLocaleString('en-US'), label: data.totalLabel, range: data.totalRange },
        { value: data.currentStreak.length, label: 'Current Streak', range: formatCardStreak(data.currentStreak), accent: true },
        { value: data.longestStreak.length, label: 'Longest Streak', range: formatCardStreak(data.longestStreak) },
    ];
    const columnStyle: CSSProperties = {
        width: '33.333%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    };

    return (
        <Frame>
            <Header data={data} />
            <div style={{ display: 'flex', flex: 1 }}>
                {stats.map((stat, index) => (
                    <div key={stat.label} style={{
                        ...columnStyle,
                        ...(index === 0 ? {} : { borderLeft: '1px solid #dfe3e8' }),
                    }}>
                        {stat.accent ? (
                            <div style={{
                                width: 66,
                                height: 66,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `4px solid ${data.accent}`,
                                borderRadius: 999,
                            }}>
                                <span style={{ fontSize: 26, fontWeight: 700, color: '#050505' }}>{stat.value}</span>
                            </div>
                        ) : (
                            <span style={{ fontSize: 30, fontWeight: 700, color: '#050505' }}>{stat.value}</span>
                        )}
                        <span style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: stat.accent ? data.accent : '#344054' }}>{stat.label}</span>
                        <span style={{ marginTop: 6, fontSize: 12, color: '#667085' }}>{stat.range}</span>
                    </div>
                ))}
            </div>
        </Frame>
    );
}

function GraphImage({ data }: { data: ShareableConsistencyData }) {
    const graph = buildRollingGraph(data.days);

    return (
        <Frame>
            <Header data={data} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '12px 20px 10px' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#344054' }}>
                    {graph.total.toLocaleString('en-US')} {data.activityName} in the last 365 days
                </span>
                <div style={{ display: 'flex', marginTop: 10 }}>
                    <div style={{ width: 36, display: 'flex', flexDirection: 'column', paddingTop: 17, gap: 9, fontSize: 10, color: '#667085' }}>
                        <span>Mon</span><span>Wed</span><span>Fri</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 17, display: 'flex' }}>
                            {graph.monthLabels.map((label, index) => (
                                <span key={`${label}-${index}`} style={{ width: 12, fontSize: 9, color: '#667085' }}>{label}</span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 2 }}>
                            {graph.weeks.map((week, weekIndex) => (
                                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {week.map((day, dayIndex) => (
                                        <span key={day?.date ?? `${weekIndex}-${dayIndex}`} style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 2,
                                            background: day ? data.colors[day.level] : 'transparent',
                                        }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8, fontSize: 10, color: '#667085' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ marginRight: 3 }}>Less</span>
                        {data.colors.map((color) => <span key={color} style={{ width: 9, height: 9, borderRadius: 2, background: color }} />)}
                        <span style={{ marginLeft: 3 }}>More</span>
                    </div>
                </div>
            </div>
        </Frame>
    );
}

async function loadData(platform: ConsistencyPlatform) {
    if (platform === 'github') {
        try {
            return githubShareableData(await getCachedGitHubConsistencyData());
        } catch (error) {
            console.error('Unable to render cached GitHub image:', error);
            return githubShareableData(emptyGitHubConsistencyData);
        }
    }

    try {
        return youtubeShareableData(await getCachedYouTubeConsistencyData());
    } catch (error) {
        console.error('Unable to render cached YouTube image:', error);
        return youtubeShareableData(emptyYouTubeConsistencyData);
    }
}

export async function GET(_request: Request, context: ImageRouteContext) {
    const { platform, card } = await context.params;
    if (!isPlatform(platform) || !isCard(card)) notFound();

    const data = await loadData(platform);
    return new ImageResponse(
        card === 'graph' ? <GraphImage data={data} /> : <StreakImage data={data} />,
        {
            width: card === 'graph' ? 800 : 760,
            height: card === 'graph' ? 240 : 220,
            headers: imageHeaders,
        }
    );
}
