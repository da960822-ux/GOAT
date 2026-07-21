import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const temporaryDirectory = await mkdtemp(join(tmpdir(), "goat-external-tests-"));
const outputFile = join(temporaryDirectory, "external-services.test.mjs");

function runTests() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", outputFile], {
      stdio: "inherit",
      env: {
        ...process.env,
        KTO_SERVICE_KEY: "test-service-key",
        VISITKOREA_SERVICE_KEY: "",
        OPENROUTER_API_KEY: "test-openrouter-key",
        OPENROUTER_RETRY_DELAY_MS: "0",
        KAKAO_JAVASCRIPT_KEY: "",
        KAKAO_MAP_KEY: "",
        KAKAO_REST_API_KEY: "test-server-only-key",
      },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`External service tests terminated by ${signal}`));
      else resolve(code ?? 1);
    });
  });
}

try {
  await build({
    entryPoints: [fileURLToPath(new URL("./external-services.test.ts", import.meta.url))],
    outfile: outputFile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    logLevel: "silent",
  });
  const code = await runTests();
  process.exitCode = code;
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
