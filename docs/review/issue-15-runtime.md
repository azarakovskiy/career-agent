# Issue 15 — runtime and repository review

**Status:** Human-reviewed boilerplate boundary

## Approved runtime

- Node.js 22.x
- npm 10.x or newer
- TypeScript compiled to strict ESM JavaScript
- Node's built-in `node:test` runner

## Dependency list

| Dependency | Purpose |
| --- | --- |
| `better-sqlite3` | Runtime SQLite driver for the later local store |
| `typescript` | Typechecking and compilation |
| `@types/node` | Node.js TypeScript declarations |

No ORM, web UI, RAG/retrieval library, provider SDK, or test framework is part of this foundation.

## Module boundary

- `src/cli.ts` is the thin interactive process adapter. It currently owns only startup text, a prompt, and clean exit commands.
- `test/cli.test.ts` verifies the process boundary by spawning the compiled CLI.
- Evidence items, Profile claims, persistence repositories, migrations, and analysis modules are intentionally not present yet.
- The future session seam belongs between this CLI adapter and the later domain/persistence implementation; this stage does not define that domain behavior.

## Local commands

```sh
npm install       # install the locked dependency set
npm run dev       # build and start the interactive CLI
npm run build     # compile TypeScript into dist/
npm run typecheck # typecheck without emitting files
npm test          # build and run Node's built-in tests
npm run check     # typecheck and run tests
```

## CI contract

GitHub Actions runs the same checks on Node 22.x:

```sh
npm ci
npm run typecheck
npm run build
npm test
```
