CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
);

CREATE TABLE interaction_turns (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    recorded_at TEXT NOT NULL,
    user_content TEXT NOT NULL CHECK (
        length(trim(user_content)) > 0
    )
);

CREATE TABLE evidence_items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    interaction_turn_id TEXT NOT NULL REFERENCES interaction_turns (id),
    recorded_at TEXT NOT NULL,
    content_snapshot TEXT NOT NULL CHECK (
        length(trim(content_snapshot)) > 0
    ),
    content_hash TEXT NOT NULL
);

CREATE INDEX evidence_items_workspace_id ON evidence_items (workspace_id);

CREATE INDEX interaction_turns_workspace_id ON interaction_turns (workspace_id);