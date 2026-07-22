import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const specDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(specDirectory, "..", "..");
const generatedEntrypoints = [
  "lib/api-client-react/src/generated/api.ts",
  "lib/api-zod/src/generated/api.ts",
];

for (const relativePath of generatedEntrypoints) {
  const target = path.resolve(workspaceRoot, relativePath);
  const source = await readFile(target, "utf8");
  await writeFile(target, `${source.trimEnd()}\n`, "utf8");
}
