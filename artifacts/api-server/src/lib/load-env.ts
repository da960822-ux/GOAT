import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ENV_FILE_NAME = "GOAT.env";

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();
  if (!key) return null;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function candidateEnvPaths(): string[] {
  const explicitPath = process.env.GOAT_ENV_FILE?.trim();
  const paths = explicitPath
    ? [isAbsolute(explicitPath) ? explicitPath : resolve(process.cwd(), explicitPath)]
    : [];

  const starts = [
    process.cwd(),
    dirname(fileURLToPath(import.meta.url)),
  ];

  for (const start of starts) {
    let current = resolve(start);
    while (true) {
      paths.push(join(current, ENV_FILE_NAME));
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  return Array.from(new Set(paths));
}

export function loadGoatEnv(): string | null {
  const envPath = candidateEnvPaths().find((path) => existsSync(path));
  if (!envPath) return null;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry) continue;
    process.env[entry.key] ??= entry.value;
  }

  return envPath;
}

export const loadedGoatEnvPath = loadGoatEnv();
