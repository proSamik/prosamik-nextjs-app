import { createHash, randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { getDatabase } from '@/lib/database';
import { HABITS } from '@/lib/accountability-constants';
import { assertActivityDate, databaseDateToActivityDate, type ActivityDate } from '@/lib/accountability-domain';
import { createAccountabilityMediaReadUrl } from '@/lib/accountability-media';
import {
    deleteUnattachedApprovedImageDerivative,
    publishApprovedImageDerivative,
    preparePrivateApprovedImageDerivative,
} from '@/lib/accountability-publication-media';
import { createRandomThoughtSlug } from '@/lib/random-thoughts';
import { siteMetadata } from '@/utils/siteMetadata';
import {
    buildDailySummaryDraft,
    normalizeSummaryBody,
    normalizeSummaryTitle,
    reuseOrCreateSummaryDerivative,
    summaryTextSha256,
} from '@/lib/accountability-summary-domain';
import type { SummaryPublicMediaSelectionSchema } from '@/lib/accountability-summary-contract';
import { getTodayActivityDate } from '@/lib/accountability-service';
import type { z } from 'zod';

type PublicMediaSelection = z.infer<typeof SummaryPublicMediaSelectionSchema>;
type PublishedImage = Awaited<ReturnType<typeof publishApprovedImageDerivative>>;

function digest(value: string): Buffer {
    return createHash('sha256').update(value, 'utf8').digest();
}

function toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function dateString(value: Date | string): ActivityDate {
    return databaseDateToActivityDate(value);
}

function jsonValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return []; }
}

function assertPastOrToday(activityDate: ActivityDate): void {
    assertActivityDate(activityDate);
    if (activityDate > getTodayActivityDate()) throw new RangeError('A summary cannot be drafted for a future IST date.');
}

