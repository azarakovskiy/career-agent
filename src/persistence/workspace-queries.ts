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
			(id, workspace_id, interaction_turn_id, recorded_at, content_snapshot, content_hash)
		 VALUES (?, ?, ?, ${databaseCurrentTimestamp}, ?, ?)
		 RETURNING id, recorded_at`,
	listInteractionTurns: `
		SELECT id, workspace_id, recorded_at, user_content
		 FROM interaction_turns
		 WHERE workspace_id = ?
		 ORDER BY recorded_at, id`,
	listEvidenceItems: `
		SELECT id, workspace_id, interaction_turn_id, recorded_at,
				content_snapshot, content_hash
		 FROM evidence_items
		 WHERE workspace_id = ?
		 ORDER BY recorded_at, id`,
} as const;
