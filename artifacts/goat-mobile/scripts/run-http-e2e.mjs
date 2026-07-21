import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = 43131;
const baseUrl = `http://127.0.0.1:${port}`;
const mobileDir = fileURLToPath(new URL("../", import.meta.url));
const apiDir = fileURLToPath(new URL("../../api-server/", import.meta.url));

const api = spawn(process.execPath, ["--enable-source-maps", "./dist/index.mjs"], {
  cwd: apiDir,
  env: {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    DATABASE_URL: "postgresql://verify:verify@127.0.0.1:5432/verify",
    KTO_SERVICE_KEY: "",
    OPENROUTER_API_KEY: "",
    KAKAO_REST_API_KEY: "",
    KAKAO_JAVASCRIPT_KEY: "test-key",
    ALLOW_RECOMMENDATION_DEBUG: "false",
  },
  stdio: ["ignore", "inherit", "inherit"],
});

async function waitForApi() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (api.exitCode !== null) {
      throw new Error(`API exited before the E2E test started (code ${api.exitCode})`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/healthz`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The local API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out while waiting for the local API");
}

function runFrontendFlow() {
  const flow = spawn(
    process.execPath,
    ["--import", "tsx", "./scripts/verify-http-flow.ts"],
    {
      cwd: mobileDir,
      env: { ...process.env, GOAT_API_BASE_URL: baseUrl },
      stdio: "inherit",
    },
  );

  return new Promise((resolve, reject) => {
    flow.once("error", reject);
    flow.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Frontend HTTP flow failed (${signal ?? `code ${code}`})`));
    });
  });
}

try {
  await waitForApi();
  await runFrontendFlow();
  console.log("GOAT HTTP E2E passed against a fresh local API process.");
} finally {
  if (api.exitCode === null) api.kill("SIGTERM");
}
