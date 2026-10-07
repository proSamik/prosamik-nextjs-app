import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { getDatabase } from '@/lib/database';
import {
    ACCOUNTABILITY_MEDIA_LIMITS,
    createAccountabilityMediaReadUrl,
    readOwnerPrivateImageForPreparation,
    readVerifiedPrivateImageBytes,
    storePrivateApprovedImageDerivative,
} from '@/lib/accountability-media';

type PublicationMediaSnapshotRow = {
    publication_id: string;
    publication_owner_id: string;
    approval_id: string;
    approval_owner_id: string;
    approved_by_user_id: string;
    approval_content_sha256: Buffer | Uint8Array;
    source_media_asset_id: string;
    source_content_sha256: Buffer | Uint8Array;
    approved_media_asset_id: string;
    approved_content_sha256: Buffer | Uint8Array;
};

type PublicR2Config = { bucket: string; client: S3Client; publicBase: URL };

export type PreparedPrivateImageDerivative = {
    assetId: string;
    contentType: 'image/webp';
    previewUrl: string;
    previewExpiresInSeconds: number;
};

export type PublishApprovedImageDerivativeInput = {
    /** Verified owner ID from the authenticated publication service, never request JSON. */
    ownerId: string;
    /** A pending publication row created only after an explicit publish action. */
    publicationId: string;
    approvalId: string;
    sourceMediaAssetId: string;
    approvedMediaAssetId: string;
};

export type PublishedApprovedImageDerivative = {
    approvalId: string;
    sourceMediaAssetId: string;
    sourceContentSha256: Buffer;
    approvedMediaAssetId: string;
    approvedContentSha256: Buffer;
    derivativeObjectKey: string;
    derivativePublicUrl: string;
    derivativeContentType: 'image/webp';
    derivativeByteSize: number;
    derivativeContentSha256: Buffer;
};

let publicR2Config: PublicR2Config | null = null;

function assertServerRuntime(): void {
    if (typeof window !== 'undefined') throw new Error('Approved media publication is server-only.');
}

function getPublicR2Config(): PublicR2Config {
    assertServerRuntime();
    if (publicR2Config) return publicR2Config;

    const bucket = process.env.R2_BUCKET_NAME?.trim();
    const endpointText = process.env.R2_ENDPOINT?.trim();
    const publicBaseText = process.env.R2_PUBLIC_URL?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!bucket || !endpointText || !publicBaseText || !accessKeyId || !secretAccessKey) {
        throw new Error('Approved-image publication is unavailable: existing public Random Thoughts R2 settings are incomplete.');
    }
    if (bucket === process.env.SECURE_BUCKET?.trim()) {
        throw new Error('Approved-image publication requires different private and public R2 buckets.');
    }

    let endpoint: URL;
    let publicBase: URL;
    try {
        endpoint = new URL(endpointText);
        publicBase = new URL(publicBaseText);
    } catch {
        throw new Error('Approved-image publication R2 settings are invalid.');
    }
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
        || (endpoint.pathname !== '/' && endpoint.pathname !== '')) {
        throw new Error('Approved-image publication requires an HTTPS S3 endpoint without a path.');
    }
    if (publicBase.protocol !== 'https:' || publicBase.username || publicBase.password || publicBase.search || publicBase.hash) {
        throw new Error('Approved-image publication requires an HTTPS public URL base.');
    }

    publicR2Config = {
        bucket,
        publicBase,
        client: new S3Client({
            region: 'auto',
            forcePathStyle: true,
            endpoint: endpoint.origin,
            credentials: { accessKeyId, secretAccessKey },
        }),
    };
    return publicR2Config;
}

function validUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function digest32(value: Buffer | Uint8Array): Buffer {
    const digest = Buffer.from(value);
    if (digest.length !== 32) throw new Error('Approved media snapshot has an invalid content hash.');
    return digest;
}

