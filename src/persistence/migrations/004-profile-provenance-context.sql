ALTER TABLE profile_claim_evidence
ADD COLUMN relationship TEXT NOT NULL DEFAULT 'supports' CHECK (
    relationship IN ('supports', 'contradicts', 'corrects')
);

ALTER TABLE profile_claim_evidence
ADD COLUMN source_observed_at TEXT;

ALTER TABLE profile_claim_evidence
ADD COLUMN valid_from TEXT;

ALTER TABLE profile_claim_evidence
ADD COLUMN valid_to TEXT;
