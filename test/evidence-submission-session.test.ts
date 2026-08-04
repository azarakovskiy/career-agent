import { strict as assert } from "node:assert";
import { test } from "node:test";
import type {
	EvidenceItem,
	Workspace,
	WorkspaceSnapshot,
} from "../src/domain/evidence.js";
import {
	LocalEvidenceSubmissionSession,
	type EvidenceSubmissionSession,
} from "../src/session/evidence-submission-session.js";
import type { WorkspaceRepository } from "../src/persistence/workspace-repository.js";

const workspace: Workspace = {
	id: "00000000-0000-4000-8000-000000000001",
	createdAt: "2026-02-01T09:00:00.000Z",
};

const persistedEvidence: EvidenceItem = {
	id: "00000000-0000-4000-8000-000000000002",
	workspaceId: workspace.id,
	interactionTurnId: "00000000-0000-4000-8000-000000000003",
	recordedAt: "2026-02-01T10:00:00.000Z",
	contentSnapshot: "I designed and shipped a durable API.",
	contentHash:
		"521f94d623f42690f358e2fb524a97c47b9ace0f9b8139bc767488d59a2c71db",
};

class RecordingRepository implements WorkspaceRepository {
	readonly submittedContent: string[] = [];

	getWorkspace(): Workspace {
		throw new Error("Session should not construct persistence identifiers");
	}

	recordSubmission(content: string): EvidenceItem {
		this.submittedContent.push(content);
		return persistedEvidence;
	}

	readSnapshot(): WorkspaceSnapshot {
		return {
			workspace,
			interactionTurns: [],
			evidenceItems: [],
		};
	}

	close(): void {}
}

function openSession(
	repository: RecordingRepository,
): EvidenceSubmissionSession {
	return new LocalEvidenceSubmissionSession(repository);
}

test("session delegates pasted content and returns persisted Evidence", () => {
	const repository = new RecordingRepository();
	const session = openSession(repository);
	const content = persistedEvidence.contentSnapshot;

	const evidence = session.submitEvidence(content);

	assert.deepEqual(repository.submittedContent, [content]);
	assert.deepEqual(evidence, persistedEvidence);
});

test("session rejects blank pasted content before persistence", () => {
	const repository = new RecordingRepository();
	const session = openSession(repository);

	assert.throws(
		() => session.submitEvidence(" \n\t "),
		/Evidence content must not be blank/,
	);
	assert.deepEqual(repository.submittedContent, []);
});
