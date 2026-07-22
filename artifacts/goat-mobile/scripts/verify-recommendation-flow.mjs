import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const catalog = read("../../lib/travel-domain/src/catalog.ts");
const moodScreen = read("app/mood-selection.tsx");
const referenceScreen = read("app/reference-selection.tsx");
const preferenceScreen = read("app/travel-preference.tsx");
const analyzingScreen = read("app/analyzing.tsx");
const noResultsScreen = read("app/no-results.tsx");
const homeScreen = read("app/index.tsx");
const context = read("src/context/AppContext.tsx");
const recommendationApi = read("src/services/recommendationApi.ts");
const resultsScreen = read("app/results.tsx");

const expectedMoods = [
  "sea-coast", "japan-alley", "alps-ranch", "forest-garden-rest",
  "retro-market-harbor", "architecture-exhibit-landmark", "resort-cafe-exotic",
];
for (const id of expectedMoods) assert(catalog.includes(`"${id}"`), `catalog missing moodId ${id}`);
assert(new Set(expectedMoods).size === 7, "mood inventory must contain 7 unique ids");

for (const pair of [
  ["나 혼자", "혼자"], ["연인과", "연인"], ["친구와", "친구"], ["가족과", "가족"],
  ["자가용", "자차"], ["대중교통", "대중교통"], ["도보 중심", "도보중심"],
  ["아침", "오전"], ["낮", "한낮"], ["해질녘", "저녁"], ["밤", "야간"],
  ["산책과 힐링", "가볍게 산책"], ["사진과 기록", "사진 위주"], ["가벼운 활동", "액티비티"], ["조용한 휴식", "조용한 휴식"],
]) assert(catalog.includes(`label: "${pair[0]}", value: "${pair[1]}"`), `missing label/value mapping ${pair.join(" -> ")}`);

assert(moodScreen.includes("setSelectedMood"), "mood selection is not stored");
assert(recommendationApi.includes('selection.method === "mood"'), "single recommendation builder lacks selection discriminator");
assert(recommendationApi.includes("initialSelection: selection"), "attempt does not persist initial selection");
assert(recommendationApi.includes("initialSelection: attempt.initialSelection"), "session does not persist initial selection");
assert((recommendationApi.match(/"Idempotency-Key": attempt\.key/g) ?? []).length >= 2, "retry does not reuse the attempt Idempotency-Key");
assert(resultsScreen.includes("recommendationSession.initialSelection"), "reroll does not reuse initial selection");
assert(homeScreen.includes("getRecentRecommendations") && homeScreen.includes("getBookmarks"), "home is not connected to recent/bookmark APIs");
assert(!homeScreen.includes("사진으로 찾기"), "user photo upload entry remains on home");
assert(homeScreen.includes("reference-selection"), "reference-based discovery entry is missing from home");
assert(referenceScreen.includes("referenceCards") && referenceScreen.includes("setSelectedReferenceCardId"), "reference selection is not connected to recommendation state");
assert(analyzingScreen.includes('method: "reference"'), "analysis does not create a reference-based recommendation attempt");

for (const file of [moodScreen, referenceScreen, preferenceScreen]) {
  assert(file.includes("accessibilityRole"), "selection screen lacks screen-reader roles");
  assert(file.includes("useSafeAreaInsets"), "selection screen lacks safe-area handling");
}
assert(homeScreen.includes("AccessibilityInfo.isReduceMotionEnabled") && analyzingScreen.includes("AccessibilityInfo.isReduceMotionEnabled"), "reduced-motion handling is incomplete");
assert(moodScreen.includes("width: 44, height: 44"), "44x44 touch targets are not enforced");

const source = ["app", "src", "components"].flatMap((dir) => walk(path.join(root, dir))).filter((file) => /\.tsx?$/.test(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const forbidden of ["@expo/vector-icons", "PhotoAnalysisAdapter", "analyzeImage", 'source === "photo"', "source === 'photo'"]) assert(!source.includes(forbidden), `forbidden source remains: ${forbidden}`);
assert(!/\p{Extended_Pictographic}/u.test(source), "Unicode emoji remains in UI source");
for (const legacyMood of ['"calm"', '"village"', '"green"', '"open"']) assert(!source.includes(legacyMood), `legacy mood remains: ${legacyMood}`);

console.log("GOAT recommendation flow contract verified: mood and reference selection, retry identity, accessibility.");

function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)); }
function assert(value, message) { if (!value) throw new Error(message); }
