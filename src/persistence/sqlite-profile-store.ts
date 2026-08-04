import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
	CurrentProfileClaim,
	CurrentProfileRevision,
	CurrentProfileSnapshot,
	ProfileClaim,
	ProfileClaimProvenance,
	ProfileExtraction,
} from "../domain/profile.js";
import { profileClaimId } from "../domain/profile.js";
import { profileQueries } from "./profile-queries.js";

export class SqliteProfileStore {
	constructor(
		private readonly database: Database,
		private readonly workspaceId: string,
	) {}

	recordProfileDerivation(
		evidenceId: string,
		extraction: ProfileExtraction,
	): CurrentProfileSnapshot {
		return this.database.transaction(() => {
			const revision = this.database
				.prepare(profileQueries.insertCurrentProfileRevision)
				.get(
					randomUUID(),
					this.workspaceId,
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
					this.workspaceId,
					candidate.normalizedProposition,
				);
				this.database
					.prepare(profileQueries.insertProfileClaim)
					.run(
						claimId,
						this.workspaceId,
						candidate.normalizedProposition,
						candidate.proposition,
					);
				this.database
					.prepare(profileQueries.insertProfileClaimEvidence)
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
				.prepare(profileQueries.listProfileClaimIds)
				.all(this.workspaceId) as Array<{ id: string }>;
			const insertRevisionClaim = this.database.prepare(
				profileQueries.insertCurrentProfileRevisionClaim,
			);
			for (const claim of claimIds) {
				insertRevisionClaim.run(revision.id, claim.id);
			}

			return this.readCurrentProfile();
		})();
	}

	readCurrentProfile(): CurrentProfileSnapshot {
		const revisionRow = this.database
			.prepare(profileQueries.findLatestCurrentProfileRevision)
			.get(this.workspaceId) as
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
				workspaceId: this.workspaceId,
				revision: null,
				claims: [],
			};
		}

		const claimRows = this.database
			.prepare(profileQueries.listCurrentProfileClaims)
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
			if (existing) {
				existing.provenance.push(provenance);
				continue;
			}

			const claim: ProfileClaim = {
				id: row.claim_id,
				workspaceId: row.claim_workspace_id,
				normalizedProposition: row.normalized_proposition,
				proposition: row.proposition,
				createdAt: row.claim_created_at,
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
			workspaceId: this.workspaceId,
			revision,
			claims: [...claims.values()],
		};
	}
}
