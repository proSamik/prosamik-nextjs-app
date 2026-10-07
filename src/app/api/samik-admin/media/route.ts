import { headers } from 'next/headers';
import { z } from 'zod';
import { getDatabase } from '@/lib/database';
import { assertActivityDate, databaseDateToActivityDate } from '@/lib/accountability-domain';
import { getAccountabilityOwner, isSameOriginRequest, privateJson } from '@/lib/accountability-auth';
import { consumeAccountabilityRateLimit } from '@/lib/accountability-rate-limit';
import {
    cleanupAbandonedAccountabilityMediaUploads,
    createAccountabilityMediaReadUrl,
    finalizeAccountabilityMediaUpload,
    initiateAccountabilityMediaUpload,
} from '@/lib/accountability-media';
import { getTodayActivityDate } from '@/lib/accountability-service';
import { preparePrivateApprovedImageDerivative } from '@/lib/accountability-publication-media';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MediaUploadRequestSchema = z.object({
    action: z.literal('initiate'),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.enum(['body', 'habit_evidence', 'general']),
    pose: z.enum(['front', 'back', 'left_side', 'right_side', 'other']).nullable().optional(),
    privateNotes: z.string().trim().max(2000).nullable().optional(),
    displayName: z.string().max(512).nullable().optional(),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
    byteSize: z.number().int().positive().max(100 * 1024 * 1024),
}).strict();

const DerivativeRequestSchema = z.object({
    action: z.literal('prepare-public-derivative'),
    sourceMediaAssetId: z.string().uuid(),
}).strict();

const CleanupRequestSchema = z.object({
    action: z.literal('cleanup-abandoned'),
    limit: z.number().int().min(1).max(100).optional(),
}).strict();

const MediaCategoryQuerySchema = z.enum(['body', 'general', 'habit_evidence', 'all', 'weight_evidence']);

async function authorize(request: Request, mutation = false) {
    if (mutation && !isSameOriginRequest(request)) {
        return { error: privateJson({ error: 'Origin not allowed.' }, { status: 403 }) };
    }
    const owner = await getAccountabilityOwner(await headers());
    if (!owner) return { error: privateJson({ error: 'Unauthorized.' }, { status: 401 }) };
    const rate = await consumeAccountabilityRateLimit(owner.id, 'media', mutation ? 30 : 120, 60);
    if (!rate.allowed) return { error: privateJson({ error: 'Too many requests.' }, {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSeconds) },
    }) };
    return { error: null, owner };
}

