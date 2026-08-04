CREATE TABLE profile_claims (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    normalized_proposition TEXT NOT NULL,
    proposition TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (workspace_id, normalized_proposition)
);

CREATE TABLE profile_claim_evidence (
    claim_id TEXT NOT NULL REFERENCES profile_claims (id),
    evidence_id TEXT NOT NULL REFERENCES evidence_items (id),
    source_line_start INTEGER NOT NULL CHECK (source_line_start > 0),
    source_line_end INTEGER NOT NULL CHECK (source_line_end >= source_line_start),
    evidence_basis TEXT NOT NULL CHECK (
        evidence_basis IN ('direct', 'adjacent', 'insufficient')
    ),
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    extractor_context TEXT NOT NULL,
    PRIMARY KEY (claim_id, evidence_id, extractor_context)
);

CREATE TABLE current_profile_revisions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces (id),
    cause_evidence_id TEXT NOT NULL REFERENCES evidence_items (id),
    extractor_context TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE current_profile_revision_claims (
    revision_id TEXT NOT NULL REFERENCES current_profile_revisions (id),
    claim_id TEXT NOT NULL REFERENCES profile_claims (id),
    PRIMARY KEY (revision_id, claim_id)
);

CREATE INDEX profile_claims_workspace_id
    ON profile_claims (workspace_id);

CREATE INDEX profile_claim_evidence_evidence_id
    ON profile_claim_evidence (evidence_id);

CREATE INDEX current_profile_revisions_workspace_id
    ON current_profile_revisions (workspace_id, created_at, id);
