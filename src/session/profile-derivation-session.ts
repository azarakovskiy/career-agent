import type { EvidenceItem } from "../domain/evidence.js";
import type {
	CurrentProfileSnapshot,
	ProfileExtractor,
} from "../domain/profile.js";
import type { ProfileRepository } from "../persistence/workspace-repository.js";

export interface ProfileDerivationSession {
	deriveProfile(evidence: EvidenceItem): CurrentProfileSnapshot;
}

export class LocalProfileDerivationSession implements ProfileDerivationSession {
	constructor(
		private readonly repository: ProfileRepository,
		private readonly extractor: ProfileExtractor,
	) {}

	deriveProfile(evidence: EvidenceItem): CurrentProfileSnapshot {
		if (evidence.authoredBy !== "user") {
			throw new Error(
				"Only user-authored Evidence can produce Profile claims",
			);
		}

		return this.repository.recordProfileDerivation(
			evidence.id,
			this.extractor(evidence),
		);
	}
}
