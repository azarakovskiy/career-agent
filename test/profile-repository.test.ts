import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	deterministicProfileExtractor,
	profileClaimId,
} from "../src/domain/profile.js";
import { SqliteWorkspaceRepository } from "../src/persistence/sqlite-workspace-repository.js";

function assertCanonicalUuid(value: string): void {
	assert.match(
		value,
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
	);
}

test("repository persists Current profile claims and provenance across restart", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-profile-"));
	const databasePath = join(directory, "workspace.sqlite");

	try {
		const repository = new SqliteWorkspaceRepository(databasePath);
		const evidence = repository.recordSubmission(
			"Designed and shipped durable APIs.\nFamiliar with Kubernetes.",
		);
		const firstProfile = repository.recordProfileDerivation(
			evidence.id,
			deterministicProfileExtractor(evidence),
		);

		assert.ok(firstProfile.revision);
		assertCanonicalUuid(firstProfile.revision.id);
		assert.equal(firstProfile.revision.causeEvidenceId, evidence.id);
		assert.equal(firstProfile.claims.length, 2);
		assert.equal(
			firstProfile.claims[0]?.claim.normalizedProposition,
			"designed and shipped durable apis",
		);
		assert.equal(
			firstProfile.claims[0]?.provenance[0]?.evidenceId,
			evidence.id,
		);
		assert.equal(
			firstProfile.claims[0]?.provenance[0]?.interactionTurnId,
			evidence.interactionTurnId,
		);
		assert.equal(
			firstProfile.claims[0]?.provenance[0]?.sourceSpan.startLine,
			1,
		);
		assert.equal(
			firstProfile.claims[0]?.provenance[0]?.extractorContext,
			"deterministic-line-v1",
		);
		assert.ok(!Number.isNaN(Date.parse(firstProfile.revision.createdAt)));
		const firstClaimId = firstProfile.claims[0]?.claim.id;
		assert.equal(
			firstClaimId,
			profileClaimId(
				evidence.workspaceId,
				"designed and shipped durable apis",
			),
		);
		repository.close();

		const reopenedRepository = new SqliteWorkspaceRepository(databasePath);
		assert.deepEqual(reopenedRepository.readCurrentProfile(), firstProfile);
		reopenedRepository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("same normalized proposition retains one claim across Evidence items", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-profile-"));
	const databasePath = join(directory, "workspace.sqlite");

	try {
		const repository = new SqliteWorkspaceRepository(databasePath);
		const firstEvidence = repository.recordSubmission(
			"Designed durable APIs.",
		);
		repository.recordProfileDerivation(
			firstEvidence.id,
			deterministicProfileExtractor(firstEvidence),
		);
		const secondEvidence = repository.recordSubmission(
			"designed durable apis!",
		);
		const secondProfile = repository.recordProfileDerivation(
			secondEvidence.id,
			deterministicProfileExtractor(secondEvidence),
		);

		assert.equal(secondProfile.claims.length, 1);
		assert.equal(
			secondProfile.claims[0]?.claim.id,
			profileClaimId(firstEvidence.workspaceId, "designed durable apis"),
		);
		assert.deepEqual(
			secondProfile.claims[0]?.provenance.map((item) => item.evidenceId),
			[firstEvidence.id, secondEvidence.id],
		);
		repository.close();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
