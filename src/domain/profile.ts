import { createHash } from "node:crypto";
import type { EvidenceItem } from "./evidence.js";

export const DETERMINISTIC_EXTRACTOR_CONTEXT = "deterministic-line-v1";

export type ProfileClaimStatus = "Known" | "Inferred" | "Unknown";
export type ProfileEvidenceBasis = "direct" | "adjacent" | "insufficient";

export interface ProfileClaimSourceSpan {
	startLine: number;
	endLine: number;
}

export interface ProfileClaimCandidate {
	proposition: string;
	normalizedProposition: string;
	evidenceBasis: ProfileEvidenceBasis;
	confidence: number;
	extractorContext: string;
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

export type ProfileExtractor = (
	evidence: EvidenceItem,
) => ProfileClaimCandidate[];

export function profileClaimId(normalizedProposition: string): string {
	return createHash("sha256")
		.update(normalizedProposition, "utf8")
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
				extractorContext: DETERMINISTIC_EXTRACTOR_CONTEXT,
				sourceSpan: { startLine: index + 1, endLine: index + 1 },
			},
		];
	});
}

export const deterministicProfileExtractor: ProfileExtractor = (evidence) =>
	extractProfileClaims(evidence.contentSnapshot);