async function buildSanitizedWebp(sourceBytes: Buffer, sourceContentType: string): Promise<Buffer> {
    const expectedFormat = sourceContentType === 'image/jpeg' ? 'jpeg'
        : sourceContentType === 'image/png' ? 'png'
            : sourceContentType === 'image/webp' ? 'webp'
                : null;
    if (!expectedFormat) throw new Error('Only JPEG, PNG, and WebP source images can be prepared for publication.');

    const metadata = await sharp(sourceBytes, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
        animated: false,
    }).metadata();
    if (metadata.format !== expectedFormat || (metadata.pages ?? 1) > 1) {
        throw new Error('Animated, mismatched, or unsupported image content cannot be prepared.');
    }

    // Sharp emits a fresh static image and does not copy metadata unless
    // withMetadata() is requested. Apply orientation, resize, and strip EXIF,
    // XMP, IPTC, and location metadata. This only runs before owner approval.
    const derivative = await sharp(sourceBytes, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
        animated: false,
    })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

    if (derivative.length <= 0 || derivative.length > ACCOUNTABILITY_MEDIA_LIMITS.imageBytes
        || derivative.length < 12 || derivative.toString('ascii', 0, 4) !== 'RIFF'
        || derivative.toString('ascii', 8, 12) !== 'WEBP') {
        throw new Error('The sanitized image derivative is invalid or exceeds the private preview limit.');
    }
    return derivative;
}

/**
 * Prepare a private owner-review derivative. Approval must bind the returned
 * asset ID and server-read hash; this function itself never approves or publishes.
 */
export async function preparePrivateApprovedImageDerivative(
    ownerId: string,
    sourceMediaAssetId: string,
): Promise<PreparedPrivateImageDerivative> {
    if (!ownerId || !validUuid(sourceMediaAssetId)) throw new TypeError('A verified owner and source media asset are required.');
    const source = await readOwnerPrivateImageForPreparation(ownerId, sourceMediaAssetId);
    const derivativeBytes = await buildSanitizedWebp(source.bytes, source.contentType);
    const saved = await storePrivateApprovedImageDerivative(
        ownerId,
        sourceMediaAssetId,
        source.sha256,
        derivativeBytes,
    );
    const preview = await createAccountabilityMediaReadUrl(ownerId, saved.assetId);
    return {
        assetId: saved.assetId,
        contentType: saved.contentType,
        previewUrl: preview.url,
        previewExpiresInSeconds: preview.expiresInSeconds,
    };
}

async function readStreamLimited(body: unknown, maxBytes: number): Promise<Buffer> {
    if (!body || typeof body !== 'object' || !(Symbol.asyncIterator in body)) {
        throw new Error('The approved image derivative could not be verified after upload.');
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const part of body as AsyncIterable<Uint8Array>) {
        const chunk = Buffer.from(part);
        total += chunk.length;
        if (total > maxBytes) throw new Error('The approved image derivative exceeds the verified size.');
        chunks.push(chunk);
    }
    return Buffer.concat(chunks, total);
}

