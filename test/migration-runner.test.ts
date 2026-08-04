import { strict as assert } from "node:assert";
import Database from "better-sqlite3";
import { test } from "node:test";
import { applyMigrations } from "../src/persistence/migration-runner.js";

test("migration runner records the versioned migration file", () => {
	const database = new Database(":memory:");

	try {
		applyMigrations(database);

		const migration = database
			.prepare(
				"SELECT version, name, checksum FROM schema_migrations ORDER BY version",
			)
			.all() as Array<{
				version: number;
				name: string;
				checksum: string;
			}>;
		assert.equal(migration.length, 1);
		assert.equal(migration[0]?.version, 1);
		assert.equal(migration[0]?.name, "001-initial-workspace");
		assert.match(migration[0]?.checksum ?? "", /^[0-9a-f]{64}$/);
	} finally {
		database.close();
	}
});

test("migration runner refuses a schema newer than the application", () => {
	const database = new Database(":memory:");

	try {
		applyMigrations(database);
		database
			.prepare("UPDATE schema_migrations SET version = ? WHERE version = ?")
			.run(99, 1);

		assert.throws(
			() => applyMigrations(database),
			/Database schema version 99 is newer than this application supports \(1\)/,
		);
	} finally {
		database.close();
	}
});
