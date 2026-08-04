# Issue 16 — Stage 2 Evidence submission session

**Status:** Ready for human review

## Session seam

`EvidenceSubmissionSession` exposes one operation:

- `submitEvidence(content)` — turns pasted user content into one `InteractionTurn` and one immutable `EvidenceItem`, then records both through `WorkspaceRepository`.

The session owns submission orchestration and blank-input rejection. The repository keeps required canonical UUID generation and content hashing at the persistence boundary; SQLite assigns Workspace and recording timestamps in the insert statements. The session has no SQLite dependency.

`WorkspaceRepository` retains `readSnapshot()` and `close()`. The session does not return a Workspace snapshot or own repository lifecycle; a future CLI can compose the session with the repository boundary.

## Behavior covered

- Pasted content becomes one Interaction turn and one Evidence item.
- The exact content is preserved in both the Interaction turn and Evidence snapshot.
- The Evidence item references its Interaction turn and contains the expected SHA-256 hash.
- Blank pasted content is rejected before persistence.
- Repeated identical content receives distinct Interaction turn and Evidence IDs.
- Database timestamps survive a repository restart.
- A failed Evidence insert rolls back its Interaction turn.

Session tests use a recording `WorkspaceRepository` fake; repository tests use a temporary real SQLite database.

## Deliberate omissions

- CLI wiring and restart integration remain Stage 3.
- Profile claims, Current-profile revisions, Role profiles, extraction, and analysis remain out of scope.
- Repository snapshot reads remain available only through `WorkspaceRepository` until the CLI composition is added.
