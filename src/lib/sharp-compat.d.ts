/**
 * sharp@0.35.0 ships its declarations at lib/index.d.ts but omits a `types`
 * condition from `exports`, so TypeScript 5's bundler resolver cannot discover
 * them. Keep the small server-side surface used here accurately typed until
 * the dependency publishes a resolvable declaration entry.
 */
declare module 'sharp' {
    type SharpInputOptions = {
        failOn?: 'none' | 'truncated' | 'error' | 'warning';
        limitInputPixels?: number;
        animated?: boolean;
    };

    type SharpMetadata = {
        format?: string;
        pages?: number;
    };

    type SharpPipeline = {
        metadata(): Promise<SharpMetadata>;
        rotate(): SharpPipeline;
        resize(options: {
            width: number;
            height: number;
            fit: 'inside';
            withoutEnlargement: boolean;
        }): SharpPipeline;
        webp(options: { quality: number; effort: number }): SharpPipeline;
        toBuffer(): Promise<Buffer>;
    };

    export default function sharp(input: Buffer, options?: SharpInputOptions): SharpPipeline;
}
