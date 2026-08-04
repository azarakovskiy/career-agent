import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { EvidenceItem } from "../src/domain/evidence.js";
import {
	DETERMINISTIC_EXTRACTOR_CONTEXT,
	deriveProfileClaimStatus,
	deterministicProfileExtractor,
	extractProfileClaims,
} from "../src/domain/profile.js";

test("extracts bounded claims from nonblank evidence lines", () => {
	const claims = extractProfileClaims(
		"Designed and shipped durable APIs.\n\nFamiliar with Kubernetes.\nInterested in observability.",
	);

	assert.deepEqual(claims, [
		{
			proposition: "Designed and shipped durable APIs.",
			normalizedProposition: "designed and shipped durable apis",
			evidenceBasis: "direct",
			confidence: 0.95,
			extractorContext: DETERMINISTIC_EXTRACTOR_CONTEXT,
			sourceSpan: { startLine: 1, endLine: 1 },
		},
		{
			proposition: "Familiar with Kubernetes.",
			normalizedProposition: "familiar with kubernetes",
			evidenceBasis: "adjacent",
			confidence: 0.7,
			extractorContext: DETERMINISTIC_EXTRACTOR_CONTEXT,
			sourceSpan: { startLine: 3, endLine: 3 },
		},
		{
			proposition: "Interested in observability.",
			normalizedProposition: "interested in observability",
			evidenceBasis: "insufficient",
			confidence: 0,
			extractorContext: DETERMINISTIC_EXTRACTOR_CONTEXT,
			sourceSpan: { startLine: 4, endLine: 4 },
		},
	]);
});

test("stable normalization deduplicates the same proposition", () => {
	const claims = extractProfileClaims(
		"I designed APIs.\ni   designed   apis!\nBuilt databases.",
	);

	assert.equal(claims.length, 2);
	assert.equal(claims[0]?.normalizedProposition, "i designed apis");
	assert.equal(claims[1]?.normalizedProposition, "built databases");
});

test("status is derived from evidence basis, not confidence", () => {
	assert.equal(deriveProfileClaimStatus(["direct"]), "Known");
	assert.equal(deriveProfileClaimStatus(["adjacent"]), "Inferred");
	assert.equal(deriveProfileClaimStatus(["insufficient"]), "Unknown");
	assert.equal(deriveProfileClaimStatus(["adjacent", "direct"]), "Known");
});

test("deterministic extractor receives original Evidence", () => {
	const evidence: EvidenceItem = {
		id: "evidence-id",
		workspaceId: "workspace-id",
		interactionTurnId: "turn-id",
		recordedAt: "2026-01-01T00:00:00.000Z",
		contentSnapshot: "Built a payments service.",
		contentHash: "hash",
	};

	assert.equal(
		deterministicProfileExtractor(evidence)[0]?.proposition,
		evidence.contentSnapshot,
	);
});

test("extractor does not invent prose", () => {
	const content = "Built a payments service.";
	const claims = extractProfileClaims(content);

	assert.equal(claims.length, 1);
	assert.equal(claims[0]?.proposition, content);
});
