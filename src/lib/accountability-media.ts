import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/database';
import { assertActivityDate, databaseDateToActivityDate } from '@/lib/accountability-domain';
import { assertPrivateBucketIsDistinct } from '@/lib/accountability-media-config';
import {
    decodePrivateMediaCursor,
    encodePrivateMediaCursor,
    resolvePrivateMediaDateRange,
} from '@/lib/accountability-media-pagination';
import {
    digestMediaUploadIdempotencyKey,
    digestMediaUploadRequest,
    mediaUploadOperationKey,
    type AccountabilityMediaUploadSource,
} from '@/lib/accountability-media-idempotency';

/**
 * Server-side private media storage for the accountability feature.
 * Callers must pass the owner resolved by server authentication, never a client
 * supplied owner ID. This service intentionally has no public URL behavior.
 */

export const ACCOUNTABILITY_MEDIA_LIMITS = {
    imageBytes: 15 * 1024 * 1024,
    videoBytes: 100 * 1024 * 1024,
    uploadUrlSeconds: 5 * 60,
    readUrlSeconds: 5 * 60,
} as const;

export const ACCOUNTABILITY_MEDIA_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
] as const;

export type AccountabilityMediaContentType = typeof ACCOUNTABILITY_MEDIA_TYPES[number];
export type AccountabilityMediaCategory = 'body' | 'habit_evidence' | 'general';
export type AccountabilityMediaPose = 'front' | 'back' | 'left_side' | 'right_side' | 'other';

export type InitiateAccountabilityMediaUploadInput = {
    localDate: string;
    category: AccountabilityMediaCategory;
    pose?: AccountabilityMediaPose | null;
    privateNotes?: string | null;
    displayName?: string | null;
    contentType: AccountabilityMediaContentType;
    byteSize: number;
};

export type { AccountabilityMediaUploadSource } from '@/lib/accountability-media-idempotency';

export type PendingAccountabilityMediaUpload = {
    assetId: string;
    status: 'pending';
    uploadUrl: string;
    method: 'PUT';
    requiredHeaders: { 'Content-Type': AccountabilityMediaContentType };
    expiresInSeconds: number;
    contentType: AccountabilityMediaContentType;
    byteSize: number;
    duplicate: boolean;
};

export type ReadyAccountabilityMediaUpload = {
    assetId: string;
    status: 'ready';
    contentType: AccountabilityMediaContentType;
    byteSize: number;
    duplicate: true;
};

export type InitiatedAccountabilityMediaUpload = PendingAccountabilityMediaUpload | ReadyAccountabilityMediaUpload;

type MediaRow = {
    id: string;
    owner_id: string;
    created_at?: Date | string;
    local_date?: string | Date;
    category?: AccountabilityMediaCategory;
    pose?: AccountabilityMediaPose | null;
    private_notes?: string | null;
    display_name?: string | null;
    storage_provider?: 'r2' | 's3';
    object_key: string;
    content_type: string;
    byte_size: number | string;
    content_sha256: Buffer | Uint8Array | null;
    status: 'pending' | 'ready' | 'failed' | 'deleted';
};

type OwnerPrivateMediaRow = {
    id: string;
    local_date: string | Date;
    category: AccountabilityMediaCategory;
    pose: AccountabilityMediaPose | null;
    content_type: AccountabilityMediaContentType;
    byte_size: number | string;
    display_name: string | null;
    private_notes: string | null;
    status: 'pending' | 'ready' | 'failed' | 'deleted';
    uploaded_at: Date | string | null;
    created_at: Date | string;
    deleted_at: Date | string | null;
};

type PrivateR2Config = {
    bucket: string;
    client: S3Client;
};

let privateConfig: PrivateR2Config | null = null;

function assertServerRuntime(): void {
    if (typeof window !== 'undefined') {
        throw new Error('Private accountability media is server-only.');
    }
}

function getPrivateConfig(): PrivateR2Config {
    assertServerRuntime();
    if (privateConfig) return privateConfig;

    const bucket = assertPrivateBucketIsDistinct(
        process.env.SECURE_BUCKET,
        process.env.R2_BUCKET_NAME,
    );
    const endpointText = process.env.R2_ENDPOINT?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpointText || !accessKeyId || !secretAccessKey) {
        throw new Error('Private R2 is unavailable: SECURE_BUCKET and server-side R2 credentials must be configured.');
    }

    let endpoint: URL;
    try {
        endpoint = new URL(endpointText);
    } catch {
        throw new Error('Private R2 is unavailable: R2_ENDPOINT is invalid.');
    }
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password
        || endpoint.search || endpoint.hash || (endpoint.pathname !== '/' && endpoint.pathname !== '')) {
        throw new Error('Private R2 is unavailable: R2_ENDPOINT must be an HTTPS S3 endpoint without a path.');
    }

    privateConfig = {
        bucket,
        client: new S3Client({
            region: 'auto',
            forcePathStyle: true,
            endpoint: endpoint.origin,
            credentials: { accessKeyId, secretAccessKey },
        }),
    };
    return privateConfig;
}

