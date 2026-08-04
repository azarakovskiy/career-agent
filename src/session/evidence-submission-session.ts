import type { EvidenceItem } from "../domain/evidence.js";
import type { WorkspaceRepository } from "../persistence/workspace-repository.js";

export interface EvidenceSubmissionSession {
	submitEvidence(content: string): EvidenceItem;
}

export class LocalEvidenceSubmissionSession implements EvidenceSubmissionSession {
	constructor(private readonly repository: WorkspaceRepository) {}

	submitEvidence(content: string): EvidenceItem {
		if (content.trim().length === 0) {
			throw new Error("Evidence content must not be blank");
		}

		return this.repository.recordSubmission(content);
	}
}
