import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

const CORS_RULE_ID = 'random-thoughts-direct-upload';

function loadEnvFile() {
    const envFilePath = resolve(process.cwd(), '.env');
    if (!existsSync(envFilePath)) return;

    const envContents = readFileSync(envFilePath, 'utf8');
    envContents.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const delimiter = trimmed.indexOf('=');
        if (delimiter === -1) return;

        const key = trimmed.slice(0, delimiter).trim();
        let value = trimmed.slice(delimiter + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key && process.env[key] === undefined) process.env[key] = value;
    });
}

function getR2Settings() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
        throw new Error('R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT are required.');
    }

    const parsedEndpoint = new URL(endpoint);
    const endpointSegments = parsedEndpoint.pathname.split('/').filter(Boolean);
    const bucketName = (process.env.R2_BUCKET_NAME || endpointSegments.at(-1) || '').trim();
    if (!bucketName) {
        throw new Error('R2 bucket name is missing. Set R2_BUCKET_NAME or include it in R2_ENDPOINT.');
    }

    const endpointBasePath = endpointSegments.slice(0, -1).join('/');
    const normalizedEndpoint = endpointSegments.length > 0
        ? `${parsedEndpoint.protocol}//${parsedEndpoint.host}${endpointBasePath ? `/${endpointBasePath}` : ''}`
        : parsedEndpoint.origin;

    return {
        bucketName,
        client: new S3Client({
            region: 'auto',
            endpoint: normalizedEndpoint,
            forcePathStyle: true,
            requestChecksumCalculation: 'WHEN_REQUIRED',
            credentials: { accessKeyId, secretAccessKey },
        }),
    };
}

function getAllowedOrigins() {
    const configuredOrigins = process.env.R2_CORS_ORIGINS?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) || [];
    const inferredOrigins = [
        process.env.BETTER_AUTH_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.NEXT_PUBLIC_SITE_URL,
        'https://prosamik.com',
        'https://www.prosamik.com',
        'http://localhost:3000',
    ].filter(Boolean);

    const origins = new Set([...configuredOrigins, ...inferredOrigins].map((value) => new URL(value).origin));
    return Array.from(origins);
}

async function configureCors() {
    loadEnvFile();
    const { bucketName, client } = getR2Settings();
    const allowedOrigins = getAllowedOrigins();
    let existingRules = [];

    try {
        const existingPolicy = await client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
        existingRules = existingPolicy.CORSRules || [];
    } catch (error) {
        const errorName = error && typeof error === 'object' && 'name' in error ? error.name : '';
        if (errorName !== 'NoSuchCORSConfiguration' && errorName !== 'NoSuchCORS') throw error;
    }

    await client.send(new PutBucketCorsCommand({
        Bucket: bucketName,
        CORSConfiguration: {
            CORSRules: [
                ...existingRules.filter((rule) => rule.ID !== CORS_RULE_ID),
                {
                ID: CORS_RULE_ID,
                AllowedOrigins: allowedOrigins,
                AllowedMethods: ['GET', 'HEAD', 'PUT'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
                },
            ],
        },
    }));

    console.log(`[r2:cors] Applied direct-upload CORS policy for: ${allowedOrigins.join(', ')}`);
}

configureCors().catch((error) => {
    console.error('[r2:cors] Failed to configure the bucket CORS policy.', error);
    process.exit(1);
});
