import { resolve } from "node:path";
import type {
	EvidenceItem,
	InteractionTurn,
	WorkspaceSnapshot,
} from "../domain/evidence.js";
import {
	deriveProfileClaimStatus,
	deterministicProfileExtractor,
	type CurrentProfileSnapshot,
} from "../domain/profile.js";
import {
	SqliteWorkspaceRepository,
	type ProfileRepository,
	type WorkspaceRepository,
} from "../persistence/workspace-repository.js";
import {
	LocalEvidenceSubmissionSession,
	type EvidenceSubmissionSession,
} from "../session/evidence-submission-session.js";
import {
	LocalProfileDerivationSession,
	type ProfileDerivationSession,
} from "../session/profile-derivation-session.js";

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
		`  Authored by: ${evidence.authoredBy}`,
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

function deriveProfileClaimConfidence(
	provenance: CurrentProfileSnapshot["claims"][number]["provenance"],
): number {
	return Math.max(...provenance.map((item) => item.confidence));
}

function renderCurrentProfile(profile: CurrentProfileSnapshot): string {
	const lines = [
		`Current profile revision: ${profile.revision?.id ?? "none"}`,
		`Profile claims: ${profile.claims.length}`,
	];

	if (profile.revision) {
		lines.push(
			`  Caused by Evidence: ${profile.revision.causeEvidenceId}`,
			`  Extractor context: ${profile.revision.extractorContext}`,
			`  Created at: ${profile.revision.createdAt}`,
		);
	}

	for (const currentClaim of profile.claims) {
		const status = deriveProfileClaimStatus(
			currentClaim.provenance.map((item) => item.evidenceBasis),
		);
		const confidence = deriveProfileClaimConfidence(
			currentClaim.provenance,
		);
		lines.push(
			`Claim: ${currentClaim.claim.proposition}`,
			`  Normalized: ${currentClaim.claim.normalizedProposition}`,
			`  Status: ${status}`,
			`  Confidence: ${confidence.toFixed(2)}`,
			"  Provenance:",
		);
		for (const provenance of currentClaim.provenance) {
			lines.push(
				`    Evidence: ${provenance.evidenceId}`,
				`    Interaction turn: ${provenance.interactionTurnId}`,
				`    Recorded at: ${provenance.recordedAt}`,
				`    Source observed at: ${provenance.sourceObservedAt ?? "unknown"}`,
				`    Valid from: ${provenance.validFrom ?? "unknown"}`,
				`    Valid to: ${provenance.validTo ?? "unknown"}`,
				`    Relationship: ${provenance.relationship}`,
				`    Source lines: ${provenance.sourceSpan.startLine}-${provenance.sourceSpan.endLine}`,
				`    Basis: ${provenance.evidenceBasis}`,
				`    Confidence: ${provenance.confidence.toFixed(2)}`,
				`    Extractor context: ${provenance.extractorContext}`,
			);
		}
	}

	return `${lines.join("\n")}\n`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class LocalCareerEvidenceApplication implements CareerEvidenceApplication {
	constructor(
		private readonly repository: WorkspaceRepository,
		private readonly profileRepository: ProfileRepository,
		private readonly session: EvidenceSubmissionSession,
		private readonly profileSession: ProfileDerivationSession,
	) {}

	listText(): string {
		return `${renderSnapshot(this.repository.readSnapshot())}${renderCurrentProfile(this.profileRepository.readCurrentProfile())}`;
	}

	submitText(content: string): string {
		try {
			const evidence = this.session.submitEvidence(content);
			const profile = this.profileSession.deriveProfile(evidence);
			return `Saved Evidence item: ${evidence.id}\n${renderCurrentProfile(profile)}`;
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
		repository,
		new LocalEvidenceSubmissionSession(repository),
		new LocalProfileDerivationSession(
			repository,
			deterministicProfileExtractor,
		),
	);
}
