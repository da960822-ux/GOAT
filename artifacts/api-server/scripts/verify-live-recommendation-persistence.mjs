import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const port = 43130;
const baseUrl = `http://127.0.0.1:${port}/api`;
const sessionToken = crypto.randomBytes(32).toString("base64url");
const sessionTokenHash = crypto
  .createHash("sha256")
  .update(sessionToken)
  .digest("hex");
const idempotencyKey = crypto.randomUUID();
const testSubject = `live-test-${crypto.randomUUID()}`;

process.env.DATABASE_URL = databaseUrl;
const requireFromDbPackage = createRequire(
  new URL("../../../lib/db/package.json", import.meta.url),
);
const { Pool } = requireFromDbPackage("pg");
const pool = new Pool({ connectionString: databaseUrl });

let userId;
let serverOutput = "";
const server = spawn(
  process.execPath,
  ["--enable-source-maps", "./dist/index.mjs"],
  {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: "development",
      PORT: String(port),
      KTO_SERVICE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

for (const stream of [server.stdout, server.stderr]) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    serverOutput = `${serverOutput}${chunk}`.slice(-12_000);
  });
}

async function request(path, init = {}, authenticated = false) {
  const headers = new Headers(init.headers);
  if (authenticated) headers.set("cookie", `goat.sid=${sessionToken}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = await response.json();
  return { response, body };
}

async function jsonRequest(path, method, body, authenticated = true, headers) {
  return request(
    path,
    {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    authenticated,
  );
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const { response } = await request("/healthz");
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API server did not start.\n${serverOutput}`);
}

