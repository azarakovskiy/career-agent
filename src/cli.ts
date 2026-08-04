import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const exitCommands = new Set(["q", "quit", "exit"]);

export function runCli(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  return new Promise((resolve) => {
    const readline = createInterface({ input, output, terminal: false });

    output.write("Career Evidence Agent\n");
    output.write('Type "quit" to exit.\n> ');

    readline.on("line", (line) => {
      if (exitCommands.has(line.trim().toLowerCase())) {
        readline.close();
        return;
      }

      output.write('No commands available yet. Type "quit" to exit.\n> ');
    });
    readline.on("close", resolve);
  });
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMainModule) {
  await runCli();
}
