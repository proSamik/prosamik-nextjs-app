'use client';

import { Player } from '@remotion/player';
import { LoaderCircle } from 'lucide-react';
import { AbsoluteFill, Html5Video } from 'remotion';
import { useEffect, useState } from 'react';

const PLAYER_FPS = 30;

type PostVideoPlayerProps = {
    src: string;
    className?: string;
};

type VideoMetadata = {
    durationInFrames: number;
    width: number;
    height: number;
};

type PostVideoCompositionProps = {
    src: string;
};

const metadataCache = new Map<string, Promise<VideoMetadata>>();

function PostVideoComposition({ src }: PostVideoCompositionProps) {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            <Html5Video
                src={src}
                playsInline
                preload="metadata"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
        </AbsoluteFill>
    );
}

function readMetadataWithBrowser(src: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const cleanup = () => {
            clearTimeout(timeout);
            video.onloadedmetadata = null;
            video.onerror = null;
            video.removeAttribute('src');
            video.load();
        };
        const fail = (message: string) => {
            cleanup();
            reject(new Error(message));
        };
        const timeout = setTimeout(() => fail('The video metadata request timed out.'), 15_000);
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            if (!Number.isFinite(video.duration) || video.duration <= 0) {
                fail('The browser could not determine the video duration.');
                return;
            }

            const metadata = {
                durationInFrames: Math.max(1, Math.ceil(video.duration * PLAYER_FPS)),
                width: video.videoWidth || 1920,
                height: video.videoHeight || 1080,
            };
            cleanup();
            resolve(metadata);
        };
        video.onerror = () => fail('The video metadata could not be loaded.');
        video.src = src;
    });
}

function readVideoMetadata(src: string): Promise<VideoMetadata> {
    const cached = metadataCache.get(src);
    if (cached) return cached;

    const request = readMetadataWithBrowser(src).catch((error) => {
        if (metadataCache.get(src) === request) metadataCache.delete(src);
        throw error;
    });
    metadataCache.set(src, request);
    return request;
}

export default function PostVideoPlayer({ src, className = '' }: PostVideoPlayerProps) {
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setMetadata(null);
        setFailed(false);

        readVideoMetadata(src)
            .then((result) => {
                if (!cancelled) setMetadata(result);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [src]);

    if (failed) {
        return (
            <div className={`grid h-full w-full place-items-center bg-black px-6 text-center text-xs font-semibold text-white/70 ${className}`}>
                This video could not be loaded.
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className={`grid h-full w-full place-items-center bg-black text-white/70 ${className}`} aria-label="Loading video player">
                <LoaderCircle className="animate-spin" size={24} />
            </div>
        );
    }

    return (
        <div className={`h-full w-full bg-black ${className}`}>
            <Player
                component={PostVideoComposition}
                inputProps={{ src }}
                durationInFrames={metadata.durationInFrames}
                compositionWidth={metadata.width}
                compositionHeight={metadata.height}
                fps={PLAYER_FPS}
                controls
                clickToPlay
                doubleClickToFullscreen
                allowFullscreen
                showVolumeControls
                acknowledgeRemotionLicense
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
}
