import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

interface MigrationFile {
	version: number;
	name: string;
	sql: string;
	checksum: string;
}

const migrationDirectory = fileURLToPath(
	new URL("./migrations/", import.meta.url),
);
const migrationFilePattern = /^(\d+)-([a-z0-9-]+)\.sql$/;

function loadMigrationFiles(): MigrationFile[] {
	const migrations = readdirSync(migrationDirectory)
		.flatMap((fileName) => {
			if (extname(fileName) !== ".sql") {
				return [];
			}
			const match = migrationFilePattern.exec(fileName);
			if (!match) {
				throw new Error(`Invalid migration filename: ${fileName}`);
			}

			const sql = readFileSync(
				`${migrationDirectory}/${fileName}`,
				"utf8",
			);
			return [
				{
					version: Number(match[1]),
					name: basename(fileName, ".sql"),
					sql,
					checksum: createHash("sha256")
						.update(sql, "utf8")
						.digest("hex"),
				},
			];
		})
		.sort((left, right) => left.version - right.version);

	for (const [index, migration] of migrations.entries()) {
		const expectedVersion = index + 1;
		if (migration.version !== expectedVersion) {
			throw new Error(
				`Migration versions must be contiguous; expected ${expectedVersion} but found ${migration.version}`,
			);
		}
	}

	return migrations;
}

export function applyMigrations(database: Database): void {
	const migrations = loadMigrationFiles();
	database.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL UNIQUE,
			checksum TEXT NOT NULL,
			applied_at TEXT NOT NULL
		);
	`);

	const applied = database
		.prepare(
			"SELECT version, name, checksum FROM schema_migrations ORDER BY version",
		)
		.all() as Array<{
		version: number;
		name: string;
		checksum: string;
	}>;
	const currentVersion = applied.at(-1)?.version ?? 0;
	const newestVersion = migrations.at(-1)?.version ?? 0;

	if (currentVersion > newestVersion) {
		throw new Error(
			`Database schema version ${currentVersion} is newer than this application supports (${newestVersion})`,
		);
	}

	for (const record of applied) {
		const migration = migrations[record.version - 1];
		if (
			migration === undefined ||
			migration.name !== record.name ||
			migration.checksum !== record.checksum
		) {
			throw new Error(
				`Applied migration ${record.name} does not match the migration file`,
			);
		}
	}

	for (const migration of migrations.filter(
		(candidate) => candidate.version > currentVersion,
	)) {
		database.transaction(() => {
			database.exec(migration.sql);
			database
				.prepare(
					`INSERT INTO schema_migrations
							(version, name, checksum, applied_at)
						 VALUES (?, ?, ?, ?)`,
				)
				.run(
					migration.version,
					migration.name,
					migration.checksum,
					new Date().toISOString(),
				);
		})();
	}
}
