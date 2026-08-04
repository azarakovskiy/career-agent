import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = fileURLToPath(
	new URL("../src/persistence/migrations/", import.meta.url),
);
const destinationDirectory = fileURLToPath(
	new URL("../dist/src/persistence/migrations/", import.meta.url),
);

await mkdir(destinationDirectory, { recursive: true });
for (const fileName of await readdir(sourceDirectory)) {
	if (fileName.endsWith(".sql")) {
		await copyFile(
			join(sourceDirectory, fileName),
			join(destinationDirectory, fileName),
		);
	}
}
