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
- `recordSubmission(content)` — one atomic operation that creates the related Interaction turn and Evidence item
- `readSnapshot()`
- `close()`

`SqliteWorkspaceRepository` is the local adapter. It owns `better-sqlite3`, the migration runner, required UUID/hash generation, transaction handling, and persistence-boundary validation. SQLite assigns persisted timestamps in the insert statements. SQL statements are centralized in `workspace-queries.ts`; repository methods coordinate operations and map rows without embedding SQL. The CLI and future session layer depend on `WorkspaceRepository`, not SQLite APIs.

## Behavior covered

- A database restart preserves the Workspace, Interaction turn, and Evidence item exactly.
- Repeated content with distinct IDs remains two Evidence items.
- A failed Evidence insert is rolled back without leaving a partial Interaction turn.
- Repository tests use a temporary real SQLite database and assert returned behavior rather than SQL shape.

## Review decision

Approved as the persistence foundation. Stage 2 narrows submission construction to `recordSubmission(content)` so callers cannot supply persistence-owned IDs or timestamps. The migration-history table remains adapter-internal, so a future migration library can baseline or adapt it without affecting domain data.
