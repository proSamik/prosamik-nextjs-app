CREATE TABLE accountability_mcp_access_logs (
    id UUID PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES accountability_api_keys(id) ON DELETE SET NULL,
    client_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK (length(method) <= 120),
    tool_name TEXT CHECK (length(tool_name) <= 120),
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'error')),
    http_status INTEGER NOT NULL CHECK (http_status BETWEEN 100 AND 599),
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX accountability_mcp_access_logs_owner_time_idx
    ON accountability_mcp_access_logs(owner_id, occurred_at DESC);
