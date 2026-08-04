ALTER TABLE evidence_items
ADD COLUMN authored_by TEXT NOT NULL DEFAULT 'user' CHECK (
    authored_by IN ('user', 'agent')
);
