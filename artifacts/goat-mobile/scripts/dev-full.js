const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

function findWorkspaceRoot(startDir) {
  let current = path.resolve(startDir);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    current = path.dirname(current);
  }
  throw new Error("Could not find workspace root (pnpm-workspace.yaml missing)");
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function getArgument(name) {
  const exactIndex = process.argv.indexOf(name);
  if (exactIndex >= 0) return process.argv[exactIndex + 1];
  const prefix = `${name}=`;
  const combined = process.argv.find((arg) => arg.startsWith(prefix));
  return combined?.slice(prefix.length);
}

function detectLanHost() {
  const candidates = Object.values(os.networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
  const privateAddress = candidates.find(
    (address) =>
      /^10\./.test(address) ||
      /^192\.168\./.test(address) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(address),
  );
  return privateAddress ?? candidates[0];
}

function spawnNode(args, options) {
  return spawn(process.execPath, args, {
    stdio: "inherit",
    detached: false,
    ...options,
  });
}

function waitForExit(child, label) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`${label} terminated by ${signal}`));
      else if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code ?? 1}`));
    });
  });
}

async function waitForApi(baseUrl, apiProcess) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (apiProcess.exitCode !== null) {
      throw new Error(`API server exited with code ${apiProcess.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/healthz`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.ok) return;
    } catch {
      // API build/server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API health check timed out: ${baseUrl}/api/healthz`);
}

async function main() {
  const workspaceRoot = findWorkspaceRoot(projectRoot);
  const apiRoot = path.join(workspaceRoot, "artifacts", "api-server");
  const goatEnvPath = path.join(workspaceRoot, "GOAT.env");
  const fileEnv = parseEnvFile(goatEnvPath);
  const rawPort = process.env.GOAT_API_PORT || process.env.PORT || fileEnv.PORT;
  const apiPort = Number.parseInt(rawPort ?? "", 10);
  if (!Number.isInteger(apiPort) || apiPort <= 0 || apiPort > 65535) {
    throw new Error("Set a valid PORT in GOAT.env (or GOAT_API_PORT in the shell).");
  }

  const isLan = process.argv.includes("--lan");
  const requestedHost = getArgument("--host");
  const lanHost = requestedHost || (isLan ? detectLanHost() : undefined);
  if (isLan && (!lanHost || net.isIP(lanHost) !== 4)) {
    throw new Error(
      "Could not detect a LAN IPv4 address. Retry with --host 192.168.x.x.",
    );
  }

  const apiHost = isLan ? lanHost : "127.0.0.1";
  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
    `http://${apiHost}:${apiPort}`;

  console.log("Building the API server...");
  const build = spawnNode([path.join(apiRoot, "build.mjs")], { cwd: apiRoot });
  await waitForExit(build, "API build");

  const childEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(apiPort),
    GOAT_ENV_FILE: goatEnvPath,
  };
  const apiProcess = spawnNode(
    ["--enable-source-maps", path.join(apiRoot, "dist", "index.mjs")],
    { cwd: apiRoot, env: childEnv },
  );

  await waitForApi(`http://127.0.0.1:${apiPort}`, apiProcess);
  console.log(`API ready: ${apiBaseUrl}`);

  const expoCliPath = require.resolve("expo/bin/cli", { paths: [projectRoot] });
  const expoArgs = [expoCliPath, "start"];
  if (!isLan) expoArgs.push("--web", "--localhost");
  else expoArgs.push("--lan");
  const expoProcess = spawnNode(expoArgs, {
    cwd: projectRoot,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      EXPO_OFFLINE: process.env.EXPO_OFFLINE || "1",
    },
  });

  if (isLan) {
    console.log(`Physical-device API URL: ${apiBaseUrl}`);
    console.log("If the detected address is wrong, add --host 192.168.x.x.");
  }

  let shuttingDown = false;
  const shutdown = (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (expoProcess.exitCode === null) expoProcess.kill();
    if (apiProcess.exitCode === null) apiProcess.kill();
    process.exitCode = code;
  };

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => shutdown(0));
  }
  apiProcess.once("exit", (code) => shutdown(code ?? 1));
  expoProcess.once("exit", (code) => shutdown(code ?? 1));
} 

main().catch((error) => {
  console.error(`Development startup failed: ${error.message}`);
  process.exitCode = 1;
});
