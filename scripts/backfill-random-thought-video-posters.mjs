import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pg from 'pg';

const { Pool } = pg;

function createDatabasePool(databaseUrl) {
    const parsedUrl = new URL(databaseUrl);
    const sslMode = parsedUrl.searchParams.get('sslmode');
    const usesLibpqCompatibility = parsedUrl.searchParams.get('uselibpqcompat') === 'true';

    if (!usesLibpqCompatibility && sslMode && ['prefer', 'require', 'verify-ca'].includes(sslMode)) {
        parsedUrl.searchParams.set('sslmode', 'verify-full');
    }

    return new Pool({ connectionString: parsedUrl.toString(), max: 2 });
}

function getR2Config() {
    const publicUrl = process.env.R2_PUBLIC_URL;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl || !accessKeyId || !secretAccessKey || !endpoint || !publicUrl) {
        throw new Error('DATABASE_URL and R2 credentials are required.');
    }

    const parsedEndpoint = new URL(endpoint);
    const endpointSegments = parsedEndpoint.pathname.split('/').filter(Boolean);
    const bucketName = (process.env.R2_BUCKET_NAME || endpointSegments.at(-1) || '').trim();
    if (!bucketName) throw new Error('R2_BUCKET_NAME is required.');

    const endpointBasePath = endpointSegments.slice(0, -1).join('/');
    const normalizedEndpoint = endpointSegments.length > 0
        ? `${parsedEndpoint.protocol}//${parsedEndpoint.host}${endpointBasePath ? `/${endpointBasePath}` : ''}`
        : parsedEndpoint.origin;

    return {
        databaseUrl,
        bucketName,
        publicUrlBase: publicUrl.replace(/\/$/, ''),
        s3Client: new S3Client({
            region: 'auto',
            forcePathStyle: true,
            endpoint: normalizedEndpoint,
            credentials: { accessKeyId, secretAccessKey },
        }),
    };
}

function runFfmpeg(inputUrl, outputPath, seekSeconds) {
    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-y',
            '-ss', String(seekSeconds),
            '-i', inputUrl,
            '-frames:v', '1',
            '-vf', 'scale=1600:-2:force_original_aspect_ratio=decrease',
            '-q:v', '3',
            outputPath,
        ], { stdio: ['ignore', 'ignore', 'pipe'] });

        let errorOutput = '';
        child.stderr.on('data', (chunk) => {
            errorOutput += chunk.toString();
        });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(errorOutput.trim() || `ffmpeg exited with code ${code}.`));
        });
    });
}

async function capturePoster(inputUrl, outputPath) {
    try {
        await runFfmpeg(inputUrl, outputPath, 1);
    } catch {
        await runFfmpeg(inputUrl, outputPath, 0);
    }
}

async function main() {
    const { databaseUrl, bucketName, publicUrlBase, s3Client } = getR2Config();
    const pool = createDatabasePool(databaseUrl);
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'prosamik-video-posters-'));
    let failures = 0;

    try {
        const result = await pool.query(`
            SELECT id, url
            FROM random_thought_media
            WHERE media_type = 'video'
              AND poster_url IS NULL
            ORDER BY id
        `);

        if (result.rows.length === 0) {
            console.log('[video-posters] Every video already has a poster.');
            return;
        }

        for (const row of result.rows) {
            const outputPath = join(temporaryDirectory, `${row.id}.jpg`);
            try {
                await capturePoster(row.url, outputPath);
                const objectKey = `random-thoughts/${Date.now()}-${randomUUID()}-poster.jpg`;
                await s3Client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: objectKey,
                    Body: await readFile(outputPath),
                    ContentType: 'image/jpeg',
                    CacheControl: 'public, max-age=31536000, immutable',
                }));
                const posterUrl = `${publicUrlBase}/${objectKey}`;
                await pool.query(
                    'UPDATE random_thought_media SET poster_url = $1 WHERE id = $2 AND poster_url IS NULL',
                    [posterUrl, row.id],
                );
                console.log(`[video-posters] Created poster for media ${row.id}.`);
            } catch (error) {
                failures += 1;
                console.error(`[video-posters] Failed media ${row.id}:`, error instanceof Error ? error.message : error);
            }
        }
    } finally {
        await pool.end();
        await rm(temporaryDirectory, { recursive: true, force: true });
    }

    if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
    console.error('[video-posters] Backfill failed:', error);
    process.exit(1);
});