try {
  const user = await pool.query(
    `insert into public.users (email, display_name, last_login_at)
     values ($1, $2, now())
     returning id`,
    [`${testSubject}@example.test`, "Live persistence test"],
  );
  userId = user.rows[0].id;
  await pool.query(
    `insert into public.user_identities
       (user_id, provider, provider_subject, provider_email, provider_display_name)
     values ($1, 'google', $2, $3, $4)`,
    [
      userId,
      testSubject,
      `${testSubject}@example.test`,
      "Live persistence test",
    ],
  );
  await pool.query(
    `insert into public.sessions (user_id, token_hash, expires_at)
     values ($1, $2, now() + interval '1 hour')`,
    [userId, sessionTokenHash],
  );

  await waitForServer();

  const anonymousRecent = await request("/recommendations/recent");
  assert.equal(anonymousRecent.response.status, 401);
  assert.equal(anonymousRecent.body.code, "UNAUTHORIZED");

  const authMe = await request("/auth/me", {}, true);
  assert.equal(authMe.response.status, 200);
  assert.equal(authMe.body.data.user.id, userId);

  const missingKey = await jsonRequest(
    "/recommendations",
    "POST",
    { moodId: "alps-ranch" },
    true,
  );
  assert.equal(missingKey.response.status, 400);
  assert.equal(missingKey.body.code, "INVALID_IDEMPOTENCY_KEY");

  const requestBody = {
    moodId: "alps-ranch",
    currentMonth: 7,
    transportType: "대중교통",
    origin: {
      type: "current",
      latitude: 37.5665,
      longitude: 126.978,
    },
  };
  const created = await jsonRequest(
    "/recommendations",
    "POST",
    requestBody,
    true,
    { "Idempotency-Key": idempotencyKey },
  );
  assert.equal(created.response.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.code, "RECOMMENDATION_CREATED");
  assert.match(created.body.data.recommendationId, /^[0-9a-f-]{36}$/i);
  assert.equal(created.body.data.cards.length, 3);
  assert.equal(created.body.data.policyVersion, "goat-score-v2");
  assert.equal(created.body.data.originStatus, "APPLIED");
  assert.deepEqual(
    created.body.data.cards.map(({ role }) => role),
    ["BEST_SCENE", "SAME_MOOD_ALTERNATIVE", "CONDITION_FIT_ALTERNATIVE"],
  );
  for (const card of created.body.data.cards) {
    assert.equal(typeof card.score, "number");
    assert.equal(typeof card.scoreSummary?.displayScore, "number");
    assert.equal(typeof card.scoreSummary?.originDistanceBonus, "number");
    assert.equal(typeof card.scoreSummary?.selectionScore, "number");
    assert.equal(typeof card.scoreDetails?.theme?.score, "number");
    assert.ok(Array.isArray(card.reasons));
    assert.ok(Array.isArray(card.cautions));
    assert.ok(!("decisionAudit" in card));
  }

  const recommendationId = created.body.data.recommendationId;
  const firstPlaceId = created.body.data.cards[0].placeId;

  const replayed = await jsonRequest(
    "/recommendations",
    "POST",
    requestBody,
    true,
    { "Idempotency-Key": idempotencyKey },
  );
  assert.equal(replayed.response.status, 200);
  assert.equal(replayed.response.headers.get("idempotency-replayed"), "true");
  assert.equal(replayed.body.code, "RECOMMENDATION_REPLAYED");
  assert.equal(replayed.body.data.recommendationId, recommendationId);

  const mismatchedReplay = await jsonRequest(
    "/recommendations",
    "POST",
    { moodId: "sea-coast", currentMonth: 7 },
    true,
    { "Idempotency-Key": idempotencyKey },
  );
  assert.equal(mismatchedReplay.response.status, 409);
  assert.equal(mismatchedReplay.body.code, "IDEMPOTENCY_KEY_REUSED");

  const recent = await request("/recommendations/recent?limit=1", {}, true);
  assert.equal(recent.response.status, 200);
  assert.equal(recent.body.data.items.length, 1);
  assert.equal(recent.body.data.items[0].recommendationId, recommendationId);

  const detail = await request(
    `/recommendations/${recommendationId}`,
    {},
    true,
  );
  assert.equal(detail.response.status, 200);
  assert.deepEqual(detail.body.data.cards, created.body.data.cards);

  const savedRows = await pool.query(
    `select
       (select count(*)::int from public.recommendation_requests
        where user_id = $1 and idempotency_key = $2) as request_count,
       (select count(*)::int from public.recommendation_sessions
        where id = $3 and user_id = $1) as session_count,
       (select count(*)::int from public.recommendation_session_places
        where recommendation_id = $3) as place_count,
       (select policy_version from public.recommendation_sessions
        where id = $3) as policy_version,
       (select decision_audit ->> 'schemaVersion'
        from public.recommendation_sessions where id = $3) as audit_schema_version,
       (select bool_and(display_score is not null and selection_score is not null)
        from public.recommendation_session_places
        where recommendation_id = $3) as scores_complete,
       (select bool_and(origin_distance_bonus is not null and route_info is not null)
        from public.recommendation_session_places
        where recommendation_id = $3) as route_fields_complete`,
    [userId, idempotencyKey, recommendationId],
  );
  assert.deepEqual(savedRows.rows[0], {
    request_count: 1,
    session_count: 1,
    place_count: 3,
    policy_version: "goat-score-v2",
    audit_schema_version: "2",
    scores_complete: true,
    route_fields_complete: true,
  });

  const rerolled = await jsonRequest(
    "/recommendations",
    "POST",
    {
      ...requestBody,
      rerollOfRecommendationId: recommendationId,
    },
    true,
    { "Idempotency-Key": crypto.randomUUID() },
  );
  assert.equal(rerolled.response.status, 201, JSON.stringify(rerolled.body));
  const previousIds = new Set(created.body.data.cards.map(({ placeId }) => placeId));
  assert.ok(rerolled.body.data.cards.every(({ placeId }) => !previousIds.has(placeId)));

  const bookmarkSaved = await jsonRequest("/bookmarks", "POST", {
    placeId: firstPlaceId,
  });
  assert.equal(bookmarkSaved.response.status, 200);
  assert.equal(bookmarkSaved.body.data.bookmarked, true);
  const bookmarkStatus = await request(
    `/bookmarks/${firstPlaceId}/status`,
    {},
    true,
  );
  assert.equal(bookmarkStatus.body.data.bookmarked, true);
  const bookmarkList = await request("/bookmarks", {}, true);
  assert.equal(bookmarkList.body.data.items.length, 1);

  const feedbackPath = `/recommendations/${recommendationId}/places/${firstPlaceId}/feedback`;
  const feedbackSaved = await jsonRequest(feedbackPath, "PUT", {
    type: "DISLIKE",
    reasonCode: "OTHER",
    reasonText: "통합 테스트",
  });
  assert.equal(feedbackSaved.response.status, 200);
  assert.equal(feedbackSaved.body.data.feedback.type, "DISLIKE");
  const feedbackLoaded = await request(feedbackPath, {}, true);
  assert.equal(feedbackLoaded.body.data.feedback.reasonText, "통합 테스트");
  const feedbackCleared = await jsonRequest(
    feedbackPath,
    "DELETE",
    undefined,
  );
  assert.equal(feedbackCleared.body.data.feedback, null);

  const bookmarkRemoved = await jsonRequest(
    `/bookmarks/${firstPlaceId}`,
    "DELETE",
    undefined,
  );
  assert.equal(bookmarkRemoved.body.data.bookmarked, false);

  console.log(
    "Live persistence verification passed: auth, recommendation, idempotency, audit scores, recent/detail, bookmarks, feedback.",
  );
} catch (error) {
  if (serverOutput) console.error(serverOutput);
  throw error;
} finally {
  if (userId) {
    await pool.query("delete from public.users where id = $1", [userId]);
  }
  await pool.end();
  server.kill();
}
