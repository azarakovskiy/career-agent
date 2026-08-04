import { resolve } from "node:path";
import type {
	EvidenceItem,
	InteractionTurn,
	WorkspaceSnapshot,
} from "../domain/evidence.js";
import {
	SqliteWorkspaceRepository,
	type WorkspaceRepository,
} from "../persistence/workspace-repository.js";
import {
	LocalEvidenceSubmissionSession,
	type EvidenceSubmissionSession,
} from "../session/evidence-submission-session.js";

export interface CareerEvidenceApplication {
	listText(): string;
	submitText(content: string): string;
	close(): void;
}

const defaultDatabasePath =
	process.env.CAREER_AGENT_DATABASE ??
	resolve(process.cwd(), "career-agent.sqlite");

function renderEvidence(evidence: EvidenceItem): string[] {
	return [
		`Evidence: ${evidence.id}`,
		`  Workspace: ${evidence.workspaceId}`,
		`  Interaction turn: ${evidence.interactionTurnId}`,
		`  Recorded at: ${evidence.recordedAt}`,
		`  SHA-256: ${evidence.contentHash}`,
		"  Content:",
		evidence.contentSnapshot,
	];
}

function renderInteractionTurn(turn: InteractionTurn): string[] {
	return [
		`Interaction turn: ${turn.id}`,
		`  Workspace: ${turn.workspaceId}`,
		`  Recorded at: ${turn.recordedAt}`,
		"  User content:",
		turn.userContent,
	];
}

function renderSnapshot(snapshot: WorkspaceSnapshot): string {
	const lines = [
		`Workspace: ${snapshot.workspace.id}`,
		`Interaction turns: ${snapshot.interactionTurns.length}`,
	];

	for (const turn of snapshot.interactionTurns) {
		lines.push(...renderInteractionTurn(turn));
	}

	lines.push(`Evidence items: ${snapshot.evidenceItems.length}`);
	for (const evidence of snapshot.evidenceItems) {
		lines.push(...renderEvidence(evidence));
	}

	return `${lines.join("\n")}\n`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class LocalCareerEvidenceApplication implements CareerEvidenceApplication {
	constructor(
		private readonly repository: WorkspaceRepository,
		private readonly session: EvidenceSubmissionSession,
	) {}

	listText(): string {
		return renderSnapshot(this.repository.readSnapshot());
	}

	submitText(content: string): string {
		try {
			const evidence = this.session.submitEvidence(content);
			return `Saved Evidence item: ${evidence.id}\n`;
		} catch (error) {
			return `Error: ${errorMessage(error)}\n`;
		}
	}

	close(): void {
		this.repository.close();
	}
}

export function createCareerEvidenceApplication(
	databasePath: string = defaultDatabasePath,
): CareerEvidenceApplication {
	const repository = new SqliteWorkspaceRepository(databasePath);
	return new LocalCareerEvidenceApplication(
		repository,
		new LocalEvidenceSubmissionSession(repository),
	);
}
