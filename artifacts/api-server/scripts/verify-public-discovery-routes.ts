import assert from "node:assert/strict";
import http from "node:http";
import {
  CreatePublicRecommendationResponse,
  GetPublicSelectionsResponse,
  ReplacePublicRecommendationCardResponse,
} from "@workspace/api-zod";
import {
  buildDiscoverySession,
  getDiscoverySelection,
  goatPlacesDataset,
} from "@workspace/travel-domain";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:5432/test";
process.env.KTO_SERVICE_KEY = "test";
process.env.KTO_PHOTO_RIGHTS_CONFIRMED = "true";
delete process.env.KMA_SERVICE_KEY;

let providerMode: "fail" | "empty" = "fail";
globalThis.fetch = (async () => {
  if (providerMode === "fail") throw new Error("provider unavailable");
  return new Response(JSON.stringify({ response: { body: { items: { item: "" } } } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

const { default: app } = await import("../src/app");
const server = app.listen(0);
await new Promise<void>((resolve) => server.once("listening", resolve));
const address = server.address();
assert(address && typeof address === "object");

function request(method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      hostname: "127.0.0.1",
      port: address.port,
      method,
      path: `/api${path}`,
      headers: payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) } : {},
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

try {
  const selectionsResponse = await request("GET", "/selections");
  assert.equal(selectionsResponse.status, 200);
  const selections = GetPublicSelectionsResponse.parse(selectionsResponse.body).data.selections;
  assert(selections.length > 0);
  assert(selections.some(({ sceneCover }) => sceneCover.kind === "PHOTO"));

  const selectionId = "japan-alley";
  const failedPhotoResponse = await request("POST", "/public/recommendations", { selectionId });
  assert.equal(failedPhotoResponse.status, 200);
  const failedPhotos = CreatePublicRecommendationResponse.parse(failedPhotoResponse.body).data;
  assert.equal(failedPhotos.cards.length, 3);
  assert(failedPhotos.cards.every(({ galleryStatus }) => galleryStatus === "ERROR"));
  assert(failedPhotos.cards.every(({ conditions }) => !conditions.some(({ factor }) => factor === "TRANSPORT")));

  providerMode = "empty";
  const baselineResponse = await request("POST", "/public/recommendations", { selectionId });
  assert.equal(baselineResponse.status, 200);
  const baseline = CreatePublicRecommendationResponse.parse(baselineResponse.body).data;
  assert.deepEqual(
    failedPhotos.cards.map(({ placeId }) => placeId),
    baseline.cards.map(({ placeId }) => placeId),
    "photo failure must not alter recommendation IDs",
  );

  const selection = getDiscoverySelection(selectionId);
  assert(selection);
  const carResponse = await request("POST", "/public/recommendations", { selectionId, transportType: "CAR" });
  assert.equal(carResponse.status, 200);
  const car = CreatePublicRecommendationResponse.parse(carResponse.body).data;
  const expectedCar = buildDiscoverySession({
    selection,
    places: goatPlacesDataset.places,
    request: { selectionId, mode: "SCENE", transportType: "CAR" },
    snapshotAt: "2026-09-13T00:00:00.000Z",
  });
  assert.deepEqual(car.cards.map(({ placeId }) => placeId), expectedCar.cards.map(({ placeId }) => placeId));

  const todayResponse = await request("POST", "/public/recommendations", { selectionId, mode: "TODAY" });
  assert.equal(todayResponse.status, 200);
  const today = CreatePublicRecommendationResponse.parse(todayResponse.body).data;
  assert.equal(today.todayStatus, "UNAVAILABLE");
  assert.deepEqual(today.appliedFactors, []);

  const replaceableIndex = baseline.cards.findIndex(({ replacementCount }) => replacementCount > 0);
  assert.notEqual(replaceableIndex, -1);
  const replacement = {
    selectionId,
    mode: baseline.mode,
    revision: baseline.revision,
    snapshotAt: baseline.snapshotAt,
    currentPlaceIds: baseline.cards.map(({ placeId }) => placeId),
    targetSlot: replaceableIndex + 1,
    seenIds: baseline.cards.map(({ placeId }) => placeId),
    replaceReason: "ANY",
  };
  const concurrent = await Promise.all([
    request("POST", "/public/recommendations/replace", replacement),
    request("POST", "/public/recommendations/replace", replacement),
  ]);
  assert.deepEqual(concurrent.map(({ status }) => status).sort(), [200, 409]);
  const replaced = ReplacePublicRecommendationCardResponse.parse(concurrent.find(({ status }) => status === 200)!.body).data;
  assert.equal(replaced.revision, baseline.revision + 1);
  const unchangedSlots = baseline.cards.filter((_, index) => index !== replaceableIndex).map(({ placeId }) => placeId);
  assert.deepEqual(replaced.cards.filter((_, index) => index !== replaceableIndex).map(({ placeId }) => placeId), unchangedSlots);
  assert.notEqual(replaced.cards[replaceableIndex]?.placeId, baseline.cards[replaceableIndex]?.placeId);

  console.log("public discovery HTTP flow verified");
} finally {
  server.close();
}
