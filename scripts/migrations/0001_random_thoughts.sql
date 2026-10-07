CREATE TABLE IF NOT EXISTS random_thoughts (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    created_by_email TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_by_avatar TEXT,
    created_time_zone TEXT NOT NULL DEFAULT 'UTC',
    quoted_thought_id BIGINT REFERENCES random_thoughts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT random_thoughts_media_type_check
        CHECK (media_type IS NULL OR media_type IN ('image', 'video')),
    CONSTRAINT random_thoughts_no_self_quote_check
        CHECK (quoted_thought_id IS NULL OR quoted_thought_id <> id)
);

ALTER TABLE random_thoughts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE random_thoughts
    ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE random_thoughts
    ADD COLUMN IF NOT EXISTS created_time_zone TEXT;

UPDATE random_thoughts
SET created_time_zone = 'Asia/Kolkata'
WHERE created_time_zone IS NULL OR BTRIM(created_time_zone) = '';

ALTER TABLE random_thoughts
    ALTER COLUMN created_time_zone SET DEFAULT 'UTC';

ALTER TABLE random_thoughts
    ALTER COLUMN created_time_zone SET NOT NULL;

ALTER TABLE random_thoughts
    ADD COLUMN IF NOT EXISTS quoted_thought_id BIGINT
    REFERENCES random_thoughts(id) ON DELETE SET NULL;

DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'random_thoughts_no_self_quote_check'
          AND conrelid = 'random_thoughts'::regclass
    ) THEN
        ALTER TABLE random_thoughts
            ADD CONSTRAINT random_thoughts_no_self_quote_check
            CHECK (quoted_thought_id IS NULL OR quoted_thought_id <> id);
    END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS random_thoughts_quoted_thought_idx
    ON random_thoughts (quoted_thought_id)
    WHERE quoted_thought_id IS NOT NULL;

WITH generated_slugs AS (
    SELECT
        id,
        TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(LEFT(content, 80)), '[^a-z0-9]+', '-', 'g')) AS base_slug
    FROM random_thoughts
    WHERE slug IS NULL OR BTRIM(slug) = ''
)
UPDATE random_thoughts AS thought
SET slug = CASE
    WHEN generated.base_slug = '' THEN 'thought-' || thought.id
    ELSE generated.base_slug || '-' || thought.id
END
FROM generated_slugs AS generated
WHERE generated.id = thought.id;

CREATE UNIQUE INDEX IF NOT EXISTS random_thoughts_slug_idx
    ON random_thoughts (slug)
    WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS random_thought_media (
    id BIGSERIAL PRIMARY KEY,
    thought_id BIGINT NOT NULL REFERENCES random_thoughts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    poster_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT random_thought_media_type_check
        CHECK (media_type IN ('image', 'video'))
);

ALTER TABLE random_thought_media
    ADD COLUMN IF NOT EXISTS poster_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS random_thought_media_position_idx
    ON random_thought_media (thought_id, position);

CREATE INDEX IF NOT EXISTS random_thought_media_thought_idx
    ON random_thought_media (thought_id);

INSERT INTO random_thought_media (thought_id, url, media_type, position)
SELECT id, media_url, media_type, 0
FROM random_thoughts
WHERE media_url IS NOT NULL
  AND media_type IN ('image', 'video')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS random_thoughts_created_at_idx
    ON random_thoughts (created_at DESC);
