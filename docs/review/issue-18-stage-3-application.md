# Issue 18 — Stage 3 Current-profile application flow

**Status:** Ready for review

## Application seam

`LocalProfileDerivationSession` receives an injected `ProfileExtractor`, passes the original Evidence to it, and sends the extraction result through `ProfileRepository`. The CLI application composes the deterministic adapter for this slice; no SQLite API or extractor implementation is visible to `src/cli.ts`.

After each pasted Evidence submission, the application derives and renders the latest Current profile. `list` and process startup render the same persisted state.

## Displayed profile data

Each claim shows:

- normalized proposition and source proposition;
- derived Known/Inferred/Unknown status and confidence;
- supporting Evidence and Interaction-turn IDs;
- source line span, evidence basis, extractor context;
- Current-profile revision, cause Evidence, and creation time.

The view exposes provenance and uncertainty without exposing hidden model reasoning.

## Checks

The CLI restart test verifies profile claim count, status, normalized content, Evidence/Interaction provenance, extractor context, and revision persistence. The profile session test verifies the original Evidence crosses the injected extractor seam.

The full suite passes 18 tests.

## Deliberate omissions

The deterministic adapter is intentionally bounded and is not a semantic/LLM extractor. No provider integration, claim conflict handling, retraction, erasure, capability map, Recommendation, role comparison, or Analysis engine is included.
