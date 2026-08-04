import { createHash } from "node:crypto";
import type { EvidenceItem } from "./evidence.js";

export const DETERMINISTIC_EXTRACTOR_CONTEXT = "deterministic-line-v1";

export type ProfileClaimStatus = "Known" | "Inferred" | "Unknown";
export type ProfileEvidenceBasis = "direct" | "adjacent" | "insufficient";
export type ProfileClaimRelationship = "supports" | "contradicts" | "corrects";

export interface ProfileClaimSourceSpan {
	startLine: number;
	endLine: number;
}

export interface ProfileClaimCandidate {
	proposition: string;
	normalizedProposition: string;
	evidenceBasis: ProfileEvidenceBasis;
	confidence: number;
	sourceSpan: ProfileClaimSourceSpan;
}

const knownClaimPattern =
	/^(?:i\s+)?(?:built|created|designed|deployed|implemented|led|managed|maintained|shipped)\b/i;
const inferredClaimPattern =
	/^(?:i\s+)?(?:am\s+)?(?:experienced with|familiar with|have experience with|worked with)\b/i;

function normalizeProposition(proposition: string): string {
	return proposition
		.trim()
		.replace(/[.!?]+$/, "")
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function classifyClaim(proposition: string): {
	evidenceBasis: ProfileEvidenceBasis;
	confidence: number;
} {
	if (knownClaimPattern.test(proposition)) {
		return { evidenceBasis: "direct", confidence: 0.95 };
	}
	if (inferredClaimPattern.test(proposition)) {
		return { evidenceBasis: "adjacent", confidence: 0.7 };
	}
	return { evidenceBasis: "insufficient", confidence: 0 };
}

export interface ProfileExtraction {
	extractorContext: string;
	claims: ProfileClaimCandidate[];
}

export type ProfileExtractor = (evidence: EvidenceItem) => ProfileExtraction;

export function profileClaimId(
	workspaceId: string,
	normalizedProposition: string,
): string {
	return createHash("sha256")
		.update(`${workspaceId}\u0000${normalizedProposition}`, "utf8")
		.digest("hex");
}

export function deriveProfileClaimStatus(
	bases: readonly ProfileEvidenceBasis[],
): ProfileClaimStatus {
	if (bases.includes("direct")) {
		return "Known";
	}
	if (bases.includes("adjacent")) {
		return "Inferred";
	}
	return "Unknown";
}

export function extractProfileClaims(content: string): ProfileClaimCandidate[] {
	const seen = new Set<string>();

	return content.split(/\r?\n/).flatMap((line, index) => {
		const proposition = line.trim();
		const normalizedProposition = normalizeProposition(proposition);
		if (!normalizedProposition || seen.has(normalizedProposition)) {
			return [];
		}

		seen.add(normalizedProposition);
		const classification = classifyClaim(proposition);
		return [
			{
				proposition,
				normalizedProposition,
				...classification,
				sourceSpan: { startLine: index + 1, endLine: index + 1 },
			},
		];
	});
}

export const deterministicProfileExtractor: ProfileExtractor = (evidence) => ({
	extractorContext: DETERMINISTIC_EXTRACTOR_CONTEXT,
	claims: extractProfileClaims(evidence.contentSnapshot),
});

export interface ProfileClaim {
	id: string;
	workspaceId: string;
	normalizedProposition: string;
	proposition: string;
	createdAt: string;
}

export interface ProfileClaimProvenance {
	evidenceId: string;
	interactionTurnId: string;
	recordedAt: string;
	sourceObservedAt: string | null;
	validFrom: string | null;
	validTo: string | null;
	relationship: ProfileClaimRelationship;
	sourceSpan: ProfileClaimSourceSpan;
	evidenceBasis: ProfileEvidenceBasis;
	confidence: number;
	extractorContext: string;
}

export interface CurrentProfileClaim {
	claim: ProfileClaim;
	provenance: ProfileClaimProvenance[];
}

export interface CurrentProfileRevision {
	id: string;
	workspaceId: string;
	createdAt: string;
	causeEvidenceId: string;
	extractorContext: string;
}

export interface CurrentProfileSnapshot {
	workspaceId: string;
	revision: CurrentProfileRevision | null;
	claims: CurrentProfileClaim[];
}
