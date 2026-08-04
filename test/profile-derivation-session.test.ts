import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { EvidenceItem } from "../src/domain/evidence.js";
import type {
	CurrentProfileSnapshot,
	ProfileExtraction,
} from "../src/domain/profile.js";
import { LocalProfileDerivationSession } from "../src/session/profile-derivation-session.js";
import type { ProfileRepository } from "../src/persistence/profile-repository.js";

const evidence: EvidenceItem = {
	id: "evidence-id",
	workspaceId: "workspace-id",
	interactionTurnId: "turn-id",
	recordedAt: "2026-01-01T00:00:00.000Z",
	contentSnapshot: "Built a payments service.",
	contentHash: "hash",
	authoredBy: "user",
};

const profile: CurrentProfileSnapshot = {
	workspaceId: evidence.workspaceId,
	revision: null,
	claims: [],
};

class RecordingProfileRepository implements ProfileRepository {
	public recordedEvidenceId: string | undefined;
	public recordedExtraction: ProfileExtraction | undefined;

	recordProfileDerivation(
		evidenceId: string,
		extraction: ProfileExtraction,
	): CurrentProfileSnapshot {
		this.recordedEvidenceId = evidenceId;
		this.recordedExtraction = extraction;
		return profile;
	}

	readCurrentProfile(): CurrentProfileSnapshot {
		return profile;
	}
}

test("profile session rejects agent-authored Evidence", () => {
	const repository = new RecordingProfileRepository();
	const session = new LocalProfileDerivationSession(repository, () => {
		throw new Error("extractor should not run");
	});

	assert.throws(
		() => session.deriveProfile({ ...evidence, authoredBy: "agent" }),
		/Only user-authored Evidence can produce Profile claims/,
	);
});

test("profile session passes original Evidence through the extractor and repository", () => {
	const repository = new RecordingProfileRepository();
	let extractedEvidence: EvidenceItem | undefined;
	const extraction: ProfileExtraction = {
		extractorContext: "test-extractor-v1",
		claims: [],
	};
	const session = new LocalProfileDerivationSession(repository, (value) => {
		extractedEvidence = value;
		return extraction;
	});

	assert.equal(session.deriveProfile(evidence), profile);
	assert.equal(extractedEvidence, evidence);
	assert.equal(repository.recordedEvidenceId, evidence.id);
	assert.equal(repository.recordedExtraction, extraction);
});
