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

export type EvidenceAuthorship = "user" | "agent";

export interface EvidenceItem {
	id: string;
	workspaceId: string;
	interactionTurnId: string;
	recordedAt: string;
	contentSnapshot: string;
	contentHash: string;
	authoredBy: EvidenceAuthorship;
}

export interface WorkspaceSnapshot {
	workspace: Workspace;
	interactionTurns: InteractionTurn[];
	evidenceItems: EvidenceItem[];
}