/** Read-only summary dashboard with all immutable revisions and audit events. */
export async function getSummaryStatus(ownerId: string) {
    const sql = getDatabase();
    const [draftRows, revisionRows, approvalRows, publicationRows, publicationEventRows] = await Promise.all([
        sql`
            WITH latest AS (
                SELECT DISTINCT ON (d.draft_id)
                    d.id, d.draft_id, d.activity_date, d.revision_number, d.title, d.body, d.created_at
                FROM accountability_summary_drafts d
                WHERE d.owner_id = ${ownerId}
                ORDER BY d.draft_id, d.revision_number DESC
            )
            SELECT latest.*,
                   approval.id AS approval_id,
                   CASE WHEN publication.status = 'published' THEN 'published' ELSE 'draft' END AS state
            FROM latest
            LEFT JOIN accountability_summary_approvals approval
              ON approval.owner_id = ${ownerId} AND approval.draft_revision_id = latest.id
            LEFT JOIN accountability_summary_publications publication
              ON publication.owner_id = ${ownerId}
             AND publication.activity_date = latest.activity_date
             AND publication.status = 'published'
            ORDER BY latest.activity_date DESC
        `,
        sql`
            SELECT id, draft_id, activity_date, revision_number, title, body, created_at
            FROM accountability_summary_drafts
            WHERE owner_id = ${ownerId}
            ORDER BY activity_date DESC, draft_id, revision_number DESC
        `,
        sql`
            SELECT a.id AS approval_id, a.draft_id, a.draft_revision, a.draft_revision_id, a.activity_date,
                   a.title_snapshot, a.body_snapshot, a.content_sha256, a.approved_at,
                   COALESCE(json_agg(json_build_object(
                       'sourceMediaAssetId', m.source_media_asset_id,
                       'approvedMediaAssetId', m.approved_media_asset_id
                   ) ORDER BY m.approved_media_asset_id) FILTER (WHERE m.approved_media_asset_id IS NOT NULL), '[]'::json) AS public_media
            FROM accountability_summary_approvals a
            LEFT JOIN accountability_summary_approval_media m
              ON m.owner_id = a.owner_id AND m.approval_id = a.id
            WHERE a.owner_id = ${ownerId}
            GROUP BY a.id
            ORDER BY a.approved_at DESC
        `,
        sql`
            SELECT p.id AS publication_id, p.approval_id, p.activity_date, p.status,
                   p.requested_at, p.published_at, p.error_code,
                   a.title_snapshot, t.slug
            FROM accountability_summary_publications p
            JOIN accountability_summary_approvals a
              ON a.owner_id = p.owner_id AND a.id = p.approval_id
            LEFT JOIN random_thoughts t ON t.id = p.random_thought_id
            WHERE p.owner_id = ${ownerId}
            ORDER BY p.requested_at DESC
        `,
        sql`
            SELECT e.id, e.publication_id, e.event_type, e.error_code, e.occurred_at
            FROM accountability_summary_publication_events e
            WHERE e.owner_id = ${ownerId}
            ORDER BY e.occurred_at DESC
        `,
    ]);

    const drafts = draftRows.map((row) => ({
        draftId: String(row.draft_id), activityDate: dateString(row.activity_date as Date | string),
        revisionNumber: Number(row.revision_number), title: row.title ?? '', body: String(row.body),
        state: String(row.state), createdAt: toIso(row.created_at as Date | string),
        approvalId: row.approval_id ? String(row.approval_id) : null,
    }));
    const revisions = revisionRows.map((row) => ({
        id: String(row.id), draftId: String(row.draft_id), activityDate: dateString(row.activity_date as Date | string),
        revisionNumber: Number(row.revision_number), title: row.title ?? '', body: String(row.body),
        createdAt: toIso(row.created_at as Date | string),
    }));
    const latestRevisionByDraft = new Map<string, { id: string; revisionNumber: number }>();
    for (const revision of revisions) {
        const current = latestRevisionByDraft.get(revision.draftId);
        if (!current || revision.revisionNumber > current.revisionNumber) {
            latestRevisionByDraft.set(revision.draftId, { id: revision.id, revisionNumber: revision.revisionNumber });
        }
    }
    const approvals = approvalRows.map((row) => ({
        approvalId: String(row.approval_id), draftId: String(row.draft_id),
        revisionNumber: Number(row.draft_revision), activityDate: dateString(row.activity_date as Date | string),
        titleSnapshot: row.title_snapshot ?? '', bodySnapshot: String(row.body_snapshot),
        publicMedia: jsonValue(row.public_media), approvedAt: toIso(row.approved_at as Date | string),
        isCurrent: (() => {
            const latest = latestRevisionByDraft.get(String(row.draft_id));
            return Boolean(latest && latest.id === String(row.draft_revision_id)
                && latest.revisionNumber === Number(row.draft_revision));
        })(),
    }));
    const publications = publicationRows.map((row) => ({
        publicationId: String(row.publication_id), approvalId: String(row.approval_id),
        activityDate: dateString(row.activity_date as Date | string), title: row.title_snapshot ?? '',
        status: String(row.status), errorCode: row.error_code ?? null,
        requestedAt: toIso(row.requested_at as Date | string),
        publishedAt: row.published_at ? toIso(row.published_at as Date | string) : null,
        publicUrl: typeof row.slug === 'string' ? `${siteMetadata.siteUrl}/t/${row.slug}` : null,
    }));
    const history = [
        ...revisions.map((item) => ({ type: 'draft.revision', id: item.id, activityDate: item.activityDate, revisionNumber: item.revisionNumber, occurredAt: item.createdAt })),
        ...approvals.map((item) => ({ type: 'summary.approved', id: item.approvalId, activityDate: item.activityDate, revisionNumber: item.revisionNumber, occurredAt: item.approvedAt })),
        ...publicationEventRows.map((row) => ({
            type: `publication.${String(row.event_type)}`, id: String(row.id), publicationId: String(row.publication_id),
            errorCode: row.error_code ?? null, occurredAt: toIso(row.occurred_at as Date | string),
        })),
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    return { drafts, revisions, approvals, publications, history };
}

/** Create one immutable daily draft shell and safe, status-only first revision. */
export async function createSummaryDraft(ownerId: string, activityDate: ActivityDate) {
    assertPastOrToday(activityDate);
    const sql = getDatabase();
    return sql.begin(async (tx) => {
        await tx`
            INSERT INTO accountability_summary_draft_groups (id, owner_id, activity_date)
            VALUES (${randomUUID()}, ${ownerId}, ${activityDate}::date)
            ON CONFLICT (owner_id, activity_date) DO NOTHING
        `;
        const groups = await tx`
            SELECT id FROM accountability_summary_draft_groups
            WHERE owner_id = ${ownerId} AND activity_date = ${activityDate}::date
            FOR UPDATE
        `;
        const group = groups[0];
        if (!group) throw new Error('SUMMARY_DRAFT_GROUP_NOT_FOUND');
        const prior = await tx`
            SELECT id, draft_id, activity_date, revision_number, title, body, created_at
            FROM accountability_summary_drafts
            WHERE owner_id = ${ownerId} AND draft_id = ${String(group.id)}
            ORDER BY revision_number DESC LIMIT 1
        `;
        if (prior[0]) return {
            duplicate: true,
            draft: {
                id: String(prior[0].id), draftId: String(prior[0].draft_id),
                activityDate: dateString(prior[0].activity_date as Date | string),
                revisionNumber: Number(prior[0].revision_number), title: prior[0].title ?? '',
                body: String(prior[0].body), createdAt: toIso(prior[0].created_at as Date | string),
            },
        };

        // Only fixed status keys are read. Free-form activity/notes, check-ins,
        // no-fap, weight and body records never enter an automatic public draft.
        const completedRows = await tx`
            SELECT habit_key FROM accountability_habit_days
            WHERE owner_id = ${ownerId} AND local_date = ${activityDate}::date AND status = 'complete'
        `;
        const safeKeys = completedRows
            .map((row) => String(row.habit_key))
            .filter((key) => HABITS.some((habit) => habit.key === key));
        const content = buildDailySummaryDraft(activityDate, safeKeys);
        const inserted = await tx`
            INSERT INTO accountability_summary_drafts (
                id, owner_id, draft_id, activity_date, revision_number, title, body
            ) VALUES (
                ${randomUUID()}, ${ownerId}, ${String(group.id)}, ${activityDate}::date, 1,
                ${content.title}, ${content.body}
            ) RETURNING id, created_at
        `;
        return {
            duplicate: false,
            draft: {
                id: String(inserted[0].id), draftId: String(group.id), activityDate,
                revisionNumber: 1, title: content.title, body: content.body,
                createdAt: toIso(inserted[0].created_at as Date | string),
            },
        };
    });
}

/** Save a new immutable revision, rejecting stale editor state. */
export async function editSummaryDraft(
    ownerId: string,
    draftId: string,
    expectedRevisionNumber: number,
    title: string,
    body: string,
) {
    const sql = getDatabase();
    return sql.begin(async (tx) => {
        const groups = await tx`
            SELECT id, activity_date FROM accountability_summary_draft_groups
            WHERE owner_id = ${ownerId} AND id = ${draftId} FOR UPDATE
        `;
        const group = groups[0];
        if (!group) throw new Error('SUMMARY_DRAFT_NOT_FOUND');
        const activityDate = dateString(group.activity_date as Date | string);
        const currentRows = await tx`
            SELECT id, revision_number, title, body, created_at FROM accountability_summary_drafts
            WHERE owner_id = ${ownerId} AND draft_id = ${draftId}
            ORDER BY revision_number DESC LIMIT 1
        `;
        const current = currentRows[0];
        if (!current) throw new Error('SUMMARY_DRAFT_NOT_FOUND');
        const normalizedTitle = normalizeSummaryTitle(title, activityDate);
        const normalizedBody = normalizeSummaryBody(body);
        if (normalizedTitle.length > 200 || `${normalizedTitle}\n\n${normalizedBody}`.length > 3000) {
            throw new RangeError('Summary title must be 200 characters or fewer and public text must be 3000 characters or fewer.');
        }
        if (current.title === normalizedTitle && current.body === normalizedBody) {
            return { duplicate: true, draft: {
                id: String(current.id), draftId, activityDate, revisionNumber: Number(current.revision_number),
                title: String(current.title), body: String(current.body), createdAt: toIso(current.created_at as Date | string),
            } };
        }
        if (Number(current.revision_number) !== expectedRevisionNumber) {
            throw new Error('SUMMARY_REVISION_CONFLICT');
        }
        const revisionNumber = expectedRevisionNumber + 1;
        const rows = await tx`
            INSERT INTO accountability_summary_drafts (
                id, owner_id, draft_id, activity_date, revision_number, title, body
            ) VALUES (
                ${randomUUID()}, ${ownerId}, ${draftId}, ${activityDate}::date,
                ${revisionNumber}, ${normalizedTitle}, ${normalizedBody}
            ) RETURNING id, created_at
        `;
        return { duplicate: false, draft: {
            id: String(rows[0].id), draftId, activityDate, revisionNumber,
            title: normalizedTitle, body: normalizedBody, createdAt: toIso(rows[0].created_at as Date | string),
        } };
    });
}

function assertUniqueMediaSelections(selections: readonly PublicMediaSelection[]): void {
    const sources = new Set<string>();
    const derivatives = new Set<string>();
    for (const selection of selections) {
        if (selection.sourceMediaAssetId === selection.approvedMediaAssetId
            || sources.has(selection.sourceMediaAssetId) || derivatives.has(selection.approvedMediaAssetId)) {
            throw new RangeError('Each selected public derivative must be a distinct sanitized image.');
        }
        sources.add(selection.sourceMediaAssetId);
        derivatives.add(selection.approvedMediaAssetId);
    }
}

async function getValidatedPublicMedia(tx: postgres.TransactionSql, ownerId: string, activityDate: string, selection: PublicMediaSelection) {
    const rows = await tx`
        SELECT source.id AS source_id, source.content_sha256 AS source_hash,
               derivative.id AS derivative_id, derivative.content_sha256 AS derivative_hash
        FROM accountability_media_assets source
        JOIN accountability_media_assets derivative
          ON derivative.owner_id = source.owner_id
         AND derivative.id = ${selection.approvedMediaAssetId}
        JOIN accountability_media_derivatives provenance
          ON provenance.owner_id = source.owner_id
         AND provenance.source_media_asset_id = source.id
         AND provenance.source_content_sha256 = source.content_sha256
         AND provenance.derivative_media_asset_id = derivative.id
         AND provenance.derivative_content_sha256 = derivative.content_sha256
        WHERE source.owner_id = ${ownerId}
          AND source.id = ${selection.sourceMediaAssetId}
          AND source.id <> derivative.id
          AND source.status = 'ready' AND derivative.status = 'ready'
          AND source.local_date = ${activityDate}::date AND derivative.local_date = source.local_date
          AND source.category IN ('body', 'general', 'habit_evidence')
          AND derivative.category = source.category
          AND source.content_type IN ('image/jpeg', 'image/png', 'image/webp')
          AND derivative.content_type = 'image/webp'
          AND derivative.object_key LIKE '%/approved-previews/%'
          AND source.content_sha256 IS NOT NULL AND derivative.content_sha256 IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM accountability_weight_entry_evidence evidence
              WHERE evidence.owner_id = source.owner_id AND evidence.media_asset_id = source.id
          )
        LIMIT 1
    `;
    const row = rows[0];
    if (!row || Buffer.from(row.source_hash as Buffer).length !== 32
        || Buffer.from(row.derivative_hash as Buffer).length !== 32) {
        throw new Error('SUMMARY_PUBLIC_MEDIA_INVALID');
    }
    return {
        sourceMediaAssetId: String(row.source_id), sourceHash: Buffer.from(row.source_hash as Buffer),
        approvedMediaAssetId: String(row.derivative_id), derivativeHash: Buffer.from(row.derivative_hash as Buffer),
    };
}

/** Approve exact immutable text and an explicit, owner-checked derivative list. */
export async function approveSummaryRevision(
    ownerId: string,
    draftId: string,
    revisionNumber: number,
    selections: readonly PublicMediaSelection[],
) {
    assertUniqueMediaSelections(selections);
    const sql = getDatabase();
    return sql.begin(async (tx) => {
        const groupRows = await tx`
            SELECT id FROM accountability_summary_draft_groups
            WHERE owner_id = ${ownerId} AND id = ${draftId}
            FOR UPDATE
        `;
        if (!groupRows[0]) throw new Error('SUMMARY_DRAFT_NOT_FOUND');
        const latestRows = await tx`
            SELECT revision_number FROM accountability_summary_drafts
            WHERE owner_id = ${ownerId} AND draft_id = ${draftId}
            ORDER BY revision_number DESC LIMIT 1
        `;
        if (!latestRows[0]) throw new Error('SUMMARY_DRAFT_NOT_FOUND');
        if (Number(latestRows[0].revision_number) !== revisionNumber) throw new Error('SUMMARY_REVISION_CONFLICT');
        const draftRows = await tx`
            SELECT id, activity_date, title, body FROM accountability_summary_drafts
            WHERE owner_id = ${ownerId} AND draft_id = ${draftId} AND revision_number = ${revisionNumber}
            FOR UPDATE
        `;
        const draft = draftRows[0];
        if (!draft || typeof draft.title !== 'string') throw new Error('SUMMARY_REVISION_NOT_FOUND');
        const activityDate = dateString(draft.activity_date as Date | string);
        const title = String(draft.title);
        const body = String(draft.body);
        if (!title.includes(activityDate) || !/\bIST\b/i.test(title) || !body.endsWith('posted by Ullu 🦉')
            || `${title}\n\n${body}`.length > 3000) {
            throw new Error('SUMMARY_TEXT_NOT_PUBLISHABLE');
        }
        const contentHash = summaryTextSha256(title, body);

        const existingRows = await tx`
            SELECT id, content_sha256 FROM accountability_summary_approvals
            WHERE owner_id = ${ownerId} AND draft_revision_id = ${String(draft.id)}
        `;
        if (existingRows[0]) {
            const mediaRows = await tx`
                SELECT source_media_asset_id, approved_media_asset_id
                FROM accountability_summary_approval_media
                WHERE owner_id = ${ownerId} AND approval_id = ${String(existingRows[0].id)}
            `;
            const existing = mediaRows.map((row) => `${row.source_media_asset_id}:${row.approved_media_asset_id}`).sort();
            const requested = selections.map((selection) => `${selection.sourceMediaAssetId}:${selection.approvedMediaAssetId}`).sort();
            if (!Buffer.from(existingRows[0].content_sha256 as Buffer).equals(contentHash)
                || JSON.stringify(existing) !== JSON.stringify(requested)) {
                throw new Error('SUMMARY_APPROVAL_CONFLICT');
            }
            return { duplicate: true, approvalId: String(existingRows[0].id), activityDate, title, body, publicMedia: selections };
        }

        const approvedMedia = [];
        for (const selection of selections) approvedMedia.push(await getValidatedPublicMedia(tx, ownerId, activityDate, selection));
        const approvalId = randomUUID();
        await tx`
            INSERT INTO accountability_summary_approvals (
                id, owner_id, draft_revision_id, draft_id, draft_revision, activity_date,
                approved_by_user_id, title_snapshot, body_snapshot, content_sha256
            ) VALUES (
                ${approvalId}, ${ownerId}, ${String(draft.id)}, ${draftId}, ${revisionNumber}, ${activityDate}::date,
                ${ownerId}, ${title}, ${body}, ${contentHash}
            )
        `;
        for (const media of approvedMedia) {
            await tx`
                INSERT INTO accountability_summary_approval_media (
                    owner_id, approval_id, source_media_asset_id, source_content_sha256,
                    approved_media_asset_id, approved_content_sha256
                ) VALUES (
                    ${ownerId}, ${approvalId}, ${media.sourceMediaAssetId}, ${media.sourceHash},
                    ${media.approvedMediaAssetId}, ${media.derivativeHash}
                )
            `;
        }
        await tx`
            INSERT INTO accountability_audit_events (id, owner_id, event_type, entity_id)
            VALUES (${randomUUID()}, ${ownerId}, 'summary.approved', ${approvalId})
        `;
        return { duplicate: false, approvalId, activityDate, title, body, publicMedia: selections };
    });
}

type SummaryApprovalSnapshot = {
    approval_id: string;
    draft_id: string;
    draft_revision_id: string;
    draft_revision: number;
    activity_date: string | Date;
    title_snapshot: string;
    body_snapshot: string;
    content_sha256: Buffer | Uint8Array;
    approved_by_user_id: string;
    owner_id: string;
};

type SummaryApprovalMedia = { source_media_asset_id: string; approved_media_asset_id: string };

async function startSummaryPublication(ownerId: string, approvalId: string) {
    const sql = getDatabase();
    const result = await sql.begin(async (tx) => {
        const approvals = await tx<SummaryApprovalSnapshot[]>`
            SELECT id AS approval_id, owner_id, draft_id, draft_revision_id, draft_revision,
                   approved_by_user_id, activity_date,
                   title_snapshot, body_snapshot, content_sha256
            FROM accountability_summary_approvals
            WHERE owner_id = ${ownerId} AND id = ${approvalId}
            FOR UPDATE
        `;
        const approval = approvals[0];
        if (!approval || approval.owner_id !== ownerId || approval.approved_by_user_id !== ownerId) {
            throw new Error('SUMMARY_APPROVAL_NOT_FOUND');
        }
        const activityDate = dateString(approval.activity_date);
        if (!Buffer.from(approval.content_sha256).equals(summaryTextSha256(approval.title_snapshot, approval.body_snapshot))) {
            throw new Error('SUMMARY_APPROVAL_HASH_MISMATCH');
        }
        const groupRows = await tx`
            SELECT id FROM accountability_summary_draft_groups
            WHERE owner_id = ${ownerId} AND id = ${approval.draft_id}
            FOR UPDATE
        `;
        const latestRows = await tx`
            SELECT id, revision_number
            FROM accountability_summary_drafts
            WHERE owner_id = ${ownerId} AND draft_id = ${approval.draft_id}
            ORDER BY revision_number DESC LIMIT 1
        `;
        const isCurrentApproval = Boolean(groupRows[0] && latestRows[0]
            && String(latestRows[0].id) === approval.draft_revision_id
            && Number(latestRows[0].revision_number) === Number(approval.draft_revision));
        const mediaRows = await tx<SummaryApprovalMedia[]>`
            SELECT source_media_asset_id, approved_media_asset_id
            FROM accountability_summary_approval_media
            WHERE owner_id = ${ownerId} AND approval_id = ${approvalId}
            ORDER BY approved_media_asset_id
        `;
        const publicationRows = await tx`
            SELECT id, status, approval_id, random_thought_id
            FROM accountability_summary_publications
            WHERE owner_id = ${ownerId} AND activity_date = ${activityDate}::date
            FOR UPDATE
        `;
        let publication = publicationRows[0];
        if (publication?.status === 'published') {
            if (publication.approval_id === approvalId) {
                return { alreadyPublished: true as const, publicationId: String(publication.id), activityDate, approval, media: mediaRows };
            }
            throw new Error('SUMMARY_DAILY_PUBLICATION_EXISTS');
        }
        const newlyWeightLinkedMedia = await tx`
            SELECT evidence.media_asset_id
            FROM accountability_summary_approval_media approved_media
            JOIN accountability_weight_entry_evidence evidence
              ON evidence.owner_id = approved_media.owner_id
             AND evidence.media_asset_id = approved_media.source_media_asset_id
            WHERE approved_media.owner_id = ${ownerId} AND approved_media.approval_id = ${approvalId}
            LIMIT 1
        `;
        if (newlyWeightLinkedMedia.length > 0) {
            if (publication?.status === 'pending' && publication.approval_id === approvalId) {
                await tx`
                    UPDATE accountability_summary_publications
                    SET status = 'canceled', error_code = 'MEDIA_RECLASSIFIED', published_at = NULL, updated_at = NOW()
                    WHERE owner_id = ${ownerId} AND id = ${String(publication.id)} AND status = 'pending'
                `;
                await tx`
                    INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type, error_code)
                    VALUES (${randomUUID()}, ${ownerId}, ${String(publication.id)}, 'canceled', 'MEDIA_RECLASSIFIED')
                `;
            }
            return { blocked: true as const };
        }
        if (!isCurrentApproval) {
            if (publication?.status === 'pending' && publication.approval_id === approvalId) {
                await tx`
                    UPDATE accountability_summary_publications
                    SET status = 'canceled', error_code = 'STALE_APPROVAL', published_at = NULL, updated_at = NOW()
                    WHERE owner_id = ${ownerId} AND id = ${String(publication.id)} AND status = 'pending'
                `;
                await tx`
                    INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type, error_code)
                    VALUES (${randomUUID()}, ${ownerId}, ${String(publication.id)}, 'canceled', 'STALE_APPROVAL')
                `;
            }
            return { stale: true as const };
        }
        if (!publication) {
            const id = randomUUID();
            const inserted = await tx`
                INSERT INTO accountability_summary_publications (
                    id, owner_id, approval_id, activity_date, idempotency_key_hash
                ) VALUES (${id}, ${ownerId}, ${approvalId}, ${activityDate}::date, ${digest(approvalId)})
                ON CONFLICT DO NOTHING
                RETURNING id, status, approval_id, random_thought_id
            `;
            if (!inserted[0]) {
                const sameApproval = await tx`
                    SELECT id, status, approval_id, random_thought_id FROM accountability_summary_publications
                    WHERE owner_id = ${ownerId} AND activity_date = ${activityDate}::date FOR UPDATE
                `;
                if (sameApproval[0]) publication = sameApproval[0];
                else throw new Error('SUMMARY_DAILY_PUBLICATION_EXISTS');
            } else publication = inserted[0];
        }
        if (publication?.approval_id !== approvalId) {
            await tx`
                UPDATE accountability_summary_publications
                SET approval_id = ${approvalId}, idempotency_key_hash = ${digest(approvalId)},
                    status = 'pending', random_thought_id = NULL, error_code = NULL,
                    published_at = NULL, requested_at = NOW(), updated_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${String(publication.id)}
                  AND status IN ('pending', 'failed', 'canceled')
            `;
            await tx`
                INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type)
                VALUES (${randomUUID()}, ${ownerId}, ${String(publication.id)}, 'requested')
            `;
            publication = { ...publication, approval_id: approvalId, status: 'pending', random_thought_id: null };
        } else if (publication?.status === 'failed' || publication?.status === 'canceled') {
            await tx`
                UPDATE accountability_summary_publications
                SET status = 'pending', error_code = NULL, requested_at = NOW(), updated_at = NOW()
                WHERE owner_id = ${ownerId} AND id = ${String(publication.id)}
            `;
            await tx`
                INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type)
                VALUES (${randomUUID()}, ${ownerId}, ${String(publication.id)}, 'requested')
            `;
        } else if (publication?.status === 'pending') {
            // The row already owns the unique owner/date slot. Pending means no
            // Random Thought was committed (post + status are one transaction).
        } else {
            throw new Error('SUMMARY_PUBLICATION_NOT_AVAILABLE');
        }
        if (publication?.status === 'pending' && !publication.random_thought_id) {
            const eventCheck = await tx`
                SELECT id FROM accountability_summary_publication_events
                WHERE owner_id = ${ownerId} AND publication_id = ${String(publication.id)} AND event_type = 'requested'
                LIMIT 1
            `;
            if (eventCheck.length === 0) {
                await tx`
                    INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type)
                    VALUES (${randomUUID()}, ${ownerId}, ${String(publication.id)}, 'requested')
                `;
            }
        }
        return { alreadyPublished: false as const, publicationId: String(publication.id), activityDate, approval, media: mediaRows };
    });
    if ('blocked' in result && result.blocked) throw new Error('SUMMARY_PUBLIC_MEDIA_INVALID');
    if ('stale' in result && result.stale) throw new Error('SUMMARY_APPROVAL_STALE');
    return result;
}

async function failSummaryPublication(ownerId: string, publicationId: string, approvalId: string, errorCode: string): Promise<void> {
    const sql = getDatabase();
    await sql.begin(async (tx) => {
        const rows = await tx`
            UPDATE accountability_summary_publications
            SET status = 'failed', error_code = ${errorCode}, published_at = NULL, updated_at = NOW()
            WHERE owner_id = ${ownerId} AND id = ${publicationId}
              AND approval_id = ${approvalId} AND status = 'pending'
            RETURNING id
        `;
        if (rows.length) {
            await tx`
                INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type, error_code)
                VALUES (${randomUUID()}, ${ownerId}, ${publicationId}, 'failed', ${errorCode})
            `;
        }
    });
}

function safeErrorCode(error: unknown): string {
    const message = error instanceof Error ? error.message : 'PUBLICATION_FAILED';
    if (message === 'SUMMARY_DAILY_PUBLICATION_EXISTS') return 'DAILY_DUPLICATE';
    if (message === 'SUMMARY_APPROVAL_HASH_MISMATCH') return 'APPROVAL_HASH_MISMATCH';
    if (message === 'Approved-image publication is unavailable: existing public Random Thoughts R2 settings are incomplete.') return 'MEDIA_NOT_CONFIGURED';
    return 'PUBLISH_FAILED';
}

/**
 * Publish from the server-side approval ID only. Selected media are verified
 * again by the publication-media service; the public post + publication status
 * commit atomically, preventing duplicate daily posts on retries.
 */
export async function publishSummaryApproval(
    owner: { id: string; email: string; name: string | null },
    approvalId: string,
) {
    const publication = await startSummaryPublication(owner.id, approvalId);
    if (publication.alreadyPublished) {
        return { duplicate: true, publicationId: publication.publicationId, activityDate: publication.activityDate };
    }

    const uploadedImages: PublishedImage[] = [];
    try {
        for (const media of publication.media) {
            uploadedImages.push(await publishApprovedImageDerivative({
                ownerId: owner.id,
                publicationId: publication.publicationId,
                approvalId,
                sourceMediaAssetId: media.source_media_asset_id,
                approvedMediaAssetId: media.approved_media_asset_id,
            }));
        }

        const sql = getDatabase();
        const result = await sql.begin(async (tx) => {
            const groupRowsForPublication = await tx`
                SELECT id FROM accountability_summary_draft_groups
                WHERE owner_id = ${owner.id} AND id = ${publication.approval.draft_id}
                FOR UPDATE
            `;
            const publicationRows = await tx`
                SELECT id, status, approval_id, activity_date
                FROM accountability_summary_publications
                WHERE owner_id = ${owner.id} AND id = ${publication.publicationId}
                FOR UPDATE
            `;
            const currentPublication = publicationRows[0];
            if (!currentPublication || currentPublication.approval_id !== approvalId) throw new Error('SUMMARY_PUBLICATION_NOT_FOUND');
            if (currentPublication.status === 'published') {
                const priorThought = await tx`
                    SELECT t.id, t.slug FROM accountability_summary_publications p
                    JOIN random_thoughts t ON t.id = p.random_thought_id
                    WHERE p.owner_id = ${owner.id} AND p.id = ${publication.publicationId}
                `;
                return { duplicate: true as const, thoughtId: Number(priorThought[0]?.id), slug: String(priorThought[0]?.slug) };
            }
            if (currentPublication.status !== 'pending') throw new Error('SUMMARY_PUBLICATION_NOT_PENDING');

            const approvalRows = await tx<SummaryApprovalSnapshot[]>`
                SELECT id AS approval_id, owner_id, draft_id, draft_revision_id, draft_revision,
                       approved_by_user_id, activity_date,
                       title_snapshot, body_snapshot, content_sha256
                FROM accountability_summary_approvals
                WHERE owner_id = ${owner.id} AND id = ${approvalId}
            `;
            const approved = approvalRows[0];
            if (!approved || approved.owner_id !== owner.id || approved.approved_by_user_id !== owner.id
                || !Buffer.from(approved.content_sha256).equals(summaryTextSha256(approved.title_snapshot, approved.body_snapshot))) {
                throw new Error('SUMMARY_APPROVAL_HASH_MISMATCH');
            }
            const latestRows = await tx`
                SELECT id, revision_number
                FROM accountability_summary_drafts
                WHERE owner_id = ${owner.id} AND draft_id = ${approved.draft_id}
                ORDER BY revision_number DESC LIMIT 1
            `;
            const weightLinkedRows = await tx`
                SELECT evidence.media_asset_id
                FROM accountability_summary_approval_media approved_media
                JOIN accountability_weight_entry_evidence evidence
                  ON evidence.owner_id = approved_media.owner_id
                 AND evidence.media_asset_id = approved_media.source_media_asset_id
                WHERE approved_media.owner_id = ${owner.id}
                  AND approved_media.approval_id = ${approvalId}
                LIMIT 1
            `;
            if (weightLinkedRows.length > 0) {
                await tx`
                    UPDATE accountability_summary_publications
                    SET status = 'canceled', error_code = 'MEDIA_RECLASSIFIED', published_at = NULL, updated_at = NOW()
                    WHERE owner_id = ${owner.id} AND id = ${publication.publicationId} AND status = 'pending'
                `;
                await tx`
                    INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type, error_code)
                    VALUES (${randomUUID()}, ${owner.id}, ${publication.publicationId}, 'canceled', 'MEDIA_RECLASSIFIED')
                `;
                return { blocked: true as const };
            }
            const approvalIsCurrent = Boolean(groupRowsForPublication[0] && latestRows[0]
                && String(latestRows[0].id) === approved.draft_revision_id
                && Number(latestRows[0].revision_number) === Number(approved.draft_revision));
            if (!approvalIsCurrent) {
                await tx`
                    UPDATE accountability_summary_publications
                    SET status = 'canceled', error_code = 'STALE_APPROVAL', published_at = NULL, updated_at = NOW()
                    WHERE owner_id = ${owner.id} AND id = ${publication.publicationId} AND status = 'pending'
                `;
                await tx`
                    INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type, error_code)
                    VALUES (${randomUUID()}, ${owner.id}, ${publication.publicationId}, 'canceled', 'STALE_APPROVAL')
                `;
                return { stale: true as const };
            }
            const publicContent = `${approved.title_snapshot}\n\n${approved.body_snapshot}`;
            if (publicContent.length > 3000 || !approved.body_snapshot.endsWith('posted by Ullu 🦉')) {
                throw new Error('SUMMARY_TEXT_NOT_PUBLISHABLE');
            }
            const firstImage = uploadedImages[0] ?? null;
            const thoughtRows = await tx`
                INSERT INTO random_thoughts (
                    content, media_url, media_type, created_by_email, created_by_name,
                    created_time_zone, quoted_thought_id
                ) VALUES (
                    ${publicContent}, ${firstImage?.derivativePublicUrl ?? null}, ${firstImage ? 'image' : null},
                    ${owner.email}, ${owner.name?.trim() || 'prosamik'}, 'Asia/Kolkata', NULL
                ) RETURNING id
            `;
            const thoughtId = Number(thoughtRows[0].id);
            const slug = createRandomThoughtSlug(publicContent, thoughtId);
            await tx`UPDATE random_thoughts SET slug = ${slug} WHERE id = ${thoughtId}`;

            const randomThoughtMediaIds: number[] = [];
            for (const [position, image] of uploadedImages.entries()) {
                const mediaRows = await tx`
                    INSERT INTO random_thought_media (
                        thought_id, url, media_type, position, poster_url, content_sha256
                    ) VALUES (
                        ${thoughtId}, ${image.derivativePublicUrl}, 'image', ${position}, NULL,
                        ${image.derivativeContentSha256}
                    ) RETURNING id
                `;
                const randomThoughtMediaId = Number(mediaRows[0].id);
                randomThoughtMediaIds.push(randomThoughtMediaId);
                await tx`
                    INSERT INTO accountability_summary_publication_media (
                        owner_id, publication_id, approval_id, activity_date,
                        approved_media_asset_id, approved_content_sha256,
                        random_thought_id, random_thought_media_id, published_content_sha256
                    ) VALUES (
                        ${owner.id}, ${publication.publicationId}, ${approvalId}, ${publication.activityDate}::date,
                        ${image.approvedMediaAssetId}, ${image.approvedContentSha256},
                        ${thoughtId}, ${randomThoughtMediaId}, ${image.derivativeContentSha256}
                    )
                `;
            }
            if (randomThoughtMediaIds.length !== uploadedImages.length) throw new Error('SUMMARY_MEDIA_PUBLISH_FAILED');

            await tx`
                UPDATE accountability_summary_publications
                SET status = 'published', random_thought_id = ${thoughtId}, published_at = NOW(),
                    error_code = NULL, updated_at = NOW()
                WHERE owner_id = ${owner.id} AND id = ${publication.publicationId} AND status = 'pending'
            `;
            await tx`
                INSERT INTO accountability_summary_publication_events (id, owner_id, publication_id, event_type)
                VALUES (${randomUUID()}, ${owner.id}, ${publication.publicationId}, 'published')
            `;
            await tx`
                INSERT INTO accountability_audit_events (id, owner_id, event_type, entity_id)
                VALUES (${randomUUID()}, ${owner.id}, 'summary.published', ${publication.publicationId})
            `;
            return { duplicate: false as const, thoughtId, slug };
        });
        if ('blocked' in result && result.blocked) {
            for (const image of uploadedImages) {
                await deleteUnattachedApprovedImageDerivative(image.derivativeObjectKey).catch(() => undefined);
            }
            throw new Error('SUMMARY_PUBLIC_MEDIA_INVALID');
        }
        if ('stale' in result && result.stale) {
            for (const image of uploadedImages) {
                await deleteUnattachedApprovedImageDerivative(image.derivativeObjectKey).catch(() => undefined);
            }
            throw new Error('SUMMARY_APPROVAL_STALE');
        }
        if (result.duplicate) {
            for (const image of uploadedImages) {
                await deleteUnattachedApprovedImageDerivative(image.derivativeObjectKey).catch(() => undefined);
            }
        }
        return {
            duplicate: result.duplicate,
            publicationId: publication.publicationId,
            activityDate: publication.activityDate,
            randomThoughtId: result.thoughtId,
            publicUrl: `${siteMetadata.siteUrl}/t/${result.slug}`,
        };
    } catch (error) {
        for (const image of uploadedImages) {
            await deleteUnattachedApprovedImageDerivative(image.derivativeObjectKey).catch(() => undefined);
        }
        await failSummaryPublication(owner.id, publication.publicationId, approvalId, safeErrorCode(error));
        throw error;
    }
}

/** List eligible owner-owned images and only their exact, linked prepared derivatives. */
export async function listSummaryMediaSources(ownerId: string, activityDate: ActivityDate) {
    assertActivityDate(activityDate);
    const sql = getDatabase();
    const rows = await sql`
        SELECT source.id AS source_id, source.local_date, source.category, source.content_type,
               derivative.id AS derivative_id
        FROM accountability_media_assets source
        LEFT JOIN accountability_media_derivatives provenance
          ON provenance.owner_id = source.owner_id
         AND provenance.source_media_asset_id = source.id
         AND provenance.source_content_sha256 = source.content_sha256
        LEFT JOIN accountability_media_assets derivative
          ON derivative.owner_id = provenance.owner_id
         AND derivative.id = provenance.derivative_media_asset_id
         AND derivative.content_sha256 = provenance.derivative_content_sha256
         AND derivative.status = 'ready' AND derivative.content_type = 'image/webp'
         AND derivative.object_key LIKE '%/approved-previews/%'
         AND derivative.category = source.category AND derivative.local_date = source.local_date
        WHERE source.owner_id = ${ownerId}
          AND source.local_date = ${activityDate}::date
          AND source.category IN ('body', 'general', 'habit_evidence')
          AND source.content_type IN ('image/jpeg', 'image/png', 'image/webp')
          AND source.status = 'ready'
          AND source.content_sha256 IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM accountability_weight_entry_evidence evidence
              WHERE evidence.owner_id = source.owner_id AND evidence.media_asset_id = source.id
          )
        ORDER BY source.created_at DESC, provenance.created_at DESC
        LIMIT 100
    `;
    const bySource = new Map<string, {
        sourceMediaAssetId: string; activityDate: ActivityDate; category: string; contentType: string;
        previewUrl: string; preparedDerivatives: Array<{ approvedMediaAssetId: string; previewUrl: string }>;
    }>();
    for (const row of rows) {
        const sourceId = String(row.source_id);
        let source = bySource.get(sourceId);
        if (!source) {
            const preview = await createAccountabilityMediaReadUrl(ownerId, sourceId);
            source = {
                sourceMediaAssetId: sourceId, activityDate: dateString(row.local_date as Date | string),
                category: String(row.category), contentType: preview.contentType, previewUrl: preview.url,
                preparedDerivatives: [],
            };
            bySource.set(sourceId, source);
        }
        if (row.derivative_id) {
            const derivativeId = String(row.derivative_id);
            if (source.preparedDerivatives.some((item) => item.approvedMediaAssetId === derivativeId)) continue;
            const preview = await createAccountabilityMediaReadUrl(ownerId, derivativeId);
            source.preparedDerivatives.push({ approvedMediaAssetId: derivativeId, previewUrl: preview.url });
        }
    }
    const media = [...bySource.values()];
    return { activityDate, media };
}

/** Prepare a private sanitized derivative only from an eligible same-day image. */
export async function prepareSummaryMediaDerivative(ownerId: string, activityDate: ActivityDate, sourceMediaAssetId: string) {
    assertPastOrToday(activityDate);
    const sql = getDatabase();
    const rows = await sql`
        SELECT id, content_sha256 FROM accountability_media_assets asset
        WHERE asset.owner_id = ${ownerId} AND asset.id = ${sourceMediaAssetId}
          AND asset.local_date = ${activityDate}::date AND asset.status = 'ready'
          AND asset.category IN ('body', 'general', 'habit_evidence')
          AND asset.content_type IN ('image/jpeg', 'image/png', 'image/webp')
          AND NOT EXISTS (
              SELECT 1 FROM accountability_weight_entry_evidence evidence
              WHERE evidence.owner_id = asset.owner_id AND evidence.media_asset_id = asset.id
          )
        LIMIT 1
    `;
    if (!rows[0] || !rows[0].content_sha256) throw new Error('SUMMARY_SOURCE_MEDIA_NOT_FOUND');
    const sourceHash = Buffer.from(rows[0].content_sha256 as Buffer);
    const findExisting = async () => {
        const existingRows = await sql`
            SELECT derivative.id
            FROM accountability_media_derivatives provenance
            JOIN accountability_media_assets derivative
              ON derivative.owner_id = provenance.owner_id
             AND derivative.id = provenance.derivative_media_asset_id
             AND derivative.content_sha256 = provenance.derivative_content_sha256
            JOIN accountability_media_assets source
              ON source.owner_id = provenance.owner_id
             AND source.id = provenance.source_media_asset_id
             AND source.content_sha256 = provenance.source_content_sha256
            WHERE provenance.owner_id = ${ownerId}
              AND provenance.source_media_asset_id = ${sourceMediaAssetId}
              AND provenance.source_content_sha256 = ${sourceHash}
              AND source.local_date = ${activityDate}::date
              AND derivative.local_date = source.local_date AND derivative.category = source.category
              AND derivative.status = 'ready' AND derivative.content_type = 'image/webp'
              AND derivative.object_key LIKE '%/approved-previews/%'
            ORDER BY provenance.created_at DESC
            LIMIT 1
        `;
        if (!existingRows[0]) return null;
        const assetId = String(existingRows[0].id);
        const preview = await createAccountabilityMediaReadUrl(ownerId, assetId);
        return { assetId, previewUrl: preview.url, previewExpiresInSeconds: preview.expiresInSeconds };
    };
    const derivative = await reuseOrCreateSummaryDerivative(findExisting, async () => {
        const created = await preparePrivateApprovedImageDerivative(ownerId, sourceMediaAssetId);
        return { assetId: created.assetId, previewUrl: created.previewUrl, previewExpiresInSeconds: created.previewExpiresInSeconds };
    });
    return {
        sourceMediaAssetId,
        approvedMediaAssetId: derivative.value.assetId,
        previewUrl: derivative.value.previewUrl,
        previewExpiresInSeconds: derivative.value.previewExpiresInSeconds,
        contentType: 'image/webp' as const,
        duplicate: !derivative.created,
    };
}