function isAllowedType(value: string): value is AccountabilityMediaContentType {
    return (ACCOUNTABILITY_MEDIA_TYPES as readonly string[]).includes(value);
}

function sizeLimit(contentType: AccountabilityMediaContentType): number {
    return contentType.startsWith('image/')
        ? ACCOUNTABILITY_MEDIA_LIMITS.imageBytes
        : ACCOUNTABILITY_MEDIA_LIMITS.videoBytes;
}

function extensionFor(contentType: AccountabilityMediaContentType): string {
    switch (contentType) {
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/webp': return 'webp';
        case 'video/mp4': return 'mp4';
        case 'video/webm': return 'webm';
    }
}

function assertLocalDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('A valid local calendar date is required.');
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
        throw new RangeError('A valid local calendar date is required.');
    }
}

function cleanDisplayName(value: string | null | undefined): string | null {
    if (value == null) return null;
    const basename = value.replaceAll('\\', '/').split('/').pop() ?? '';
    const cleaned = [...basename]
        .filter((character) => {
            const code = character.charCodeAt(0);
            return code > 0x1f && code !== 0x7f;
        })
        .join('')
        .trim()
        .slice(0, 255);
    return cleaned || null;
}

function issuePrivateUploadUrl(
    config: PrivateR2Config,
    objectKey: string,
    contentType: AccountabilityMediaContentType,
    byteSize: number,
): Promise<string> {
    return getSignedUrl(config.client, new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
        ContentLength: byteSize,
        CacheControl: 'private, no-store',
    }), { expiresIn: ACCOUNTABILITY_MEDIA_LIMITS.uploadUrlSeconds });
}

function assertPendingUploadKey(row: MediaRow): void {
    if (row.storage_provider !== 'r2' || !isAllowedType(row.content_type)) {
        throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
    }
    const expectedKey = `${assetNamespace(row.id)}/incoming/${row.id}.${extensionFor(row.content_type)}`;
    if (row.status !== 'pending' || row.object_key !== expectedKey) {
        throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
    }
}

function assertResourceMatchesInput(
    row: MediaRow,
    input: InitiateAccountabilityMediaUploadInput,
): void {
    if (databaseDateToActivityDate(row.local_date as Date | string) !== input.localDate
        || row.category !== input.category
        || (row.pose ?? null) !== (input.pose ?? null)
        || (row.private_notes ?? null) !== (input.privateNotes ?? null)
        || (row.display_name ?? null) !== (input.displayName ?? null)
        || row.content_type !== input.contentType
        || Number(row.byte_size) !== input.byteSize) {
        throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
    }
}

function assetNamespace(assetId: string): string {
    // The UUID is generated for this asset only; it is not an owner ID/email.
    // The exact key is persisted on an owner-bound row and never recomputed
    // from rotating R2 credentials.
    return `accountability/private/v1/${assetId}`;
}

function assertOwnerKey(row: MediaRow, ownerId: string): void {
    getPrivateConfig();
    const prefix = `${assetNamespace(row.id)}/`;
    if (row.owner_id !== ownerId || row.storage_provider !== 'r2' || !row.object_key.startsWith(prefix)) {
        throw new Error('Private media asset was not found.');
    }
}

