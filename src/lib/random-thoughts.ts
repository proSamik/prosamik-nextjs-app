import { getDatabase } from './database';

export type RandomThoughtMediaType = 'image' | 'video';

export type RandomThoughtMedia = {
    id: number;
    url: string;
    type: RandomThoughtMediaType;
    position: number;
};

export type RandomThought = {
    id: number;
    slug: string;
    content: string;
    media: RandomThoughtMedia[];
    createdTimeZone: string;
    createdAt: string;
    updatedAt: string;
};

export type CreateRandomThoughtInput = {
    content: string;
    media: Array<{ url: string; type: RandomThoughtMediaType }>;
    createdByEmail: string;
    createdByName: string;
    createdTimeZone: string;
};

type ThoughtRow = {
    id: number | string;
    slug: string;
    content: string;
    media: unknown;
    created_time_zone: string;
    created_at: Date | string;
    updated_at: Date | string;
};

function toIsoString(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function createRandomThoughtSlug(content: string, id: number): string {
    const base = content
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 72)
        .replace(/-+$/g, '');

    return `${base || 'thought'}-${id}`;
}

function mapMedia(value: unknown): RandomThoughtMedia[] {
    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            parsed = [];
        }
    }

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const media = item as { id?: unknown; url?: unknown; type?: unknown; position?: unknown };
        if (typeof media.url !== 'string' || (media.type !== 'image' && media.type !== 'video')) return [];

        return [{
            id: Number(media.id),
            url: media.url,
            type: media.type,
            position: Number(media.position) || 0,
        }];
    });
}

function mapThought(row: ThoughtRow): RandomThought {
    return {
        id: Number(row.id),
        slug: row.slug,
        content: row.content,
        media: mapMedia(row.media),
        createdTimeZone: row.created_time_zone,
        createdAt: toIsoString(row.created_at),
        updatedAt: toIsoString(row.updated_at),
    };
}

export async function createRandomThought(input: CreateRandomThoughtInput): Promise<RandomThought> {
    const db = getDatabase();
    const firstMedia = input.media[0] ?? null;

    const thoughtId = await db.begin(async (sql) => {
        const rows = await sql`
            INSERT INTO random_thoughts (
                content, media_url, media_type, created_by_email, created_by_name, created_time_zone
            )
            VALUES (
                ${input.content}, ${firstMedia?.url ?? null}, ${firstMedia?.type ?? null},
                ${input.createdByEmail}, ${input.createdByName}, ${input.createdTimeZone}
            )
            RETURNING id
        `;
        const id = Number(rows[0].id);
        const slug = createRandomThoughtSlug(input.content, id);

        await sql`
            UPDATE random_thoughts
            SET slug = ${slug}
            WHERE id = ${id}
        `;

        for (const [position, media] of input.media.entries()) {
            await sql`
                INSERT INTO random_thought_media (thought_id, url, media_type, position)
                VALUES (${id}, ${media.url}, ${media.type}, ${position})
            `;
        }

        return id;
    });

    const thought = await getRandomThoughtById(thoughtId);
    if (!thought) throw new Error('The thought was created but could not be loaded.');
    return thought;
}

export async function listRandomThoughts(limit = 20, offset = 0): Promise<RandomThought[]> {
    const db = getDatabase();
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const safeOffset = Math.max(Math.trunc(offset), 0);
    const rows = await db`
        SELECT
            thought.id,
            thought.slug,
            thought.content,
            thought.created_time_zone,
            thought.created_at,
            thought.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', media.id,
                        'url', media.url,
                        'type', media.media_type,
                        'position', media.position
                    ) ORDER BY media.position, media.id
                ) FILTER (WHERE media.id IS NOT NULL),
                '[]'::json
            ) AS media
        FROM random_thoughts AS thought
        LEFT JOIN random_thought_media AS media ON media.thought_id = thought.id
        GROUP BY thought.id
        ORDER BY thought.created_at DESC
        LIMIT ${safeLimit}
        OFFSET ${safeOffset}
    `;

    return rows.map((row) => mapThought(row as ThoughtRow));
}

export const RANDOM_THOUGHTS_PAGE_SIZE = 5;

