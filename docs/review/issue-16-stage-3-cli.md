# Issue 16 — Stage 3 CLI composition

**Status:** Ready for human review

## CLI seam

`runCli(input, output, application)` is the thin terminal adapter. `CareerEvidenceApplication` is the application seam that composes `SqliteWorkspaceRepository` with `LocalEvidenceSubmissionSession`, owns domain rendering, and hides the database path from the CLI. The CLI depends on this seam, not on domain models or SQLite APIs.

The interactive process supports:

- `paste` or `submit` — collects free-form Evidence until a line containing only `.` and submits the exact content.
- `list` — renders the persisted Workspace and Evidence items, including Workspace and Interaction turn associations, recording time, hash, and source snapshot.
- `quit`, `q`, or `exit` — closes the repository and exits cleanly.

The application database path defaults to `career-agent.sqlite` in the current directory and can be overridden with `CAREER_AGENT_DATABASE` for another local Workspace.

On startup, the CLI renders the existing snapshot, so reopening the same database shows the preserved Workspace and Evidence source immediately.

## Behavior covered

- The compiled CLI starts and exits cleanly.
- Pasted multiline Evidence is persisted with its exact content and hash.
- A second process sees the same Workspace and Evidence item after restart.
- Blank pasted Evidence is rejected without persistence.
- Repository and session tests remain at their existing seams; the CLI integration tests use temporary real database files.

## Deliberate omissions

- File-backed Evidence, profile claims, Current-profile revisions, Role profiles, extraction, and analysis remain out of scope.
- The paste terminator is a single `.` line; richer editor support is unnecessary for this slice.