function parseMagic(contentType: AccountabilityMediaContentType, bytes: Buffer): boolean {
    if (contentType === 'image/jpeg') {
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (contentType === 'image/png') {
        return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (contentType === 'image/webp') {
        return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    }
    if (contentType === 'video/mp4') {
        if (bytes.length < 12 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false;
        const brand = bytes.toString('ascii', 8, 12);
        return ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V ', 'dash'].includes(brand);
    }
    return contentType === 'video/webm'
        && bytes.length >= 4
        && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

async function readStreamLimited(body: unknown, maxBytes: number): Promise<Buffer> {
    if (!body || typeof body !== 'object' || !(Symbol.asyncIterator in body)) {
        throw new Error('Private media object could not be read.');
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const part of body as AsyncIterable<Uint8Array>) {
        const chunk = Buffer.from(part);
        total += chunk.length;
        if (total > maxBytes) throw new Error('Private media object exceeds its verified size limit.');
        chunks.push(chunk);
    }
    return Buffer.concat(chunks, total);
}

async function hashStreamLimited(body: unknown, maxBytes: number): Promise<{ byteSize: number; sha256: Buffer }> {
    if (!body || typeof body !== 'object' || !(Symbol.asyncIterator in body)) {
        throw new Error('Private media object could not be read.');
    }
    const hash = createHash('sha256');
    let total = 0;
    for await (const part of body as AsyncIterable<Uint8Array>) {
        const chunk = Buffer.from(part);
        total += chunk.length;
        if (total > maxBytes) throw new Error('Private media object exceeds its verified size limit.');
        hash.update(chunk);
    }
    return { byteSize: total, sha256: hash.digest() };
}

function copySource(bucket: string, key: string): string {
    return `${bucket}/${key.split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

async function deleteObjectQuietly(client: S3Client, bucket: string, key: string): Promise<boolean> {
    try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch {
        // No key or user data is logged. The inaccessible pending object can be
        // removed by the deployment's private-bucket lifecycle policy.
        return false;
    }
}

/** Create a pending owner-scoped row and an exact-type short-lived private PUT. */
export async function initiateAccountabilityMediaUpload(
    ownerId: string,
    input: InitiateAccountabilityMediaUploadInput,
    source: AccountabilityMediaUploadSource,
    idempotencyKey: string,
): Promise<InitiatedAccountabilityMediaUpload> {
    const config = getPrivateConfig();
    if (!isAllowedType(input.contentType)) throw new TypeError('Only JPEG, PNG, WebP, MP4, and WebM files are supported.');
    if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || input.byteSize > sizeLimit(input.contentType)) {
        throw new RangeError('The file exceeds the allowed size limit.');
    }
    assertLocalDate(input.localDate);
    if (!['body', 'habit_evidence', 'general'].includes(input.category)) throw new TypeError('Invalid media category.');
    if (input.pose != null && !['front', 'back', 'left_side', 'right_side', 'other'].includes(input.pose)) {
        throw new TypeError('Invalid body pose.');
    }
    if (input.pose != null && input.category !== 'body') throw new TypeError('Pose is only available for body media.');
    if (input.privateNotes != null && input.privateNotes.length > 2000) throw new RangeError('Private notes are too long.');

    const normalizedInput: InitiateAccountabilityMediaUploadInput = {
        localDate: input.localDate,
        category: input.category,
        pose: input.pose ?? null,
        privateNotes: input.privateNotes?.trim() || null,
        displayName: cleanDisplayName(input.displayName),
        contentType: input.contentType,
        byteSize: input.byteSize,
    };
    const normalizedKey = idempotencyKey.trim();
    if (!normalizedKey || normalizedKey.length > 180) throw new RangeError('An idempotency key is required.');

    const sql = getDatabase();
    const operationKey = mediaUploadOperationKey(source);
    const keyHash = digestMediaUploadIdempotencyKey(normalizedKey);
    const requestHash = digestMediaUploadRequest(normalizedInput);

    return sql.begin(async (tx) => {
        const inserted = await tx`
            INSERT INTO accountability_idempotency_keys (
                owner_id, operation_key, idempotency_key_hash, request_hash, expires_at
            ) VALUES (
                ${ownerId}, ${operationKey}, ${keyHash}, ${requestHash}, NOW() + INTERVAL '30 days'
            )
            ON CONFLICT (owner_id, operation_key, idempotency_key_hash) DO NOTHING
            RETURNING id
        `;

        if (inserted.length === 0) {
            const previous = await tx`
                SELECT request_hash, result_resource_id
                FROM accountability_idempotency_keys
                WHERE owner_id = ${ownerId} AND operation_key = ${operationKey}
                  AND idempotency_key_hash = ${keyHash}
                FOR UPDATE
            `;
            if (!previous[0] || !Buffer.from(previous[0].request_hash as Buffer | Uint8Array).equals(requestHash)) {
                throw new Error('IDEMPOTENCY_CONFLICT');
            }
            if (!previous[0].result_resource_id) throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');

            const assetId = String(previous[0].result_resource_id);
            const assets = await tx<MediaRow[]>`
                SELECT id, owner_id, local_date, category, pose, private_notes, display_name,
                       storage_provider, object_key, content_type, byte_size, content_sha256, status
                FROM accountability_media_assets
                WHERE owner_id = ${ownerId} AND id = ${assetId}
                FOR UPDATE
            `;
            const asset = assets[0];
            if (!asset) throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
            assertResourceMatchesInput(asset, normalizedInput);
            if (asset.status === 'ready') {
                assertOwnerKey(asset, ownerId);
                if (!asset.content_sha256 || Buffer.from(asset.content_sha256).length !== 32) {
                    throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
                }
                return {
                    assetId,
                    status: 'ready' as const,
                    contentType: normalizedInput.contentType,
                    byteSize: normalizedInput.byteSize,
                    duplicate: true as const,
                };
            }
            if (asset.status !== 'pending') throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
            assertPendingUploadKey(asset);
            assertOwnerKey(asset, ownerId);
            const uploadUrl = await issuePrivateUploadUrl(
                config,
                asset.object_key,
                normalizedInput.contentType,
                normalizedInput.byteSize,
            );
            return {
                assetId,
                status: 'pending' as const,
                uploadUrl,
                method: 'PUT' as const,
                requiredHeaders: { 'Content-Type': normalizedInput.contentType },
                expiresInSeconds: ACCOUNTABILITY_MEDIA_LIMITS.uploadUrlSeconds,
                contentType: normalizedInput.contentType,
                byteSize: normalizedInput.byteSize,
                duplicate: true,
            };
        }

        const assetId = randomUUID();
        const objectKey = `${assetNamespace(assetId)}/incoming/${assetId}.${extensionFor(normalizedInput.contentType)}`;
        await tx`
            INSERT INTO accountability_media_assets (
                id, owner_id, local_date, category, pose, private_notes, storage_provider,
                object_key, display_name, content_type, byte_size, status
            ) VALUES (
                ${assetId}, ${ownerId}, ${normalizedInput.localDate}::date, ${normalizedInput.category},
                ${normalizedInput.pose ?? null}, ${normalizedInput.privateNotes ?? null}, 'r2',
                ${objectKey}, ${normalizedInput.displayName ?? null}, ${normalizedInput.contentType},
                ${normalizedInput.byteSize}, 'pending'
            )
        `;
        const savedIdempotency = await tx`
            UPDATE accountability_idempotency_keys
            SET response_status = 201, result_resource_id = ${assetId}
            WHERE owner_id = ${ownerId} AND id = ${Number(inserted[0].id)}
            RETURNING id
        `;
        if (savedIdempotency.length !== 1) throw new Error('MEDIA_UPLOAD_NOT_RETRYABLE');
        const uploadUrl = await issuePrivateUploadUrl(
            config,
            objectKey,
            normalizedInput.contentType,
            normalizedInput.byteSize,
        );
        return {
            assetId,
            status: 'pending' as const,
            uploadUrl,
            method: 'PUT' as const,
            requiredHeaders: { 'Content-Type': normalizedInput.contentType },
            expiresInSeconds: ACCOUNTABILITY_MEDIA_LIMITS.uploadUrlSeconds,
            contentType: normalizedInput.contentType,
            byteSize: normalizedInput.byteSize,
            duplicate: false,
        };
    });
}

/**
 * Copy the upload into a non-presigned ready key first, then verify that stable
 * private copy with HEAD, a ranged signature check, and a streaming SHA-256.
 * This prevents a still-live PUT URL from overwriting a finalized original.
 */
export async function finalizeAccountabilityMediaUpload(ownerId: string, assetId: string): Promise<{ assetId: string; status: 'ready'; contentType: AccountabilityMediaContentType; byteSize: number }> {
    const config = getPrivateConfig();
    const sql = getDatabase();
    let attemptKey: string | null = null;
    let incomingKey: string | null = null;
    try {
        const outcome = await sql.begin(async (tx) => {
            // A transaction-scoped advisory lock serializes finalizers for this
            // asset without adding a schema state. The row lock is retained
            // through the R2 snapshot, validation and ready-state update.
            await tx`SELECT pg_advisory_xact_lock(hashtext(${ownerId}), hashtext(${assetId}))`;
            const rows = await tx<MediaRow[]>`
                SELECT id, owner_id, storage_provider, object_key, content_type, byte_size, content_sha256, status
                FROM accountability_media_assets
                WHERE owner_id = ${ownerId} AND id = ${assetId} AND status = 'pending'
                FOR UPDATE
            `;
            const row = rows[0];
            if (!row || !isAllowedType(row.content_type)) throw new Error('Pending private media asset was not found.');
            assertOwnerKey(row, ownerId);

            const extension = extensionFor(row.content_type);
            if (!row.object_key.includes('/incoming/') || !row.object_key.endsWith(`/${assetId}.${extension}`)) {
                throw new Error('Pending private media asset has an invalid storage key.');
            }
            incomingKey = row.object_key;
            const byteSize = Number(row.byte_size);
            if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > sizeLimit(row.content_type)) {
                throw new Error('Pending private media asset has an invalid size.');
            }
            // Each attempt gets its own candidate object. If an unexpected
            // transaction conflict occurs, cleanup can never delete another
            // finalizer's committed ready object.
            attemptKey = `${assetNamespace(assetId)}/ready/${randomUUID()}-${assetId}.${extension}`;
            if (!row.object_key.startsWith(`${assetNamespace(assetId)}/incoming/`)
                || !row.object_key.endsWith(`/${assetId}.${extension}`)) {
                throw new Error('Pending private media asset has an invalid storage key.');
            }

            // The destination is server-generated and is never signed for client PUT.
            await config.client.send(new CopyObjectCommand({
                Bucket: config.bucket,
                Key: attemptKey,
                CopySource: copySource(config.bucket, row.object_key),
                ContentType: row.content_type,
                CacheControl: 'private, no-store',
                MetadataDirective: 'REPLACE',
            }));

            const head = await config.client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: attemptKey }));
            const actualType = head.ContentType?.trim().toLowerCase();
            const actualSize = head.ContentLength;
            if (actualType !== row.content_type || actualSize !== byteSize) {
                throw new Error('Uploaded private media does not match its declared type or size.');
            }

            const range = await config.client.send(new GetObjectCommand({
                Bucket: config.bucket,
                Key: attemptKey,
                Range: 'bytes=0-31',
            }));
            const match = range.ContentRange?.match(/^bytes 0-(\d+)\/(\d+)$/);
            const rangeLength = range.ContentLength;
            if (!match || Number(match[2]) !== byteSize || Number(match[1]) >= byteSize
                || !Number.isSafeInteger(rangeLength) || rangeLength! < 1 || rangeLength! > 32
                || Number(match[1]) + 1 !== rangeLength) {
                throw new Error('Uploaded private media did not support a valid bounded range check.');
            }
            const magic = await readStreamLimited(range.Body, 32);
            if (magic.length !== rangeLength || !parseMagic(row.content_type, magic)) {
                throw new Error('Uploaded private media does not match an allowed file signature.');
            }

            const full = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: attemptKey }));
            const fullHash = await hashStreamLimited(full.Body, byteSize);
            if (fullHash.byteSize !== byteSize) throw new Error('Uploaded private media is truncated.');
            const contentSha256 = fullHash.sha256;

            const updated = await tx`
                UPDATE accountability_media_assets
                SET object_key = ${attemptKey}, content_sha256 = ${contentSha256}, status = 'ready', uploaded_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${assetId} AND status = 'pending' AND object_key = ${row.object_key}
                RETURNING id
            `;
            if (updated.length !== 1) throw new Error('Private media upload could not be finalized.');
            return { status: 'ready' as const, contentType: row.content_type, byteSize };
        });

        if (incomingKey) await deleteObjectQuietly(config.client, config.bucket, incomingKey);
        return { assetId, ...outcome };
    } catch (error) {
        // Only this invocation's randomly keyed candidate can be removed.
        if (attemptKey) await deleteObjectQuietly(config.client, config.bucket, attemptKey);
        const invalidUpload = error instanceof Error && (
            error.message.includes('does not match')
            || error.message.includes('valid bounded range')
            || error.message.includes('truncated')
            || error.message.includes('invalid size')
            || error.message.includes('exceeds its verified size limit')
        );
        if (invalidUpload) {
            await sql`
                UPDATE accountability_media_assets
                SET status = 'failed'
                WHERE owner_id = ${ownerId} AND id = ${assetId} AND status = 'pending'
            `;
            if (incomingKey) await deleteObjectQuietly(config.client, config.bucket, incomingKey);
        }
        throw error;
    }
}

/** Return a private, inline, one-minute read URL only for this owner's ready asset. */
export async function createAccountabilityMediaReadUrls(ownerId: string, assetIds: string[]) {
    if (assetIds.length < 1 || assetIds.length > 8) throw new RangeError('Request between one and eight media items.');
    const config = getPrivateConfig();
    const sql = getDatabase();
    const rows = await sql<MediaRow[]>`
        SELECT id, owner_id, storage_provider, object_key, content_type, byte_size, content_sha256, status
        FROM accountability_media_assets
        WHERE owner_id = ${ownerId} AND id IN ${sql(assetIds)} AND status = 'ready'
    `;
    return Promise.all(rows.map(async row => {
        if (!isAllowedType(row.content_type)) throw new Error('Ready private media asset was not found.');
        assertOwnerKey(row, ownerId);
        if (!row.content_sha256 || Buffer.from(row.content_sha256).length !== 32) {
            throw new Error('Private media asset has not passed content verification.');
        }
        const url = await getSignedUrl(config.client, new GetObjectCommand({
            Bucket: config.bucket, Key: row.object_key,
            ResponseContentType: row.content_type, ResponseContentDisposition: 'inline',
            ResponseCacheControl: 'private, no-store, max-age=0',
        }), { expiresIn: ACCOUNTABILITY_MEDIA_LIMITS.readUrlSeconds });
        return { id: String(row.id), url, expiresInSeconds: ACCOUNTABILITY_MEDIA_LIMITS.readUrlSeconds, contentType: row.content_type };
    }));
}

export async function createAccountabilityMediaReadUrl(ownerId: string, assetId: string): Promise<{ url: string; expiresInSeconds: number; contentType: AccountabilityMediaContentType }> {
    const items = await createAccountabilityMediaReadUrls(ownerId, [assetId]);
    if (!items[0]) throw new Error('Ready private media asset was not found.');
    return items[0];
}

export type ListOwnerPrivateMediaInput = {
    fromDate?: string;
    toDate?: string;
    pageSize?: number;
    cursor?: string;
};

/**
 * List only metadata for the authenticated owner's private assets. This never
 * selects storage keys, hashes, bucket names, signed URLs, or another owner.
 */
export async function listOwnerPrivateMedia(ownerId: string, input: ListOwnerPrivateMediaInput = {}) {
    if (!ownerId || ownerId.length > 512) throw new TypeError('A verified owner identity is required.');
    const pageSize = input.pageSize ?? 25;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        throw new RangeError('Media page size must be between 1 and 100.');
    }

    const { fromDate, toDate } = resolvePrivateMediaDateRange(input);

    const cursor = input.cursor ? decodePrivateMediaCursor(input.cursor) : null;
    if (cursor && (cursor.localDate < fromDate || cursor.localDate > toDate)) {
        throw new RangeError('Media cursor is outside the requested date range.');
    }

    const sql = getDatabase();
    const rows = cursor
        ? await sql<OwnerPrivateMediaRow[]>`
            SELECT id, local_date, category, pose, content_type, byte_size,
                   display_name, private_notes, status, uploaded_at, created_at, deleted_at
            FROM accountability_media_assets
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
              AND (local_date, created_at, id) < (
                  ${cursor.localDate}::date, ${cursor.createdAt}::timestamptz, ${cursor.id}::uuid
              )
            ORDER BY local_date DESC, created_at DESC, id DESC
            LIMIT ${pageSize + 1}
        `
        : await sql<OwnerPrivateMediaRow[]>`
            SELECT id, local_date, category, pose, content_type, byte_size,
                   display_name, private_notes, status, uploaded_at, created_at, deleted_at
            FROM accountability_media_assets
            WHERE owner_id = ${ownerId}
              AND local_date BETWEEN ${fromDate}::date AND ${toDate}::date
            ORDER BY local_date DESC, created_at DESC, id DESC
            LIMIT ${pageSize + 1}
        `;

    const hasMore = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);
    const media = pageRows.map((row) => ({
        assetId: String(row.id),
        localDate: databaseDateToActivityDate(row.local_date as Date | string),
        category: row.category,
        pose: row.pose,
        contentType: row.content_type,
        byteSize: Number(row.byte_size),
        displayName: row.display_name,
        privateNotes: row.private_notes,
        status: row.status,
        uploadedAt: row.uploaded_at ? (row.uploaded_at instanceof Date ? row.uploaded_at : new Date(row.uploaded_at)).toISOString() : null,
        createdAt: (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString(),
        deletedAt: row.deleted_at ? (row.deleted_at instanceof Date ? row.deleted_at : new Date(row.deleted_at)).toISOString() : null,
    }));
    const lastRow = pageRows.at(-1);
    const nextCursor = hasMore && lastRow
        ? encodePrivateMediaCursor({
            localDate: assertActivityDate(databaseDateToActivityDate(lastRow.local_date as Date | string)),
            createdAt: (lastRow.created_at instanceof Date ? lastRow.created_at : new Date(lastRow.created_at)).toISOString(),
            id: String(lastRow.id),
        })
        : null;

    return { fromDate, toDate, pageSize, media, nextCursor };
}

/**
 * Load a ready image only when its owner-scoped stored hash equals the hash in
 * the verified approval snapshot, then re-read and hash the bytes. This keeps
 * object keys and private URLs out of the publication service's public result.
 */
export async function readVerifiedPrivateImageBytes(
    ownerId: string,
    assetId: string,
    expectedSha256: Uint8Array,
    options: { requirePreparedDerivative?: boolean } = {},
): Promise<{ bytes: Buffer; sha256: Buffer; contentType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
    const config = getPrivateConfig();
    const sql = getDatabase();
    const rows = await sql<MediaRow[]>`
        SELECT id, owner_id, storage_provider, object_key, content_type, byte_size, content_sha256, status
        FROM accountability_media_assets
        WHERE owner_id = ${ownerId} AND id = ${assetId} AND status = 'ready'
        LIMIT 1
    `;
    const row = rows[0];
    if (!row || !['image/jpeg', 'image/png', 'image/webp'].includes(row.content_type)) {
        throw new Error('The approved owner-scoped source image was not found.');
    }
    assertOwnerKey(row, ownerId);
    const storedHash = row.content_sha256 ? Buffer.from(row.content_sha256) : null;
    const expectedHash = Buffer.from(expectedSha256);
    if (!storedHash || storedHash.length !== 32 || expectedHash.length !== 32 || !storedHash.equals(expectedHash)) {
        throw new Error('The source image hash does not match the approved snapshot.');
    }
    if (options.requirePreparedDerivative
        && (row.content_type !== 'image/webp' || !row.object_key.includes('/approved-previews/'))) {
        throw new Error('Only a server-prepared private image derivative can be published.');
    }

    const byteSize = Number(row.byte_size);
    if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > ACCOUNTABILITY_MEDIA_LIMITS.imageBytes) {
        throw new Error('The approved source image is outside the allowed size limit.');
    }
    const object = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: row.object_key }));
    const bytes = await readStreamLimited(object.Body, byteSize);
    if (bytes.length !== byteSize) throw new Error('The approved source image is truncated.');
    const sha256 = createHash('sha256').update(bytes).digest();
    if (!sha256.equals(expectedHash) || !parseMagic(row.content_type as AccountabilityMediaContentType, bytes.subarray(0, 32))) {
        throw new Error('The source image bytes no longer match the approved snapshot.');
    }
    return {
        bytes,
        sha256,
        contentType: row.content_type as 'image/jpeg' | 'image/png' | 'image/webp',
    };
}

/** Read and verify a source image for the private owner-review derivative flow. */
export async function readOwnerPrivateImageForPreparation(
    ownerId: string,
    sourceMediaAssetId: string,
): Promise<{
    bytes: Buffer;
    sha256: Buffer;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    localDate: string;
    category: AccountabilityMediaCategory;
    pose: AccountabilityMediaPose | null;
}> {
    const sql = getDatabase();
    const rows = await sql<MediaRow[]>`
        SELECT id, owner_id, storage_provider, local_date, category, pose, object_key, content_type, byte_size, content_sha256, status
        FROM accountability_media_assets
        WHERE owner_id = ${ownerId} AND id = ${sourceMediaAssetId} AND status = 'ready'
        LIMIT 1
    `;
    const row = rows[0];
    if (!row || !row.content_sha256 || !['image/jpeg', 'image/png', 'image/webp'].includes(row.content_type)
        || !row.local_date || !row.category) {
        throw new Error('A ready owner-owned source image is required.');
    }
    const verified = await readVerifiedPrivateImageBytes(ownerId, sourceMediaAssetId, Buffer.from(row.content_sha256));
    return {
        ...verified,
        localDate: databaseDateToActivityDate(row.local_date as Date | string),
        category: row.category,
        pose: row.pose ?? null,
    };
}

/** Store a sanitized preview as a distinct private, server-written media asset. */
export async function storePrivateApprovedImageDerivative(
    ownerId: string,
    sourceMediaAssetId: string,
    sourceSha256: Uint8Array,
    derivativeBytes: Buffer,
): Promise<{
    assetId: string;
    sourceMediaAssetId: string;
    sourceSha256: Buffer;
    contentType: 'image/webp';
    byteSize: number;
    sha256: Buffer;
}> {
    const config = getPrivateConfig();
    if (derivativeBytes.length <= 0 || derivativeBytes.length > ACCOUNTABILITY_MEDIA_LIMITS.imageBytes
        || !parseMagic('image/webp', derivativeBytes.subarray(0, 32))) {
        throw new TypeError('The private preview must be a size-limited WebP derivative.');
    }
    const sql = getDatabase();
    const sourceRows = await sql<Array<MediaRow & { local_date: string | Date; category: AccountabilityMediaCategory; pose: AccountabilityMediaPose | null }>>`
        SELECT id, owner_id, storage_provider, local_date, category, pose, object_key, content_type, byte_size, content_sha256, status
        FROM accountability_media_assets
        WHERE owner_id = ${ownerId} AND id = ${sourceMediaAssetId} AND status = 'ready'
        LIMIT 1
    `;
    const source = sourceRows[0];
    const currentSourceHash = source?.content_sha256 ? Buffer.from(source.content_sha256) : null;
    if (!source || !source.local_date || !source.category || !currentSourceHash
        || currentSourceHash.length !== 32 || !currentSourceHash.equals(Buffer.from(sourceSha256))) {
        throw new Error('The source image changed before its private derivative could be saved.');
    }
    assertOwnerKey(source, ownerId);

    const id = randomUUID();
    const objectKey = `${assetNamespace(id)}/approved-previews/${id}.webp`;
    const contentSha256 = createHash('sha256').update(derivativeBytes).digest();
    await sql`
        INSERT INTO accountability_media_assets (
            id, owner_id, local_date, category, pose, private_notes, storage_provider,
            object_key, display_name, content_type, byte_size, status
        ) VALUES (
            ${id}, ${ownerId}, ${databaseDateToActivityDate(source.local_date as Date | string)}::date, ${source.category}, ${source.pose ?? null},
            NULL, 'r2', ${objectKey}, NULL, 'image/webp', ${derivativeBytes.length}, 'pending'
        )
    `;

    try {
        await config.client.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: objectKey,
            Body: derivativeBytes,
            ContentLength: derivativeBytes.length,
            ContentType: 'image/webp',
            CacheControl: 'private, no-store',
        }));
        const head = await config.client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        if (head.ContentType?.trim().toLowerCase() !== 'image/webp' || head.ContentLength !== derivativeBytes.length) {
            throw new Error('The private image derivative failed storage verification.');
        }
        const stored = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        const storedBytes = await readStreamLimited(stored.Body, derivativeBytes.length);
        if (storedBytes.length !== derivativeBytes.length
            || !createHash('sha256').update(storedBytes).digest().equals(contentSha256)) {
            throw new Error('The private image derivative did not match its verified content hash.');
        }
        await sql.begin(async (tx) => {
            const updated = await tx`
                UPDATE accountability_media_assets
                SET content_sha256 = ${contentSha256}, status = 'ready', uploaded_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${id} AND status = 'pending' AND object_key = ${objectKey}
                RETURNING id
            `;
            if (updated.length !== 1) throw new Error('The private image derivative could not be finalized.');
            await tx`
                INSERT INTO accountability_media_derivatives (
                    owner_id, source_media_asset_id, source_content_sha256,
                    derivative_media_asset_id, derivative_content_sha256
                ) VALUES (
                    ${ownerId}, ${sourceMediaAssetId}, ${currentSourceHash}, ${id}, ${contentSha256}
                )
            `;
        });
        return {
            assetId: id,
            sourceMediaAssetId,
            sourceSha256: currentSourceHash,
            contentType: 'image/webp',
            byteSize: derivativeBytes.length,
            sha256: contentSha256,
        };
    } catch (error) {
        await deleteObjectQuietly(config.client, config.bucket, objectKey);
        await sql`
            UPDATE accountability_media_assets
            SET status = 'failed'
            WHERE owner_id = ${ownerId} AND id = ${id} AND status = 'pending' AND object_key = ${objectKey}
        `;
        throw error;
    }
}

/**
 * Clean only this owner's stale pending upload/preview objects. Callers must
 * pass a cutoff at least 15 minutes old so a five-minute presigned PUT cannot
 * be removed while it is still valid. Failed deletes stay pending for retry.
 * No scheduler is enabled by this helper.
 */
export async function cleanupAbandonedAccountabilityMediaUploads(
    ownerId: string,
    olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    limit = 50,
): Promise<{ examined: number; removed: number }> {
    const config = getPrivateConfig();
    if (!ownerId || ownerId.length > 512) throw new TypeError('A verified owner identity is required.');
    if (!(olderThan instanceof Date) || !Number.isFinite(olderThan.getTime())
        || olderThan.getTime() > Date.now() - 15 * 60 * 1000) {
        throw new RangeError('Pending media cleanup requires a cutoff at least 15 minutes in the past.');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('Cleanup limit must be between 1 and 100.');

    const sql = getDatabase();
    return sql.begin(async (tx) => {
        const rows = await tx<Array<MediaRow & { created_at: Date | string }>>`
            SELECT id, owner_id, storage_provider, created_at, object_key, content_type, byte_size, content_sha256, status
            FROM accountability_media_assets
            WHERE owner_id = ${ownerId}
              AND storage_provider = 'r2'
              AND status = 'pending'
              AND created_at < ${olderThan}
            ORDER BY created_at ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED
        `;
        let removed = 0;
        for (const row of rows) {
            assertOwnerKey(row, ownerId);
            const expectedIncomingKey = row.content_type && isAllowedType(row.content_type)
                ? `${assetNamespace(row.id)}/incoming/${row.id}.${extensionFor(row.content_type)}`
                : null;
            const expectedPreviewKey = `${assetNamespace(row.id)}/approved-previews/${row.id}.webp`;
            if (row.object_key !== expectedIncomingKey && row.object_key !== expectedPreviewKey) continue;
            if (!await deleteObjectQuietly(config.client, config.bucket, row.object_key)) continue;
            const updated = await tx`
                UPDATE accountability_media_assets
                SET status = 'failed'
                WHERE owner_id = ${ownerId} AND id = ${row.id} AND status = 'pending' AND object_key = ${row.object_key}
                RETURNING id
            `;
            if (updated.length === 1) removed += 1;
        }
        return { examined: rows.length, removed };
    });
}
