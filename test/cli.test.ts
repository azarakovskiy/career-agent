import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));

type CliResult = {
	code: number | null;
	stdout: string;
	stderr: string;
};

async function runCliProcess(
	input: string,
	databasePath: string,
): Promise<CliResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath], {
			env: { ...process.env, CAREER_AGENT_DATABASE: databasePath },
			stdio: ["pipe", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk: string) => {
			stderr += chunk;
		});
		child.once("error", reject);
		child.once("close", (code) => resolve({ code, stdout, stderr }));
		child.stdin.end(input);
	});
}

test("CLI starts and exits cleanly on quit", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-cli-"));

	try {
		const result = await runCliProcess(
			"quit\n",
			join(directory, "workspace.sqlite"),
		);

		assert.equal(result.code, 0);
		assert.equal(result.stderr, "");
		assert.match(result.stdout, /Career Evidence Agent/);
		assert.match(result.stdout, /Evidence items: 0/);
		assert.match(result.stdout, /Current profile: 0 claims/);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("CLI persists pasted Evidence across process restart", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-cli-"));
	const databasePath = join(directory, "workspace.sqlite");
	const content =
		"Designed and shipped a durable API.\nImproved its reliability.";
	try {
		const firstRun = await runCliProcess(
			`paste\n${content}\n.\nlist\nquit\n`,
			databasePath,
		);
		assert.equal(firstRun.code, 0);
		assert.equal(firstRun.stderr, "");
		assert.match(firstRun.stdout, /Evidence saved\./);
		assert.match(firstRun.stdout, /Evidence items: 1/);
		assert.match(firstRun.stdout, /Current profile: 2 claims/);
		assert.match(
			firstRun.stdout,
			/\[Known\] Designed and shipped a durable API\./,
		);
		assert.match(firstRun.stdout, /\[Unknown\] Improved its reliability\./);
		assert.ok(firstRun.stdout.includes(content));
		assert.doesNotMatch(
			firstRun.stdout,
			/SHA-256|Extractor context|Interaction turn:/,
		);

		const reopenedRun = await runCliProcess("quit\n", databasePath);

		assert.equal(reopenedRun.code, 0);
		assert.equal(reopenedRun.stderr, "");
		assert.match(reopenedRun.stdout, /Evidence items: 1/);
		assert.match(reopenedRun.stdout, /Current profile: 2 claims/);
		assert.match(
			reopenedRun.stdout,
			/\[Known\] Designed and shipped a durable API\./,
		);
		assert.match(
			reopenedRun.stdout,
			/\[Unknown\] Improved its reliability\./,
		);
		assert.ok(reopenedRun.stdout.includes(content));
		assert.doesNotMatch(
			reopenedRun.stdout,
			/SHA-256|Extractor context|Interaction turn:/,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("CLI rejects blank pasted Evidence without persisting it", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-cli-"));

	try {
		const result = await runCliProcess(
			"paste\n \n.\nlist\nquit\n",
			join(directory, "workspace.sqlite"),
		);

		assert.equal(result.code, 0);
		assert.equal(result.stderr, "");
		assert.match(result.stdout, /Evidence content must not be blank/);
		assert.match(result.stdout, /Evidence items: 0/);
		assert.match(result.stdout, /Current profile: 0 claims/);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
