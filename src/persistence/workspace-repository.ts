import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import type {
	EvidenceItem,
	InteractionTurn,
	Workspace,
	WorkspaceSnapshot,
} from "../domain/evidence.js";
import { applyMigrations } from "./migration-runner.js";
import { workspaceQueries } from "./workspace-queries.js";

export interface WorkspaceRepository {
	getWorkspace(): Workspace;
	recordSubmission(turn: InteractionTurn, evidence: EvidenceItem): void;
	readSnapshot(): WorkspaceSnapshot;
	close(): void;
}

const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;

function validateCanonicalUuid(value: string, label: string): void {
	if (!uuidPattern.test(value)) {
		throw new Error(`${label} must be a canonical lowercase UUID`);
	}
}

function validateNonBlank(value: string, label: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${label} must not be blank`);
	}
}

function validateRecordedAt(value: string, label: string): void {
	if (Number.isNaN(Date.parse(value))) {
		throw new Error(`${label} must be a valid timestamp`);
	}
}

function validateSubmission(
	workspaceId: string,
	turn: InteractionTurn,
	evidence: EvidenceItem,
): void {
	validateCanonicalUuid(workspaceId, "Workspace ID");
	validateCanonicalUuid(turn.id, "Interaction turn ID");
	validateCanonicalUuid(evidence.id, "Evidence item ID");
	validateCanonicalUuid(turn.workspaceId, "Interaction turn Workspace ID");
	validateCanonicalUuid(evidence.workspaceId, "Evidence item Workspace ID");
	validateCanonicalUuid(
		evidence.interactionTurnId,
		"Evidence interaction turn ID",
	);
	if (
		turn.workspaceId !== workspaceId ||
		evidence.workspaceId !== workspaceId
	) {
		throw new Error("Submission records must belong to the current Workspace");
	}
	if (evidence.interactionTurnId !== turn.id) {
		throw new Error("Evidence must reference its Interaction turn");
	}
	validateRecordedAt(turn.recordedAt, "Interaction turn recording time");
	validateRecordedAt(evidence.recordedAt, "Evidence recording time");
	validateNonBlank(turn.userContent, "Interaction turn content");
	validateNonBlank(evidence.contentSnapshot, "Evidence content snapshot");
	if (!sha256Pattern.test(evidence.contentHash)) {
		throw new Error("Evidence content hash must be a lowercase SHA-256 hash");
	}
	const actualHash = createHash("sha256")
		.update(evidence.contentSnapshot, "utf8")
		.digest("hex");
	if (actualHash !== evidence.contentHash) {
		throw new Error(
			"Evidence content hash does not match its content snapshot",
		);
	}
}

export class SqliteWorkspaceRepository implements WorkspaceRepository {
	private readonly database: Database;
	private readonly workspace: Workspace;

	constructor(databasePath: string) {
		this.database = new Database(databasePath);
		this.database.pragma("foreign_keys = ON");
		applyMigrations(this.database);
		this.workspace = this.loadOrCreateWorkspace();
	}

	getWorkspace(): Workspace {
		return { ...this.workspace };
	}

	recordSubmission(turn: InteractionTurn, evidence: EvidenceItem): void {
		validateSubmission(this.workspace.id, turn, evidence);

		this.database.transaction(() => {
			this.database
				.prepare(workspaceQueries.insertInteractionTurn)
				.run(turn.id, turn.workspaceId, turn.recordedAt, turn.userContent);
			this.database
				.prepare(workspaceQueries.insertEvidenceItem)
				.run(
					evidence.id,
					evidence.workspaceId,
					evidence.interactionTurnId,
					evidence.recordedAt,
					evidence.contentSnapshot,
					evidence.contentHash,
				);
		})();
	}

	readSnapshot(): WorkspaceSnapshot {
		const interactionTurns = this.database
			.prepare(workspaceQueries.listInteractionTurns)
			.all(this.workspace.id) as Array<{
				id: string;
				workspace_id: string;
				recorded_at: string;
				user_content: string;
			}>;
		const evidenceItems = this.database
			.prepare(workspaceQueries.listEvidenceItems)
			.all(this.workspace.id) as Array<{
				id: string;
				workspace_id: string;
				interaction_turn_id: string;
				recorded_at: string;
				content_snapshot: string;
				content_hash: string;
			}>;

		return {
			workspace: this.getWorkspace(),
			interactionTurns: interactionTurns.map((row) => ({
				id: row.id,
				workspaceId: row.workspace_id,
				recordedAt: row.recorded_at,
				userContent: row.user_content,
			})),
			evidenceItems: evidenceItems.map((row) => ({
				id: row.id,
				workspaceId: row.workspace_id,
				interactionTurnId: row.interaction_turn_id,
				recordedAt: row.recorded_at,
				contentSnapshot: row.content_snapshot,
				contentHash: row.content_hash,
			})),
		};
	}

	close(): void {
		this.database.close();
	}

	private loadOrCreateWorkspace(): Workspace {
		const existing = this.database
			.prepare(workspaceQueries.findWorkspace)
			.get() as { id: string; created_at: string } | undefined;
		if (existing) {
			return { id: existing.id, createdAt: existing.created_at };
		}

		const workspace = {
			id: randomUUID(),
			createdAt: new Date().toISOString(),
		};
		this.database
			.prepare(workspaceQueries.insertWorkspace)
			.run(workspace.id, workspace.createdAt);
		return workspace;
	}
}
