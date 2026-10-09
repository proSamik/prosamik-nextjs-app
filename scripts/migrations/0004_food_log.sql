-- Food stays private and owner scoped, independently of public summary content.
CREATE TABLE accountability_food_entries (
 id UUID PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 local_date DATE NOT NULL, consumed_at TIMESTAMPTZ NOT NULL,
 item TEXT NOT NULL CHECK (length(btrim(item)) BETWEEN 1 AND 200),
 portion TEXT CHECK (length(portion) <= 200),
 calories NUMERIC(10,2) CHECK (calories BETWEEN 0 AND 20000),
 calorie_source TEXT NOT NULL CHECK (calorie_source IN ('estimated','label','measured','unknown')),
 notes TEXT CHECK (length(notes) <= 2000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(owner_id,id),
 CHECK ((consumed_at AT TIME ZONE 'Asia/Kolkata')::date = local_date),
 CHECK ((calories IS NULL AND calorie_source='unknown') OR (calories IS NOT NULL AND calorie_source <> 'unknown'))
);
CREATE INDEX accountability_food_owner_date_idx ON accountability_food_entries(owner_id,local_date DESC,consumed_at DESC);
CREATE TABLE accountability_food_entry_evidence (
 owner_id TEXT NOT NULL, food_entry_id UUID NOT NULL, media_asset_id UUID NOT NULL,
 PRIMARY KEY(owner_id,food_entry_id,media_asset_id),
 FOREIGN KEY(owner_id,food_entry_id) REFERENCES accountability_food_entries(owner_id,id) ON DELETE CASCADE,
 FOREIGN KEY(owner_id,media_asset_id) REFERENCES accountability_media_assets(owner_id,id) ON DELETE CASCADE
);
ALTER TABLE accountability_api_key_scopes DROP CONSTRAINT accountability_api_key_scopes_scope_check;
ALTER TABLE accountability_api_key_scopes ADD CONSTRAINT accountability_api_key_scopes_scope_check CHECK (scope IN (
 'content:read','progress:read','progress:write','check-ins:read','check-ins:write','media:read','media:write','summaries:write','summaries:publish','food:read','food:write'
));
