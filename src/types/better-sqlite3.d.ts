declare module "better-sqlite3" {
	export interface RunResult {
		changes: number;
		lastInsertRowid: number | bigint;
	}

	export interface Statement {
		run(...parameters: unknown[]): RunResult;
		get(...parameters: unknown[]): unknown;
		all(...parameters: unknown[]): unknown[];
	}

	export default class Database {
		constructor(filename: string);
		pragma(source: string): unknown;
		exec(source: string): void;
		prepare(source: string): Statement;
		transaction<T>(operation: () => T): () => T;
		close(): void;
	}
}
