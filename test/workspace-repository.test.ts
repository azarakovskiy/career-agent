import { strict as assert } from "node:assert";
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	SqliteWorkspaceRepository,
	type WorkspaceRepository,
} from "../src/persistence/workspace-repository.js";

const evidenceContent = "I designed and shipped a durable API.";
const evidenceHash =
	"521f94d623f42690f358e2fb524a97c47b9ace0f9b8139bc767488d59a2c71db";

function openRepository(databasePath: string): WorkspaceRepository {
	return new SqliteWorkspaceRepository(databasePath);
}

function assertCanonicalUuid(value: string): void {
	assert.match(
		value,
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
	);
}

test("repository persists Workspace and Evidence across restart", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-"));
	const databasePath = join(directory, "workspace.sqlite");

	try {
		const repository = openRepository(databasePath);
		const workspace = repository.getWorkspace();
		const evidence = repository.recordSubmission(evidenceContent);
		const firstSnapshot = repository.readSnapshot();
		const interactionTurn = firstSnapshot.interactionTurns[0];

		assertCanonicalUuid(workspace.id);
		assertCanonicalUuid(evidence.id);
		assertCanonicalUuid(evidence.interactionTurnId);
		assert.equal(workspace.id, evidence.workspaceId);
		assert.equal(interactionTurn?.id, evidence.interactionTurnId);
		assert.equal(interactionTurn?.userContent, evidenceContent);
		assert.equal(evidence.contentSnapshot, evidenceContent);
		assert.equal(evidence.contentHash, evidenceHash);
		assert.equal(evidence.authoredBy, "user");
		assert.ok(!Number.isNaN(Date.parse(workspace.createdAt)));
		assert.ok(!Number.isNaN(Date.parse(evidence.recordedAt)));
		assert.deepEqual(firstSnapshot.evidenceItems, [evidence]);
		repository.close();

		const reopenedRepository = openRepository(databasePath);
		assert.deepEqual(reopenedRepository.readSnapshot(), firstSnapshot);
		reopenedRepository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("repeating a submission stores distinct Evidence IDs", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-"));
	const databasePath = join(directory, "workspace.sqlite");

	try {
		const repository = openRepository(databasePath);
		const first = repository.recordSubmission(evidenceContent);
		const second = repository.recordSubmission(evidenceContent);

		assert.notEqual(first.id, second.id);
		assert.notEqual(first.interactionTurnId, second.interactionTurnId);
		assert.equal(first.contentHash, second.contentHash);
		repository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("failed Evidence writes leave no partial Interaction turn", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-"));
	const databasePath = join(directory, "workspace.sqlite");

	try {
		const repository = openRepository(databasePath);
		const beforeFailedWrite = repository.readSnapshot();
		const sabotageDatabase = new Database(databasePath);
		sabotageDatabase.exec(`
			CREATE TRIGGER fail_evidence_insert
			BEFORE INSERT ON evidence_items
			BEGIN
				SELECT RAISE(ABORT, 'forced evidence failure');
			END;
		`);

		try {
			assert.throws(
				() => repository.recordSubmission(evidenceContent),
				/forced evidence failure/,
			);
		} finally {
			sabotageDatabase.close();
		}

		assert.deepEqual(repository.readSnapshot(), beforeFailedWrite);
		repository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
