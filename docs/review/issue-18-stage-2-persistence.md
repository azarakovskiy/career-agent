# Issue 18 — Stage 2 profile persistence

**Status:** Ready for review

## Persistence seam

`ProfileRepository` adds two operations behind the SQLite adapter:

- `recordProfileDerivation(evidenceId, extraction)` atomically upserts stable claims, records Evidence provenance, creates a Current-profile revision, and snapshots all current claims into that revision.
- `readCurrentProfile()` reopens the latest revision with every claim and provenance link.

`SqliteWorkspaceRepository` is the public adapter in its own file. It composes separate SQLite workspace and profile persistence components; the domain/session/application layers do not use SQLite APIs.

## Stored data

Migration `002-profile-claims.sql` adds:

- stable workspace-scoped `profile_claims` keyed by SHA-256 of the Workspace ID and normalized proposition;
- `profile_claim_evidence` links containing Evidence, Interaction-turn derivation through the Evidence row, source line span, relationship, evidence basis, confidence, extractor context, and nullable source-observed/validity times;
- revision and revision-claim tables for the Current profile.

Repeated normalized propositions reuse one claim identity within a Workspace while retaining distinct Evidence provenance. Evidence now carries explicit `authoredBy` metadata; this slice writes only `user`, so agent-generated text has no path into source Evidence. Database timestamps remain database-generated.

## Checks

Temporary real SQLite tests cover restart persistence, claim identity reuse across two Evidence items, provenance, source spans, extractor context, and revision metadata.

## Deliberate omissions

Status remains derived from stored evidence basis rather than stored as a mutable field. The first slice recomputes displayed confidence as the strongest confidence across the current provenance set; later conflict/recomputation slices can replace that policy. Semantic/LLM extraction, retraction, conflict resolution, claim recomputation, and downstream Analysis/Capability/Recommendation behavior remain out of scope.
