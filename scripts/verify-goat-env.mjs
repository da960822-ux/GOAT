import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "GOAT.env");
const expectedKeys = [
  "NODE_ENV", "PORT", "AUTH_BASE_URL", "AUTH_SUCCESS_REDIRECT_URL",
  "AUTH_FAILURE_REDIRECT_URL", "CORS_ORIGINS", "DATABASE_URL",
  "GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET",
  "KAKAO_REST_API_KEY", "KAKAO_OAUTH_CLIENT_SECRET", "KAKAO_JAVASCRIPT_KEY",
  "TRUST_PROXY", "RECOMMEND_RATE_LIMIT_WINDOW_SECONDS",
  "RECOMMEND_RATE_LIMIT_MAX", "KTO_SERVICE_KEY", "OPENROUTER_API_KEY",
];
const optionalEmptyKeys = new Set(["TRUST_PROXY"]);

function parseEnv(text) {
  const values = new Map();
  const issues = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      issues.push(`line ${index + 1}: INVALID_FORMAT`);
      continue;
    }
    const [, key, rawValue] = match;
    if (values.has(key)) issues.push(`line ${index + 1}: DUPLICATE_KEY(${key})`);
    if (rawValue !== rawValue.trim()) issues.push(`line ${index + 1}: SURROUNDING_WHITESPACE(${key})`);
    let value = rawValue.trim();
    const startsQuoted = value.startsWith('"') || value.startsWith("'");
    const endsQuoted = value.endsWith('"') || value.endsWith("'");
    if (startsQuoted !== endsQuoted || (startsQuoted && value[0] !== value.at(-1))) {
      issues.push(`line ${index + 1}: INVALID_QUOTES(${key})`);
    } else if (startsQuoted && endsQuoted) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return { values, issues };
}

function assertUrl(values, key, protocols) {
  const value = values.get(key);
  if (!value) return `${key}: MISSING`;
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol) ? `${key}: VALID` : `${key}: INVALID_PROTOCOL`;
  } catch {
    return `${key}: INVALID_URL`;
  }
}

function classifyHttp(status) {
  if (status === 401) return "AUTHENTICATION_FAILED";
  if (status === 403) return "PERMISSION_DENIED";
  if (status === 402 || status === 429) return "QUOTA_OR_RATE_LIMIT";
  if (status >= 400 && status < 500) return "REQUEST_FORMAT_ERROR";
  if (status >= 500) return "EXTERNAL_SERVICE_ERROR";
  return "UNKNOWN_ERROR";
}

async function request(name, url, init, validate) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return { name, status: "FAILED", reason: classifyHttp(response.status), http: response.status };
    const body = await response.json();
    if (!validate(body)) return { name, status: "FAILED", reason: "INVALID_EXTERNAL_RESPONSE", http: response.status };
    return { name, status: "PASSED", http: response.status };
  } catch (error) {
    return { name, status: "FAILED", reason: "NETWORK_ERROR", detail: error instanceof Error ? error.name : "UNKNOWN" };
  }
}

const bytes = await readFile(envPath);
let text;
try {
  text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  console.log("ENCODING_UTF8: VALID");
} catch {
  console.log("ENCODING_UTF8: INVALID");
  process.exitCode = 1;
  throw new Error("GOAT.env is not valid UTF-8");
}

const { values, issues } = parseEnv(text);
console.log(`ENV_FILE: ${envPath}`);
for (const key of expectedKeys) {
  const status = values.get(key)
    ? "LOADED"
    : optionalEmptyKeys.has(key) && values.has(key)
      ? "OPTIONAL_EMPTY"
      : "MISSING";
  console.log(`${key}: ${status}`);
}
console.log(`ENV_FORMAT: ${issues.length === 0 ? "VALID" : "INVALID"}`);
for (const issue of issues) console.log(`ENV_ISSUE: ${issue}`);

console.log(assertUrl(values, "AUTH_BASE_URL", ["http:", "https:"]));
console.log(assertUrl(values, "AUTH_SUCCESS_REDIRECT_URL", ["http:", "https:"]));
console.log(assertUrl(values, "AUTH_FAILURE_REDIRECT_URL", ["http:", "https:"]));
console.log(assertUrl(values, "DATABASE_URL", ["postgres:", "postgresql:"]));
for (const origin of (values.get("CORS_ORIGINS") ?? "").split(",").filter(Boolean)) {
  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("protocol");
    console.log("CORS_ORIGIN: VALID");
  } catch {
    console.log("CORS_ORIGIN: INVALID");
    process.exitCode = 1;
  }
}
const port = Number(values.get("PORT"));
console.log(`PORT: ${Number.isInteger(port) && port > 0 && port <= 65535 ? "VALID" : "INVALID"}`);
for (const key of ["RECOMMEND_RATE_LIMIT_WINDOW_SECONDS", "RECOMMEND_RATE_LIMIT_MAX"]) {
  const number = Number(values.get(key));
  console.log(`${key}_NUMBER: ${Number.isInteger(number) && number > 0 ? "VALID" : "INVALID"}`);
}

for (const [key, value] of values) process.env[key] ??= value;

if (process.argv.includes("--network")) {
  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  kakaoUrl.searchParams.set("query", "강원특별자치도 춘천시 하중도길 128");

  const ktoUrl = new URL("https://apis.data.go.kr/B551011/KorService2/areaCode2");
  ktoUrl.searchParams.set("serviceKey", values.get("KTO_SERVICE_KEY") ?? "");
  ktoUrl.searchParams.set("MobileOS", "ETC");
  ktoUrl.searchParams.set("MobileApp", "GOAT");
  ktoUrl.searchParams.set("_type", "json");
  ktoUrl.searchParams.set("numOfRows", "1");
  ktoUrl.searchParams.set("pageNo", "1");

  const results = await Promise.all([
    request("KAKAO_LOCAL", kakaoUrl, {
      headers: { Authorization: `KakaoAK ${values.get("KAKAO_REST_API_KEY") ?? ""}` },
    }, (body) => Array.isArray(body?.documents) && Number.isFinite(Number(body.documents[0]?.x)) && Number.isFinite(Number(body.documents[0]?.y))),
    request("KTO_TOUR_API", ktoUrl, {}, (body) => body?.response?.header?.resultCode === "0000"),
    request("OPENROUTER", "https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${values.get("OPENROUTER_API_KEY") ?? ""}` },
    }, (body) => Array.isArray(body?.data) && body.data.length > 0),
  ]);

  for (const result of results) {
    console.log(`${result.name}: ${result.status}${result.reason ? ` (${result.reason}${result.http ? ` HTTP_${result.http}` : ""})` : ""}`);
    if (result.status !== "PASSED") process.exitCode = 1;
  }
  console.log(`KAKAO_ADDRESS_TO_COORDINATES: ${results[0].status === "PASSED" ? "PASSED" : "FAILED"}`);
}

if (issues.length > 0 || expectedKeys.some((key) => !optionalEmptyKeys.has(key) && !values.get(key))) process.exitCode = 1;
