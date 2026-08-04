import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
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
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("CLI persists pasted Evidence across process restart", async () => {
	const directory = await mkdtemp(join(tmpdir(), "career-agent-cli-"));
	const databasePath = join(directory, "workspace.sqlite");
	const content =
		"Designed and shipped a durable API.\nImproved its reliability.";
	const contentHash = createHash("sha256")
		.update(content, "utf8")
		.digest("hex");

	try {
		const firstRun = await runCliProcess(
			`paste\n${content}\n.\nlist\nquit\n`,
			databasePath,
		);
		const workspaceId = firstRun.stdout.match(
			/^Workspace: ([0-9a-f-]{36})$/m,
		)?.[1];
		const evidenceId = firstRun.stdout.match(
			/^Evidence: ([0-9a-f-]{36})$/m,
		)?.[1];
		const interactionTurnId = firstRun.stdout.match(
			/^Interaction turn: ([0-9a-f-]{36})$/m,
		)?.[1];

		assert.equal(firstRun.code, 0);
		assert.equal(firstRun.stderr, "");
		assert.ok(workspaceId);
		assert.ok(evidenceId);
		assert.ok(interactionTurnId);
		assert.match(firstRun.stdout, /Saved Evidence item:/);
		assert.match(firstRun.stdout, /Interaction turns: 1/);
		assert.match(firstRun.stdout, /Evidence items: 1/);
		assert.match(firstRun.stdout, /User content:/);
		assert.match(firstRun.stdout, new RegExp(contentHash));
		assert.ok(firstRun.stdout.includes(content));

		const reopenedRun = await runCliProcess("quit\n", databasePath);

		assert.equal(reopenedRun.code, 0);
		assert.equal(reopenedRun.stderr, "");
		assert.match(
			reopenedRun.stdout,
			new RegExp(`Workspace: ${workspaceId}`),
		);
		assert.match(
			reopenedRun.stdout,
			new RegExp(`Interaction turn: ${interactionTurnId}`),
		);
		assert.match(reopenedRun.stdout, new RegExp(`Evidence: ${evidenceId}`));
		assert.match(reopenedRun.stdout, /Interaction turns: 1/);
		assert.match(reopenedRun.stdout, /Evidence items: 1/);
		assert.match(reopenedRun.stdout, new RegExp(contentHash));
		assert.ok(reopenedRun.stdout.includes(content));
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
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
