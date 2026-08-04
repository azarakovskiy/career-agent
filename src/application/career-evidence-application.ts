import { resolve } from "node:path";
import type { EvidenceItem, WorkspaceSnapshot } from "../domain/evidence.js";
import {
	deriveProfileClaimStatus,
	deterministicProfileExtractor,
	type CurrentProfileSnapshot,
} from "../domain/profile.js";
import type { ProfileRepository } from "../persistence/profile-repository.js";
import { SqliteWorkspaceRepository } from "../persistence/sqlite-workspace-repository.js";
import type { WorkspaceRepository } from "../persistence/workspace-repository.js";
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
	return [`  - ${evidence.contentSnapshot}`];
}

function renderSnapshot(snapshot: WorkspaceSnapshot): string {
	const lines = [`Evidence items: ${snapshot.evidenceItems.length}`];
	for (const evidence of snapshot.evidenceItems) {
		lines.push(...renderEvidence(evidence));
	}

	return `${lines.join("\n")}\n`;
}

function renderCurrentProfile(profile: CurrentProfileSnapshot): string {
	const lines = [`Current profile: ${profile.claims.length} claims`];

	for (const currentClaim of profile.claims) {
		const status = deriveProfileClaimStatus(
			currentClaim.provenance.map((item) => item.evidenceBasis),
		);
		lines.push(`  - [${status}] ${currentClaim.claim.proposition}`);
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
			return `Evidence saved.\n${renderCurrentProfile(profile)}`;
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
