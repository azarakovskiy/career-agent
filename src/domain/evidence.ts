export interface Workspace {
	id: string;
	createdAt: string;
}

export interface InteractionTurn {
	id: string;
	workspaceId: string;
	recordedAt: string;
	userContent: string;
}

export interface EvidenceItem {
	id: string;
	workspaceId: string;
	interactionTurnId: string;
	recordedAt: string;
	contentSnapshot: string;
	contentHash: string;
}

export interface WorkspaceSnapshot {
	workspace: Workspace;
	interactionTurns: InteractionTurn[];
	evidenceItems: EvidenceItem[];
}