async function uploadExactApprovedDerivative(bytes: Buffer, expectedHash: Buffer): Promise<{
    objectKey: string;
    publicUrl: string;
    byteSize: number;
}> {
    const config = getPublicR2Config();
    // Stay inside the existing Random Thoughts namespace while dedicating a
    // non-user-specific subpath to approved derivatives.
    const objectKey = `random-thoughts/accountability/approved-derivatives/${randomUUID()}.webp`;
    await config.client.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: bytes,
        ContentLength: bytes.length,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    try {
        const head = await config.client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        if (head.ContentType?.trim().toLowerCase() !== 'image/webp' || head.ContentLength !== bytes.length) {
            throw new Error('Public image derivative failed storage verification.');
        }
        const stored = await config.client.send(new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        const storedBytes = await readStreamLimited(stored.Body, bytes.length);
        const storedHash = createHash('sha256').update(storedBytes).digest();
        if (storedBytes.length !== bytes.length || !storedHash.equals(expectedHash)) {
            throw new Error('The public image derivative differs from the exact approved bytes.');
        }
    } catch (error) {
        try {
            await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        } catch {
            // Never return an unverified URL or log a public object key.
        }
        throw error;
    }

    const base = config.publicBase.toString().replace(/\/$/, '');
    const encodedKey = objectKey.split('/').map((part) => encodeURIComponent(part)).join('/');
    return { objectKey, publicUrl: `${base}/${encodedKey}`, byteSize: bytes.length };
}

/**
 * Publish the exact private derivative selected in the immutable owner-approved
 * snapshot. This must be called from the explicit publish service after it has
 * created a pending publication row. It does not run Sharp or create variants.
 * Text-only approvals and videos never call through to public storage.
 */
export async function publishApprovedImageDerivative(
    input: PublishApprovedImageDerivativeInput,
): Promise<PublishedApprovedImageDerivative> {
    if (!input.ownerId || !validUuid(input.publicationId) || !validUuid(input.approvalId)
        || !validUuid(input.sourceMediaAssetId) || !validUuid(input.approvedMediaAssetId)) {
        throw new TypeError('A verified owner, pending publication, approval, and approved media selection are required.');
    }

    const sql = getDatabase();
    const rows = await sql<PublicationMediaSnapshotRow[]>`
        SELECT
            p.id AS publication_id,
            p.owner_id AS publication_owner_id,
            a.id AS approval_id,
            a.owner_id AS approval_owner_id,
            a.approved_by_user_id,
            a.content_sha256 AS approval_content_sha256,
            m.source_media_asset_id,
            m.source_content_sha256,
            m.approved_media_asset_id,
            m.approved_content_sha256
        FROM accountability_summary_publications p
        JOIN accountability_summary_approvals a
            ON a.owner_id = p.owner_id AND a.id = p.approval_id
        JOIN accountability_summary_approval_media m
            ON m.owner_id = a.owner_id AND m.approval_id = a.id
        WHERE p.id = ${input.publicationId}
          AND p.owner_id = ${input.ownerId}
          AND p.approval_id = ${input.approvalId}
          AND p.status = 'pending'
          AND a.approved_by_user_id = ${input.ownerId}
          AND m.source_media_asset_id = ${input.sourceMediaAssetId}
          AND m.approved_media_asset_id = ${input.approvedMediaAssetId}
        LIMIT 2
    `;
    if (rows.length !== 1) {
        throw new Error('This image is not part of the owner-approved snapshot for a pending publication.');
    }
    const snapshot = rows[0];
    if (snapshot.publication_owner_id !== input.ownerId || snapshot.approval_owner_id !== input.ownerId
        || snapshot.approved_by_user_id !== input.ownerId || snapshot.approval_id !== input.approvalId
        || snapshot.publication_id !== input.publicationId) {
        throw new Error('The approved image snapshot is not owned by this account.');
    }
    // The approval's immutable text digest must also be present, even though
    // this media service never changes or reconstructs that text snapshot.
    digest32(snapshot.approval_content_sha256);

    const sourceHash = digest32(snapshot.source_content_sha256);
    const approvedHash = digest32(snapshot.approved_content_sha256);
    if (snapshot.source_media_asset_id === snapshot.approved_media_asset_id) {
        throw new Error('Original media cannot be made public. Approve a private sanitized derivative first.');
    }

    // Re-read and hash the original and the exact prepared derivative after
    // approval. Keys/URLs are never returned by these private-storage helpers.
    const original = await readVerifiedPrivateImageBytes(
        input.ownerId,
        snapshot.source_media_asset_id,
        sourceHash,
    );
    const approved = await readVerifiedPrivateImageBytes(
        input.ownerId,
        snapshot.approved_media_asset_id,
        approvedHash,
        { requirePreparedDerivative: true },
    );
    if (approved.contentType !== 'image/webp') {
        throw new Error('Only a pre-approved sanitized WebP derivative can be published.');
    }

    const uploaded = await uploadExactApprovedDerivative(approved.bytes, approved.sha256);
    return {
        approvalId: input.approvalId,
        sourceMediaAssetId: snapshot.source_media_asset_id,
        sourceContentSha256: original.sha256,
        approvedMediaAssetId: snapshot.approved_media_asset_id,
        approvedContentSha256: approved.sha256,
        derivativeObjectKey: uploaded.objectKey,
        derivativePublicUrl: uploaded.publicUrl,
        derivativeContentType: 'image/webp',
        derivativeByteSize: uploaded.byteSize,
        derivativeContentSha256: approved.sha256,
    };
}

/** Remove only this invocation's unattached approved derivative after a stale
 * approval or a lost publication race. The key is returned by this module and
 * never accepted from request JSON. */
export async function deleteUnattachedApprovedImageDerivative(objectKey: string): Promise<void> {
    const config = getPublicR2Config();
    if (!/^random-thoughts\/accountability\/approved-derivatives\/[0-9a-f-]{36}\.webp$/i.test(objectKey)) {
        throw new TypeError('Only an unattached approved image derivative can be removed.');
    }
    await config.client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
}
