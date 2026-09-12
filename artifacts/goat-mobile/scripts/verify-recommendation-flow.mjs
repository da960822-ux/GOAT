import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const layout = read("app/_layout.tsx");
const discovery = read("app/index.tsx");
const results = read("app/results.tsx");
const detail = read("app/detail/[id].tsx");
const saved = read("app/saved.tsx");
const guide = read("app/guide.tsx");
const tabs = read("src/components/AppTabBar.tsx");
const apiPath = path.join(root, "src/services/publicDiscovery.ts");
assert(fs.existsSync(apiPath), "public discovery adapter is missing");
const api = fs.readFileSync(apiPath, "utf8");
const sceneCover = read("src/components/discovery/SceneCoverCard.tsx");
const decisionCard = read("src/components/discovery/DecisionCard.tsx");

for (const route of ["/results", "/saved", "/detail/"]) {
  assert(!protectedRoutes(layout).includes(route), `P0 route remains auth protected: ${route}`);
}

assert(discovery.includes("getPublicSelections"), "discovery does not use the public selection contract");
assert(discovery.includes("requestPublicRecommendation"), "scene selection does not immediately request recommendations");
assert(!discovery.includes("/travel-preference"), "discovery still enters the preference funnel");
assert(sceneCover.includes("장면 예시"), "scene cover disclosure is missing");

assert(api.includes("replacePublicRecommendationCard"), "slot replacement is not wired");
assert(api.includes("currentPlaceIds"), "replacement does not preserve the current three place ids");
assert(api.includes("createLatestRequest"), "late discovery responses are not guarded");
assert(results.includes("index + 1"), "Decision Deck position is missing");
assert(results.includes("세 곳 한눈에 보기"), "optional comparison is missing");
for (const axis of ["사진에서 보이는 차이", "접근·이동", "중요 제한"]) {
  assert(results.includes(axis), `comparison axis is missing: ${axis}`);
}
assert(results.includes("compareTriggerRef"), "compare focus return is missing");
assert(results.includes("오늘 조건 반영하기"), "today condition control is missing");
assert(results.includes("현재 후보가 그대로 적합해요"), "NO_CHANGE copy is missing");
assert(results.includes("오늘 조건은 반영하지 못했어요"), "UNAVAILABLE copy is missing");
assert(decisionCard.includes("여기로 갈래요"), "primary decision action is missing");
assert(results.includes("localSceneStore"), "decision flow does not use LocalSceneStore");
assert(!results.includes("recommendCourse"), "P1 course creation remains in the P0 result flow");

assert(detail.includes("getPlacePhotos"), "detail gallery does not use the public photo contract");
assert(detail.includes("galleryPosition"), "gallery position and count are missing");
assert(detail.includes("galleryTriggerRef"), "gallery focus return is missing");
assert(detail.includes("buildPublicPlaceShare"), "detail sharing does not use the public place link helper");
assert(saved.includes("localSceneStore"), "saved scenes still use account bookmarks");
assert(!saved.includes("getBookmarks"), "saved scenes still depend on authenticated bookmarks");
assert(saved.includes("getPlacePhotos"), "saved scenes do not use available public photos");

for (const step of ["장면 하나 고르기", "어울리는 세 곳 보기", "비교하고 한 곳 선택하기", "지도에서 보고 기기에 저장하기"]) {
  assert(guide.includes(step), `current guide step is missing: ${step}`);
}

assert(tabs.includes('label: "발견"') && tabs.includes('label: "내 장면"'), "tab labels are not 발견 / 내 장면");
assert((tabs.match(/^\s*\{ label:/gm) ?? []).length === 2, "P0 tab bar must contain exactly two destinations");

console.log("GOAT P0 discovery flow contract verified.");

function protectedRoutes(source) {
  const match = source.match(/const protectedRoute = ([\\s\\S]*?);\\n/);
  return match?.[1] ?? "";
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
