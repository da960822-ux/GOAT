import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  getMoods,
  getPlace,
  recommendFromTags,
  setBaseUrl,
} from "@workspace/api-client-react";

const port = 43130;
const apiBaseUrl = `http://127.0.0.1:${port}`;
const serverEntry = fileURLToPath(
  new URL("../../api-server/dist/index.mjs", import.meta.url).href,
);
const server = spawn(process.execPath, ["--enable-source-maps", serverEntry], {
  env: {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: "postgresql://verify:verify@127.0.0.1:5432/verify",
  },
  stdio: "ignore",
});

setBaseUrl(apiBaseUrl);

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/healthz`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("API server did not start");
}

async function main() {
try {
  await waitForServer();

  const moods = await getMoods();
  assert.equal(moods.data.moods.length, 7);

  const sessionId = "goat_verify_session_01";
  const first = await recommendFromTags({ moodId: "alps-ranch", sessionId });
  assert.equal(first.data.recommendations.length, 3);
  assert.equal(first.data.seedPoolSize, 61);
  assert.match(first.data.requestId, /^[A-Za-z0-9._:-]{8,128}$/);
  assert.deepEqual(
    first.data.recommendations.map(({ place: item }) => item.place_id).sort(),
    ["GOAT-004", "GOAT-016", "GOAT-017"],
  );
  assert.equal(
    new Set(first.data.recommendations.map(({ place }) => place.place_id)).size,
    3,
  );

  const place = await getPlace(first.data.recommendations[0].place.place_id);
  assert.equal(place.data.place.place_id, first.data.recommendations[0].place.place_id);

  const second = await recommendFromTags({
    moodId: "alps-ranch",
    sessionId,
    rerollOfRequestId: first.data.requestId,
    excludeIds: first.data.recommendations.map(({ place: item }) => item.place_id),
  });
  assert.equal(second.data.recommendations.length, 3);
  assert.notEqual(second.data.requestId, first.data.requestId);
  assert.ok(
    second.data.recommendations.every(
      ({ place: item }) =>
        !first.data.recommendations.some(
          ({ place: previous }) => previous.place_id === item.place_id,
        ),
    ),
  );

  console.log("Frontend API client verification passed.");
} finally {
  server.kill();
}
}

main().catch((error) => {
  server.kill();
  console.error(error);
  process.exitCode = 1;
});