export type RandomThoughtsPage = {
    thoughts: RandomThought[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
};

export async function listRandomThoughtsPage(
    requestedPage: number,
    pageSize = RANDOM_THOUGHTS_PAGE_SIZE,
): Promise<RandomThoughtsPage> {
    const db = getDatabase();
    const safePageSize = Math.min(Math.max(Math.trunc(pageSize), 1), 20);
    const countRows = await db`SELECT COUNT(*)::int AS count FROM random_thoughts`;
    const totalCount = Number(countRows[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
    const page = Math.min(Math.max(Math.trunc(requestedPage) || 1, 1), totalPages);
    const thoughts = await listRandomThoughts(safePageSize, (page - 1) * safePageSize);

    return { thoughts, page, pageSize: safePageSize, totalCount, totalPages };
}

export async function getRandomThoughtById(id: number): Promise<RandomThought | null> {
    const db = getDatabase();
    const rows = await db`
        SELECT
            thought.id,
            thought.slug,
            thought.content,
            thought.created_time_zone,
            thought.created_at,
            thought.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', media.id,
                        'url', media.url,
                        'type', media.media_type,
                        'position', media.position
                    ) ORDER BY media.position, media.id
                ) FILTER (WHERE media.id IS NOT NULL),
                '[]'::json
            ) AS media
        FROM random_thoughts AS thought
        LEFT JOIN random_thought_media AS media ON media.thought_id = thought.id
        WHERE thought.id = ${id}
        GROUP BY thought.id
    `;

    return rows[0] ? mapThought(rows[0] as ThoughtRow) : null;
}

export async function getRandomThoughtBySlug(slug: string): Promise<RandomThought | null> {
    const db = getDatabase();
    const rows = await db`
        SELECT
            thought.id,
            thought.slug,
            thought.content,
            thought.created_time_zone,
            thought.created_at,
            thought.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', media.id,
                        'url', media.url,
                        'type', media.media_type,
                        'position', media.position
                    ) ORDER BY media.position, media.id
                ) FILTER (WHERE media.id IS NOT NULL),
                '[]'::json
            ) AS media
        FROM random_thoughts AS thought
        LEFT JOIN random_thought_media AS media ON media.thought_id = thought.id
        WHERE thought.slug = ${slug}
        GROUP BY thought.id
    `;

    return rows[0] ? mapThought(rows[0] as ThoughtRow) : null;
}

export type RandomThoughtSitemapEntry = {
    slug: string;
    updatedAt: string;
};

export async function listRandomThoughtSitemapEntries(): Promise<RandomThoughtSitemapEntry[]> {
    const db = getDatabase();
    const rows = await db`
        SELECT slug, updated_at
        FROM random_thoughts
        WHERE slug IS NOT NULL
        ORDER BY created_at DESC
    `;

    return rows.map((row) => ({
        slug: String(row.slug),
        updatedAt: toIsoString(row.updated_at as Date | string),
    }));
}

export type UpdateRandomThoughtInput = {
    id: number;
    content: string;
    removeMediaIds: number[];
    media: Array<{ url: string; type: RandomThoughtMediaType }>;
};

export async function updateRandomThought(input: UpdateRandomThoughtInput): Promise<{
    thought: RandomThought;
    removedMedia: RandomThoughtMedia[];
} | null> {
    const current = await getRandomThoughtById(input.id);
    if (!current) return null;

    const removeIds = new Set(input.removeMediaIds);
    const removedMedia = current.media.filter((media) => removeIds.has(media.id));
    const remainingMedia = current.media.filter((media) => !removeIds.has(media.id));

    if (!input.content && remainingMedia.length === 0 && input.media.length === 0) {
        throw new Error('A thought needs text or at least one attachment.');
    }

    const firstMedia = remainingMedia[0] ?? input.media[0] ?? null;
    const db = getDatabase();

    await db.begin(async (sql) => {
        for (const media of removedMedia) {
            await sql`
                DELETE FROM random_thought_media
                WHERE id = ${media.id} AND thought_id = ${input.id}
            `;
        }

        for (const [position, media] of remainingMedia.entries()) {
            await sql`
                UPDATE random_thought_media
                SET position = ${position}
                WHERE id = ${media.id} AND thought_id = ${input.id}
            `;
        }

        for (const [offset, media] of input.media.entries()) {
            await sql`
                INSERT INTO random_thought_media (thought_id, url, media_type, position)
                VALUES (${input.id}, ${media.url}, ${media.type}, ${remainingMedia.length + offset})
            `;
        }

        await sql`
            UPDATE random_thoughts
            SET
                content = ${input.content},
                media_url = ${firstMedia?.url ?? null},
                media_type = ${firstMedia?.type ?? null},
                updated_at = NOW()
            WHERE id = ${input.id}
        `;
    });

    const thought = await getRandomThoughtById(input.id);
    if (!thought) return null;
    return { thought, removedMedia };
}

export async function deleteRandomThought(id: number): Promise<RandomThought | null> {
    const thought = await getRandomThoughtById(id);
    if (!thought) return null;

    const db = getDatabase();
    const rows = await db`DELETE FROM random_thoughts WHERE id = ${id} RETURNING id`;
    return rows.length > 0 ? thought : null;
}
