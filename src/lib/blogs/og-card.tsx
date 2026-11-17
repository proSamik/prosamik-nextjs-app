import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Social-share cards for the blog, generated at build time with next/og (like Vercel's dynamic OG images).
// 1200x630, white studio look with a faint black grid and colour glows to match the site.

export const OG_SIZE = { width: 1200, height: 630 } as const;

const CATEGORY: Record<string, { ink: string; tint: string; glow: string }> = {
    'VM test automation': { ink: '#1d4ed8', tint: '#e8f0ff', glow: '#1d4ed833' },
    'MCP servers': { ink: '#be123c', tint: '#ffe9ee', glow: '#f43f5e33' },
    'Remote access': { ink: '#15803d', tint: '#e6f6ec', glow: '#16a34a33' },
    Deployment: { ink: '#c2410c', tint: '#fff0e5', glow: '#e8590c38' },
};
const FALLBACK = { ink: '#111111', tint: '#f1f1f1', glow: '#00000014' };

const dataUri = (buffer: Buffer, mime: string) => `data:${mime};base64,${buffer.toString('base64')}`;

function titleSize(title: string): number {
    if (title.length <= 48) return 76;
    if (title.length <= 72) return 64;
    if (title.length <= 100) return 54;
    return 46;
}

export async function renderOgCard({ kicker, title, meta }: { kicker: string; title: string; meta: string[] }) {
    // Literal paths on purpose: a path built from a variable makes the bundler trace the whole project.
    const [bold, regular, icon, avatar] = await Promise.all([
        readFile(path.join(process.cwd(), 'src/assets/og/inter-700.woff')),
        readFile(path.join(process.cwd(), 'src/assets/og/inter-400.woff')),
        readFile(path.join(process.cwd(), 'public/icon.png')),
        readFile(path.join(process.cwd(), 'public/me-here.jpg')),
    ]);
    const tone = CATEGORY[kicker] ?? FALLBACK;
    const clipped = title.length > 118 ? `${title.slice(0, 115).trimEnd()}…` : title;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
                    padding: '60px 80px', background: '#ffffff', fontFamily: 'Inter',
                    backgroundImage: 'linear-gradient(#0000000d 1px, transparent 1px), linear-gradient(90deg, #0000000d 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', backgroundImage: `radial-gradient(circle at 0% 0%, ${tone.glow} 0%, #ffffff00 45%), radial-gradient(circle at 100% 100%, ${tone.glow} 0%, #ffffff00 45%)` }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dataUri(icon, 'image/png')} width={48} height={48} alt="" />
                        <div style={{ marginLeft: 14, fontSize: 36, fontWeight: 700, color: '#111111', letterSpacing: -1 }}>prosamik</div>
                    </div>
                    <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, background: tone.tint, color: tone.ink, fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{kicker}</div>
                </div>
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
                    <div style={{ display: 'flex', maxWidth: 1000, fontSize: titleSize(clipped), fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, color: '#111111' }}>{clipped}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dataUri(avatar, 'image/jpeg')} width={56} height={56} alt="" style={{ borderRadius: 999, objectFit: 'cover' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 16 }}>
                            <div style={{ fontSize: 26, fontWeight: 700, color: '#111111' }}>Samik Choudhury</div>
                            <div style={{ fontSize: 21, fontWeight: 400, color: '#6b6b6b', marginTop: 2 }}>{meta.join('  ·  ')}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#6b6b6b' }}>prosamik.com/blogs</div>
                </div>
            </div>
        ),
        {
            ...OG_SIZE,
            fonts: [
                { name: 'Inter', data: bold, weight: 700, style: 'normal' },
                { name: 'Inter', data: regular, weight: 400, style: 'normal' },
            ],
        },
    );
}
