# Issue 18 — Stage 3 Current-profile application flow

**Status:** Ready for review

## Application seam

`LocalProfileDerivationSession` receives an injected `ProfileExtractor`, passes the original Evidence to it, and sends the extraction result through `ProfileRepository`. The CLI application composes the deterministic adapter for this slice; no SQLite API or extractor implementation is visible to `src/cli.ts`.

After each pasted Evidence submission, the application derives and renders the latest Current profile. `list` and process startup render the same persisted state.

## Displayed profile data

The normal CLI view is intentionally concise. It shows:

- the pasted Evidence content;
- the number of Evidence items;
- each current claim with its derived Known/Inferred/Unknown status.

Persistence-owned IDs, hashes, timestamps, source spans, extractor context, confidence values, and revision details remain stored for application use but are not dumped into the normal terminal view. Agent-authored Evidence is rejected by the profile derivation session.

## Checks

The CLI restart test verifies concise Evidence and Current-profile content survives restart and that internal persistence/extraction details are not printed. The profile session test verifies the original Evidence crosses the injected extractor seam.

The full suite passes 19 tests.

## Deliberate omissions

The deterministic adapter is intentionally bounded and is not a semantic/LLM extractor. No provider integration, claim conflict handling, retraction, erasure, capability map, Recommendation, role comparison, or Analysis engine is included.
