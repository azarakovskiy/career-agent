import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import type {
	EvidenceItem,
	Workspace,
	WorkspaceSnapshot,
} from "../domain/evidence.js";
import type {
	CurrentProfileClaim,
	CurrentProfileRevision,
	CurrentProfileSnapshot,
	ProfileClaim,
	ProfileClaimProvenance,
	ProfileExtraction,
} from "../domain/profile.js";
import { profileClaimId } from "../domain/profile.js";
import { applyMigrations } from "./migration-runner.js";
import { workspaceQueries } from "./workspace-queries.js";

export interface WorkspaceRepository {
	getWorkspace(): Workspace;
	recordSubmission(content: string): EvidenceItem;
	readSnapshot(): WorkspaceSnapshot;
	close(): void;
}

export interface ProfileRepository {
	recordProfileDerivation(
		evidenceId: string,
		extraction: ProfileExtraction,
	): CurrentProfileSnapshot;
	readCurrentProfile(): CurrentProfileSnapshot;
}

function validateNonBlank(value: string, label: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${label} must not be blank`);
	}
}

export class SqliteWorkspaceRepository
	implements WorkspaceRepository, ProfileRepository
{
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
					"user",
				) as { id: string; recorded_at: string };

			return {
				id: evidence.id,
				workspaceId: this.workspace.id,
				interactionTurnId: interactionTurn.id,
				recordedAt: evidence.recorded_at,
				contentSnapshot: content,
				contentHash,
				authoredBy: "user" as const,
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
			authored_by: "user" | "agent";
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
				authoredBy: row.authored_by,
			})),
		};
	}

	recordProfileDerivation(
		evidenceId: string,
		extraction: ProfileExtraction,
	): CurrentProfileSnapshot {
		return this.database.transaction(() => {
			const revision = this.database
				.prepare(workspaceQueries.insertCurrentProfileRevision)
				.get(
					randomUUID(),
					this.workspace.id,
					evidenceId,
					extraction.extractorContext,
				) as {
				id: string;
				workspace_id: string;
				cause_evidence_id: string;
				extractor_context: string;
				created_at: string;
			};

			for (const candidate of extraction.claims) {
				const claimId = profileClaimId(
					this.workspace.id,
					candidate.normalizedProposition,
				);
				this.database
					.prepare(workspaceQueries.insertProfileClaim)
					.run(
						claimId,
						this.workspace.id,
						candidate.normalizedProposition,
						candidate.proposition,
					);
				this.database
					.prepare(workspaceQueries.insertProfileClaimEvidence)
					.run(
						claimId,
						evidenceId,
						candidate.sourceSpan.startLine,
						candidate.sourceSpan.endLine,
						candidate.evidenceBasis,
						candidate.confidence,
						extraction.extractorContext,
						"supports",
						null,
						null,
						null,
					);
			}

			const claimIds = this.database
				.prepare(
					"SELECT id FROM profile_claims WHERE workspace_id = ? ORDER BY normalized_proposition",
				)
				.all(this.workspace.id) as Array<{ id: string }>;
			const insertRevisionClaim = this.database.prepare(
				workspaceQueries.insertCurrentProfileRevisionClaim,
			);
			for (const claim of claimIds) {
				insertRevisionClaim.run(revision.id, claim.id);
			}

			return this.readCurrentProfile();
		})();
	}

	readCurrentProfile(): CurrentProfileSnapshot {
		const revisionRow = this.database
			.prepare(workspaceQueries.findLatestCurrentProfileRevision)
			.get(this.workspace.id) as
			| {
					id: string;
					workspace_id: string;
					cause_evidence_id: string;
					extractor_context: string;
					created_at: string;
			  }
			| undefined;

		if (!revisionRow) {
			return {
				workspaceId: this.workspace.id,
				revision: null,
				claims: [],
			};
		}

		const claimRows = this.database
			.prepare(workspaceQueries.listCurrentProfileClaims)
			.all(revisionRow.id) as Array<{
			claim_id: string;
			claim_workspace_id: string;
			normalized_proposition: string;
			proposition: string;
			claim_created_at: string;
			evidence_id: string;
			evidence_recorded_at: string;
			interaction_turn_id: string;
			source_line_start: number;
			source_line_end: number;
			evidence_basis: "direct" | "adjacent" | "insufficient";
			confidence: number;
			extractor_context: string;
			relationship: "supports" | "contradicts" | "corrects";
			source_observed_at: string | null;
			valid_from: string | null;
			valid_to: string | null;
		}>;
		const claims = new Map<string, CurrentProfileClaim>();

		for (const row of claimRows) {
			const existing = claims.get(row.claim_id);
			if (existing) {
				existing.provenance.push({
					evidenceId: row.evidence_id,
					interactionTurnId: row.interaction_turn_id,
					recordedAt: row.evidence_recorded_at,
					sourceObservedAt: row.source_observed_at,
					validFrom: row.valid_from,
					validTo: row.valid_to,
					relationship: row.relationship,
					sourceSpan: {
						startLine: row.source_line_start,
						endLine: row.source_line_end,
					},
					evidenceBasis: row.evidence_basis,
					confidence: row.confidence,
					extractorContext: row.extractor_context,
				});
				continue;
			}

			const claim: ProfileClaim = {
				id: row.claim_id,
				workspaceId: row.claim_workspace_id,
				normalizedProposition: row.normalized_proposition,
				proposition: row.proposition,
				createdAt: row.claim_created_at,
			};
			const provenance: ProfileClaimProvenance = {
				evidenceId: row.evidence_id,
				interactionTurnId: row.interaction_turn_id,
				recordedAt: row.evidence_recorded_at,
				sourceObservedAt: row.source_observed_at,
				validFrom: row.valid_from,
				validTo: row.valid_to,
				relationship: row.relationship,
				sourceSpan: {
					startLine: row.source_line_start,
					endLine: row.source_line_end,
				},
				evidenceBasis: row.evidence_basis,
				confidence: row.confidence,
				extractorContext: row.extractor_context,
			};
			claims.set(row.claim_id, { claim, provenance: [provenance] });
		}

		const revision: CurrentProfileRevision = {
			id: revisionRow.id,
			workspaceId: revisionRow.workspace_id,
			createdAt: revisionRow.created_at,
			causeEvidenceId: revisionRow.cause_evidence_id,
			extractorContext: revisionRow.extractor_context,
		};
		return {
			workspaceId: this.workspace.id,
			revision,
			claims: [...claims.values()],
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
