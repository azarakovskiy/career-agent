const databaseCurrentTimestamp = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export const workspaceQueries = {
	findWorkspace: "SELECT id, created_at FROM workspaces LIMIT 1",
	insertWorkspace: `
		INSERT INTO workspaces (id, created_at)
		VALUES (?, ${databaseCurrentTimestamp})
		RETURNING id, created_at`,
	insertInteractionTurn: `
		INSERT INTO interaction_turns
			(id, workspace_id, recorded_at, user_content)
		 VALUES (?, ?, ${databaseCurrentTimestamp}, ?)
		 RETURNING id, recorded_at`,
	insertEvidenceItem: `
		INSERT INTO evidence_items
			(id, workspace_id, interaction_turn_id, recorded_at, content_snapshot, content_hash, authored_by)
		 VALUES (?, ?, ?, ${databaseCurrentTimestamp}, ?, ?, ?)
		 RETURNING id, recorded_at`,
	listInteractionTurns: `
		SELECT id, workspace_id, recorded_at, user_content
		 FROM interaction_turns
		 WHERE workspace_id = ?
		 ORDER BY recorded_at, id`,
	listEvidenceItems: `
		SELECT id, workspace_id, interaction_turn_id, recorded_at,
				content_snapshot, content_hash, authored_by
		 FROM evidence_items
		 WHERE workspace_id = ?
		 ORDER BY recorded_at, id`,
	insertProfileClaim: `
		INSERT OR IGNORE INTO profile_claims
			(id, workspace_id, normalized_proposition, proposition, created_at)
		 VALUES (?, ?, ?, ?, ${databaseCurrentTimestamp})`,
	insertProfileClaimEvidence: `
		INSERT OR IGNORE INTO profile_claim_evidence
			(claim_id, evidence_id, source_line_start, source_line_end,
			 evidence_basis, confidence, extractor_context, relationship,
			 source_observed_at, valid_from, valid_to)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	insertCurrentProfileRevision: `
		INSERT INTO current_profile_revisions
			(id, workspace_id, cause_evidence_id, extractor_context, created_at)
		 VALUES (?, ?, ?, ?, ${databaseCurrentTimestamp})
		 RETURNING id, workspace_id, cause_evidence_id, extractor_context, created_at`,
	insertCurrentProfileRevisionClaim: `
		INSERT INTO current_profile_revision_claims (revision_id, claim_id)
		 VALUES (?, ?)`,
	findLatestCurrentProfileRevision: `
		SELECT id, workspace_id, cause_evidence_id, extractor_context, created_at
		 FROM current_profile_revisions
		 WHERE workspace_id = ?
		 ORDER BY created_at DESC, id DESC
		 LIMIT 1`,
	listCurrentProfileClaims: `
		SELECT
			c.id AS claim_id,
			c.workspace_id AS claim_workspace_id,
			c.normalized_proposition,
			c.proposition,
			c.created_at AS claim_created_at,
			pe.evidence_id,
			et.recorded_at AS evidence_recorded_at,
			et.interaction_turn_id,
			pe.source_line_start,
			pe.source_line_end,
			pe.evidence_basis,
			pe.confidence,
			pe.extractor_context,
			pe.relationship,
			pe.source_observed_at,
			pe.valid_from,
			pe.valid_to
		 FROM current_profile_revision_claims rc
		 JOIN profile_claims c ON c.id = rc.claim_id
		 JOIN profile_claim_evidence pe ON pe.claim_id = c.id
		 JOIN evidence_items et ON et.id = pe.evidence_id
		 WHERE rc.revision_id = ?
		 ORDER BY c.normalized_proposition, evidence_recorded_at,
			pe.evidence_id, pe.extractor_context`,
} as const;
