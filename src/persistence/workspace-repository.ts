import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import type {
	EvidenceItem,
	Workspace,
	WorkspaceSnapshot,
} from "../domain/evidence.js";
import { applyMigrations } from "./migration-runner.js";
import { workspaceQueries } from "./workspace-queries.js";

export interface WorkspaceRepository {
	getWorkspace(): Workspace;
	recordSubmission(content: string): EvidenceItem;
	readSnapshot(): WorkspaceSnapshot;
	close(): void;
}

function validateNonBlank(value: string, label: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${label} must not be blank`);
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

	recordSubmission(content: string): EvidenceItem {
		validateNonBlank(content, "Evidence content");
		const contentHash = createHash("sha256")
			.update(content, "utf8")
			.digest("hex");
		const interactionTurnId = randomUUID();
		const evidenceId = randomUUID();

		return this.database.transaction(() => {
			const interactionTurn = this.database
				.prepare(workspaceQueries.insertInteractionTurn)
				.get(interactionTurnId, this.workspace.id, content) as {
				id: string;
			};
			const evidence = this.database
				.prepare(workspaceQueries.insertEvidenceItem)
				.get(
					evidenceId,
					this.workspace.id,
					interactionTurn.id,
					content,
					contentHash,
				) as { id: string; recorded_at: string };

			return {
				id: evidence.id,
				workspaceId: this.workspace.id,
				interactionTurnId: interactionTurn.id,
				recordedAt: evidence.recorded_at,
				contentSnapshot: content,
				contentHash,
			};
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

		const created = this.database
			.prepare(workspaceQueries.insertWorkspace)
			.get(randomUUID()) as { id: string; created_at: string };
		return { id: created.id, createdAt: created.created_at };
	}
}
