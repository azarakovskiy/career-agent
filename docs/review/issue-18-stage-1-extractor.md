# Issue 18 — Stage 1 deterministic extractor

**Status:** Ready for human review

## Scope

Added the `ProfileExtractor` function seam in `src/domain/profile.ts`. It receives the original `EvidenceItem` and returns candidate propositions with provenance, so a future semantic or LLM adapter can consume the original source rather than a mechanically preprocessed version. The deterministic adapter treats each nonblank Evidence line as one candidate, preserves the original trimmed line for display, and normalizes identity by trimming terminal punctuation, collapsing whitespace, and lowercasing.

Repeated normalized propositions within one Evidence item are emitted once. Each candidate retains a one-based source line span and the fixed extractor context `deterministic-line-v1`; it never generates a summary or other agent-authored Evidence.

## Bounded status rules

- `Known` (`0.95`) requires a direct-action opening such as `built`, `designed`, `implemented`, or `shipped`.
- `Inferred` (`0.70`) requires an explicit experience opening such as `familiar with` or `worked with`.
- Everything else is `Unknown` (`0.00`).

The extractor records an evidence basis; `deriveProfileClaimStatus` derives the display status from that basis, never from confidence alone. These deterministic rules are intentionally narrow and are not a general language understanding system. They are a bounded fixture/fallback implementation, not an LLM pre-step.

## Deliberate omissions

This stage does not persist Profile claims, create Current-profile revisions, or change the CLI. Those pieces need the next persistence seam review. It also does not implement extraction from paragraphs, semantic contradiction handling, model providers, hidden reasoning, capability maps, or Recommendations.

## Checks

`profile-extractor.test.ts` covers line extraction, stable normalization and deduplication, source spans, bounded statuses/confidence, and the no-invented-prose rule.
