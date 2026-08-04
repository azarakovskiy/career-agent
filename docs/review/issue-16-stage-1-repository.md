# Issue 16 — Stage 1 repository seam

**Status:** Ready for human review

## Smallest data model

The first persisted slice contains only one implicit local `Workspace`, immutable `InteractionTurn` rows, and immutable `EvidenceItem` rows:

- `Workspace`: lowercase UUID and creation time.
- `InteractionTurn`: lowercase UUID, Workspace association, recording time, and exact user-authored content.
- `EvidenceItem`: lowercase UUID, Workspace association, Interaction turn association, recording time, exact content snapshot, and SHA-256 content hash.

A versioned SQL migration in `src/persistence/migrations/` creates these tables. The small migration runner records each file's version, name, checksum, and application time, and refuses gaps, changed applied files, or newer schemas. No Profile claims, Current-profile revisions, Role profiles, or analysis state exists yet.

## Persistence seam

`WorkspaceRepository` exposes:

- `getWorkspace()`
- `recordSubmission(turn, evidence)` — one atomic operation for the related Interaction turn and Evidence item
- `readSnapshot()`
- `close()`

`SqliteWorkspaceRepository` is the local adapter. It owns `better-sqlite3`, the migration runner, transaction handling, and persistence-boundary validation. SQL statements are centralized in `workspace-queries.ts`; repository methods coordinate operations and map rows without embedding SQL. The CLI and future session layer depend on `WorkspaceRepository`, not SQLite APIs.

## Behavior covered

- A database restart preserves the Workspace, Interaction turn, and Evidence item exactly.
- Repeated content with distinct IDs remains two Evidence items.
- A duplicate ID or invalid snapshot is rejected without leaving a partial Interaction turn.
- Repository tests use a temporary real SQLite database and assert returned behavior rather than SQL shape.

## Review decision

Pending human review. If accepted, Stage 2 can add the session/domain orchestration over this repository seam without changing the storage contract. The migration-history table remains adapter-internal, so a future migration library can baseline or adapt it without affecting domain data.
