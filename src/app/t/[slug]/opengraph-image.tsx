import { ImageResponse } from 'next/og';
import { getRandomThoughtBySlug } from '@/lib/random-thoughts';

export const runtime = 'nodejs';
export const revalidate = 120;
export const alt = 'A random thought by Samik';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type OpenGraphImageProps = {
    params: Promise<{ slug: string }>;
};

function compactText(content: string, maximumLength: number): string {
    const text = content.replace(/\s+/g, ' ').trim();
    if (text.length <= maximumLength) return text;
    return `${text.slice(0, maximumLength - 1).trimEnd()}…`;
}

function formatPostedAt(dateIso: string, timeZone: string): string {
    let safeTimeZone = timeZone;
    try {
        new Intl.DateTimeFormat('en-GB', { timeZone }).format();
    } catch {
        safeTimeZone = 'UTC';
    }

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: safeTimeZone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date(dateIso));
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
    const { slug } = await params;
    const thought = await getRandomThoughtBySlug(slug);
    const sourceText = thought?.content || thought?.quotedThought?.content || 'A random thought by Samik.';
    const text = compactText(sourceText, 320);
    const postedAt = thought ? formatPostedAt(thought.createdAt, thought.createdTimeZone) : '';
    const fontSize = text.length > 220 ? 44 : text.length > 120 ? 52 : 62;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    padding: '52px',
                    background: '#f5f5f4',
                    color: '#0c0a09',
                    fontFamily: 'Arial, sans-serif',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: '2px solid #d6d3d1',
                        borderRadius: '36px',
                        background: '#ffffff',
                        padding: '46px 52px',
                        boxShadow: '0 20px 60px rgba(28, 25, 23, 0.08)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div
                                style={{
                                    width: '54px',
                                    height: '54px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '999px',
                                    background: '#0c0a09',
                                    color: '#ffffff',
                                    fontSize: '25px',
                                    fontWeight: 800,
                                }}
                            >
                                S
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '25px', fontWeight: 800 }}>Samik</div>
                                <div style={{ marginTop: '4px', color: '#78716c', fontSize: '18px' }}>{postedAt}</div>
                            </div>
                        </div>
                        <div style={{ color: '#a8a29e', fontSize: '17px', fontWeight: 700, letterSpacing: '0.16em' }}>
                            RANDOM THOUGHT
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            maxWidth: '1020px',
                            fontSize: `${fontSize}px`,
                            fontWeight: 750,
                            lineHeight: 1.18,
                            letterSpacing: '-0.025em',
                        }}
                    >
                        {text}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c', fontSize: '18px', fontWeight: 650 }}>
                        <div>prosamik.com</div>
                        <div>/t/{slug}</div>
                    </div>
                </div>
            </div>
        ),
        size,
    );
}
