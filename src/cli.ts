import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
	createCareerEvidenceApplication,
	type CareerEvidenceApplication,
} from "./application/career-evidence-application.js";

const exitCommands = new Set(["q", "quit", "exit"]);
const pasteCommands = new Set(["paste", "submit"]);

export function runCli(
	input: NodeJS.ReadableStream = process.stdin,
	output: NodeJS.WritableStream = process.stdout,
	application: CareerEvidenceApplication = createCareerEvidenceApplication(),
): Promise<void> {
	return new Promise((resolve) => {
		const readline = createInterface({ input, output, terminal: false });
		let pastedLines: string[] | undefined;

		const prompt = (value = "> ") => output.write(value);

		output.write("Career Evidence Agent\n");
		output.write(application.listText());
		output.write('Commands: "paste", "list", or "quit".\n');
		prompt();

		readline.on("line", (line) => {
			if (pastedLines !== undefined) {
				if (line === ".") {
					const content = pastedLines.join("\n");
					pastedLines = undefined;
					output.write(application.submitText(content));
					prompt();
				} else {
					pastedLines.push(line);
					prompt("| ");
				}
				return;
			}

			const command = line.trim().toLowerCase();
			if (exitCommands.has(command)) {
				readline.close();
				return;
			}
			if (pasteCommands.has(command)) {
				pastedLines = [];
				output.write(
					"Paste Evidence; finish with a line containing only '.'.\n",
				);
				prompt("| ");
				return;
			}
			if (command === "list") {
				output.write(application.listText());
				prompt();
				return;
			}

			output.write('Unknown command. Use "paste", "list", or "quit".\n');
			prompt();
		});
		readline.on("close", () => {
			application.close();
			resolve();
		});
	});
}

const isMainModule =
	process.argv[1] !== undefined &&
	resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMainModule) {
	await runCli();
}