export async function GET(request: Request) {
    const access = await authorize(request);
    if (access.error || !access.owner) return access.error;
    try {
        const search = new URL(request.url).searchParams;
        const assetId = search.get('id');
        if (assetId) {
            if (!z.string().uuid().safeParse(assetId).success) {
                return privateJson({ error: 'Media not found.' }, { status: 404 });
            }
            const result = await createAccountabilityMediaReadUrl(access.owner.id, assetId);
            return privateJson({ url: result.url, expiresInSeconds: result.expiresInSeconds, contentType: result.contentType });
        }
        const categoryParsed = MediaCategoryQuerySchema.safeParse(search.get('category') || 'body');
        if (!categoryParsed.success) return privateJson({ error: 'Invalid media category.' }, { status: 400 });
        const category = categoryParsed.data;
        const fromDate = search.get('from') ? assertActivityDate(search.get('from')!) : null;
        const toDate = search.get('to') ? assertActivityDate(search.get('to')!) : null;
        const sql = getDatabase();
        const rows = await sql`
            SELECT id, local_date, category, pose, display_name, content_type, byte_size, status, created_at, uploaded_at
            FROM accountability_media_assets
            WHERE owner_id = ${access.owner.id}
              AND status = 'ready'
              AND (
                  (${category} = 'all')
                  OR (${category} = 'body' AND category = 'body')
                  OR (${category} = 'general' AND category = 'general')
                  OR (${category} = 'habit_evidence' AND category = 'habit_evidence')
                  OR (${category} = 'weight_evidence' AND category IN ('general', 'habit_evidence')
                      AND content_type IN ('image/jpeg', 'image/png', 'image/webp'))
              )
              AND (${fromDate}::date IS NULL OR local_date >= ${fromDate}::date)
              AND (${toDate}::date IS NULL OR local_date <= ${toDate}::date)
            ORDER BY local_date DESC, created_at DESC
            LIMIT 500
        `;
        const items = rows.map((row) => ({
            id: String(row.id),
            date: databaseDateToActivityDate(row.local_date as Date | string),
            category: row.category,
            pose: row.pose,
            type: row.content_type,
            title: row.display_name || (row.category === 'body' ? 'Body progress' : 'Private media'),
            byteSize: Number(row.byte_size),
            uploadedAt: row.uploaded_at ? new Date(row.uploaded_at as Date | string).toISOString() : null,
        }));
        return privateJson({ items });
    } catch (error) {
        if (error instanceof RangeError) return privateJson({ error: error.message }, { status: 400 });
        if (error instanceof Error && error.message.includes('not found')) return privateJson({ error: 'Media not found.' }, { status: 404 });
        return privateJson({ error: 'Unable to load private media.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const access = await authorize(request, true);
    if (access.error || !access.owner) return access.error;
    const body = await request.json().catch(() => null);
    const derivative = DerivativeRequestSchema.safeParse(body);
    if (derivative.success) {
        try {
            const result = await preparePrivateApprovedImageDerivative(access.owner.id, derivative.data.sourceMediaAssetId);
            return privateJson({ data: result }, { status: 201 });
        } catch (error) {
            if (error instanceof RangeError || error instanceof TypeError) return privateJson({ error: error.message }, { status: 400 });
            return privateJson({ error: 'Unable to prepare a private approved-image derivative.' }, { status: 422 });
        }
    }
    const cleanup = CleanupRequestSchema.safeParse(body);
    if (cleanup.success) {
        try {
            const data = await cleanupAbandonedAccountabilityMediaUploads(access.owner.id, undefined, cleanup.data.limit ?? 50);
            return privateJson({ data });
        } catch {
            return privateJson({ error: 'Unable to clean abandoned pending media.' }, { status: 500 });
        }
    }
    const parsed = MediaUploadRequestSchema.safeParse(body);
    if (!parsed.success) return privateJson({ error: 'Invalid private media upload request.' }, { status: 400 });
    try {
        assertActivityDate(parsed.data.localDate);
        if (parsed.data.localDate > getTodayActivityDate()) {
            return privateJson({ error: 'Media cannot be recorded for a future activity date.' }, { status: 400 });
        }
        const idempotencyKey = request.headers.get('Idempotency-Key');
        if (!idempotencyKey?.trim()) {
            return privateJson({ error: 'An Idempotency-Key header is required for media upload initiation.' }, { status: 400 });
        }
        const data = await initiateAccountabilityMediaUpload(
            access.owner.id,
            parsed.data,
            { kind: 'admin', id: 'admin-web' },
            idempotencyKey,
        );
        return privateJson({ data }, { status: data.duplicate ? 200 : 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
            return privateJson({ error: 'That Idempotency-Key was already used for a different upload request.' }, { status: 409 });
        }
        if (error instanceof Error && error.message === 'MEDIA_UPLOAD_NOT_RETRYABLE') {
            return privateJson({ error: 'This upload request is already associated with a failed or unavailable media asset. Start a new upload with a fresh key.' }, { status: 409 });
        }
        if (error instanceof RangeError || error instanceof TypeError) return privateJson({ error: error.message }, { status: 400 });
        return privateJson({ error: 'Unable to start the private media upload.' }, { status: 503 });
    }
}

const FinalizeRequestSchema = z.object({ action: z.literal('finalize'), assetId: z.string().uuid() }).strict();

export async function PATCH(request: Request) {
    const access = await authorize(request, true);
    if (access.error || !access.owner) return access.error;
    const parsed = FinalizeRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return privateJson({ error: 'Invalid private media finalization request.' }, { status: 400 });
    try {
        const data = await finalizeAccountabilityMediaUpload(access.owner.id, parsed.data.assetId);
        return privateJson({ data });
    } catch (error) {
        // A repeated finalize is an idempotent read of the already-finalized
        // owner-owned row; it never re-uploads or issues a public URL.
        try {
            const sql = getDatabase();
            const ready = await sql`
                SELECT id, content_type, byte_size, status
                FROM accountability_media_assets
                WHERE owner_id = ${access.owner.id} AND id = ${parsed.data.assetId} AND status = 'ready'
                LIMIT 1
            `;
            if (ready[0]) return privateJson({ data: {
                assetId: String(ready[0].id), status: 'ready', contentType: ready[0].content_type,
                byteSize: Number(ready[0].byte_size), duplicate: true,
            } });
        } catch {
            return privateJson({ error: 'Unable to verify the private upload state.' }, { status: 503 });
        }
        if (error instanceof Error && error.message.includes('not found')) return privateJson({ error: 'Pending private media asset was not found.' }, { status: 404 });
        return privateJson({ error: 'Unable to verify and finalize the private upload.' }, { status: 422 });
    }
}
