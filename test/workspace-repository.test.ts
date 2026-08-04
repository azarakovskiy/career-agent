import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	SqliteWorkspaceRepository,
	type WorkspaceRepository,
} from "../src/persistence/workspace-repository.js";
import type { EvidenceItem, InteractionTurn } from "../src/domain/evidence.js";

const evidenceContent = "I designed and shipped a durable API.";
const evidenceHash =
	"521f94d623f42690f358e2fb524a97c47b9ace0f9b8139bc767488d59a2c71db";

function openRepository(databasePath: string): WorkspaceRepository {
	return new SqliteWorkspaceRepository(databasePath);
}

function makeTurn(id: string): InteractionTurn {
	return {
		id,
		workspaceId: "00000000-0000-4000-8000-000000000001",
		recordedAt: "2026-02-01T10:00:00.000Z",
		userContent: evidenceContent,
	};
}

function makeEvidence(id: string, interactionTurnId: string): EvidenceItem {
	return {
		id,
		workspaceId: "00000000-0000-4000-8000-000000000001",
		interactionTurnId,
		recordedAt: "2026-02-01T10:00:00.000Z",
		contentSnapshot: evidenceContent,
		contentHash: evidenceHash,
	};
}

test("repository persists one Workspace and immutable Evidence across restart", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-"));
	const databasePath = join(directory, "workspace.sqlite");
	const firstTurn = makeTurn("00000000-0000-4000-8000-000000000002");
	const firstEvidence = makeEvidence(
		"00000000-0000-4000-8000-000000000003",
		firstTurn.id,
	);

	try {
		const repository = openRepository(databasePath);
		const workspace = repository.getWorkspace();

		assert.match(workspace.id, /^[0-9a-f-]{36}$/);
		repository.recordSubmission(
			{ ...firstTurn, workspaceId: workspace.id },
			{ ...firstEvidence, workspaceId: workspace.id },
		);

		const firstSnapshot = repository.readSnapshot();
		assert.equal(firstSnapshot.workspace.id, workspace.id);
		assert.deepEqual(firstSnapshot.interactionTurns, [
			{ ...firstTurn, workspaceId: workspace.id },
		]);
		assert.deepEqual(firstSnapshot.evidenceItems, [
			{ ...firstEvidence, workspaceId: workspace.id },
		]);
		repository.close();

		const reopenedRepository = openRepository(databasePath);
		assert.deepEqual(reopenedRepository.readSnapshot(), firstSnapshot);
		reopenedRepository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("repeating a submission stores distinct Evidence and failed writes leave no partial turn", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-"));
	const databasePath = join(directory, "workspace.sqlite");

	try {
		const repository = openRepository(databasePath);
		const workspace = repository.getWorkspace();
		const firstTurn = {
			...makeTurn("00000000-0000-4000-8000-000000000002"),
			workspaceId: workspace.id,
		};
		const firstEvidence = {
			...makeEvidence("00000000-0000-4000-8000-000000000003", firstTurn.id),
			workspaceId: workspace.id,
		};
		repository.recordSubmission(firstTurn, firstEvidence);

		const secondTurn = {
			...makeTurn("00000000-0000-4000-8000-000000000004"),
			workspaceId: workspace.id,
		};
		const secondEvidence = {
			...makeEvidence("00000000-0000-4000-8000-000000000005", secondTurn.id),
			workspaceId: workspace.id,
		};
		repository.recordSubmission(secondTurn, secondEvidence);

		const repeatedSnapshot = repository.readSnapshot();
		assert.equal(repeatedSnapshot.evidenceItems.length, 2);
		assert.notEqual(
			repeatedSnapshot.evidenceItems[0]?.id,
			repeatedSnapshot.evidenceItems[1]?.id,
		);
		assert.equal(
			repeatedSnapshot.evidenceItems[0]?.contentHash,
			repeatedSnapshot.evidenceItems[1]?.contentHash,
		);

		const beforeFailedWrite = repository.readSnapshot();
		assert.throws(() =>
			repository.recordSubmission(secondTurn, {
				...firstEvidence,
				interactionTurnId: secondTurn.id,
			}),
		);
		assert.deepEqual(repository.readSnapshot(), beforeFailedWrite);

		assert.throws(() =>
			repository.recordSubmission(
				{
					...secondTurn,
					id: "00000000-0000-4000-8000-000000000006",
				},
				{
					...secondEvidence,
					id: "00000000-0000-4000-8000-000000000007",
					contentSnapshot: "   ",
				},
			),
		);
		assert.deepEqual(repository.readSnapshot(), beforeFailedWrite);
		repository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
