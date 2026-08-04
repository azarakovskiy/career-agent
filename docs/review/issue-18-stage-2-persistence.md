# Issue 18 — Stage 2 profile persistence

**Status:** Ready for review

## Persistence seam

`ProfileRepository` adds two operations behind the existing SQLite adapter:

- `recordProfileDerivation(evidenceId, extraction)` atomically upserts stable claims, records Evidence provenance, creates a Current-profile revision, and snapshots all current claims into that revision.
- `readCurrentProfile()` reopens the latest revision with every claim and provenance link.

`SqliteWorkspaceRepository` implements both `WorkspaceRepository` and `ProfileRepository`; the domain/session/application layers do not use SQLite APIs.

## Stored data

Migration `002-profile-claims.sql` adds:

- stable `profile_claims` keyed by SHA-256 of the normalized proposition;
- `profile_claim_evidence` links containing Evidence, Interaction-turn derivation through the Evidence row, source line span, evidence basis, confidence, and extractor context;
- revision and revision-claim tables for the Current profile.

Repeated normalized propositions reuse one claim identity while retaining distinct Evidence provenance. Database timestamps remain database-generated.

## Checks

Temporary real SQLite tests cover restart persistence, claim identity reuse across two Evidence items, provenance, source spans, extractor context, and revision metadata.

## Deliberate omissions

Status remains derived from stored evidence basis rather than stored as a mutable field. Semantic/LLM extraction, retraction, conflict resolution, claim recomputation, and downstream Analysis/Capability/Recommendation behavior remain out of scope.
