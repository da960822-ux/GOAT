import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const layout = read("app/_layout.tsx");
const discovery = read("app/index.tsx");
const results = read("app/results.tsx");
const detail = read("app/detail/[id].tsx");
const saved = read("app/saved.tsx");
const map = read("app/map.tsx");
const courseStore = read("src/services/courseStore.ts");
const decisionSheet = read("src/components/discovery/DecisionSheet.tsx");
const preferences = read("app/travel-preference.tsx");
const appConfig = read("app.json");
const packageJson = read("package.json");
const guide = read("app/guide.tsx");
const tabs = read("src/components/AppTabBar.tsx");
const apiPath = path.join(root, "src/services/publicDiscovery.ts");
assert(fs.existsSync(apiPath), "public discovery adapter is missing");
const api = fs.readFileSync(apiPath, "utf8");
const sceneCover = read("src/components/discovery/SceneCoverCard.tsx");
const decisionCard = read("src/components/discovery/DecisionCard.tsx");

for (const route of ["/results", "/saved", "/detail/", "/map"]) {
  assert(
    !protectedRoutes(layout).includes(route),
    `P0 route remains auth protected: ${route}`,
  );
}

assert(
  discovery.includes("getPublicSelections"),
  "discovery does not use the public selection contract",
);
assert(
  discovery.includes("requestPublicRecommendation"),
  "scene selection does not immediately request recommendations",
);
assert(
  !discovery.includes("/travel-preference"),
  "discovery still enters the preference funnel",
);
assert(
  sceneCover.includes('accessibilityHint="이 장면을 선택합니다"'),
  "scene cover selection hint is missing",
);

assert(
  api.includes("replacePublicRecommendationCard"),
  "slot replacement is not wired",
);
assert(
  api.includes("currentPlaceIds"),
  "replacement does not preserve the current three place ids",
);
assert(
  api.includes("createLatestRequest"),
  "late discovery responses are not guarded",
);
assert(results.includes("index + 1"), "Decision Deck position is missing");
assert(results.includes("세 곳 한눈에 보기"), "optional comparison is missing");
for (const axis of ["사진에서 보이는 차이", "접근·이동", "중요 제한"]) {
  assert(results.includes(axis), `comparison axis is missing: ${axis}`);
}
assert(
  results.includes("compareTriggerRef"),
  "compare focus return is missing",
);
assert(
  results.includes("오늘 조건 반영하기"),
  "today condition control is missing",
);
assert(
  results.includes("오늘 조건을 반영해도 추천 장소가 그대로예요"),
  "NO_CHANGE copy is missing",
);
assert(
  results.includes("오늘 조건은 반영하지 못했어요"),
  "UNAVAILABLE copy is missing",
);
assert(
  decisionCard.includes("여기로 갈래요"),
  "primary decision action is missing",
);
assert(
  results.includes("localSceneStore"),
  "decision flow does not use LocalSceneStore",
);
assert(
  results.includes("loadDraft") && results.includes("restoreDraft"),
  "saved recommendation draft is not restored",
);
assert(
  results.includes("getPhotoCachePolicy"),
  "photo cache policy is not applied in results",
);
assert(
  results.includes("createCourse") && results.includes("onContinueCourse"),
  "course creation is not connected to the decision flow",
);
assert(
  decisionSheet.includes("여행 이어가기") &&
    decisionSheet.includes("courseStatus"),
  "course action states are missing",
);
assert(
  courseStore.includes("recommendCourse") &&
    courseStore.includes("AsyncStorage.setItem"),
  "course generation or persistence is missing",
);
assert(
  courseStore.includes("data.stops[0]?.id !== place.place_id"),
  "selected place is not verified as the first course stop",
);
assert(
  map.includes("loadCourse") &&
    map.includes('"loading" | "content" | "empty" | "error"'),
  "course restore states are incomplete",
);
assert(
  map.includes("Linking.canOpenURL") && map.includes("linkError"),
  "map link failure recovery is missing",
);

assert(
  detail.includes("getPlacePhotos"),
  "detail gallery does not use the public photo contract",
);
assert(
  detail.includes("galleryPosition"),
  "gallery position and count are missing",
);
assert(detail.includes("galleryTriggerRef"), "gallery focus return is missing");
assert(
  detail.includes("buildPublicPlaceShare"),
  "detail sharing does not use the public place link helper",
);
assert(
  detail.includes("getPublicSelections"),
  "direct public detail cannot resolve a selection id",
);
assert(detail.includes("saveNote"), "detail save note is not connected");
assert(
  detail.includes("contentAttempt") &&
    detail.includes("장소 정보 다시 불러오기"),
  "detail retry is missing",
);
assert(
  detail.includes("heroAsset?.contentFit"),
  "detail hero ignores the asset content fit policy",
);
assert(
  detail.includes("전화하기") &&
    detail.includes("홈페이지 열기") &&
    detail.includes("지도에서 보기"),
  "detail practical link actions are missing",
);
assert(
  saved.includes("localSceneStore"),
  "saved scenes still use account bookmarks",
);
assert(
  !saved.includes("getBookmarks"),
  "saved scenes still depend on authenticated bookmarks",
);
assert(
  saved.includes("getPlacePhotos"),
  "saved scenes do not use available public photos",
);
assert(saved.includes("item.note"), "saved scene notes are not displayed");
assert(saved.includes("마지막 여행 코스 보기") && saved.includes('router.push("/map")'), "saved course re-entry is missing");

for (const source of [preferences, appConfig, packageJson]) {
  assert(
    !source.includes("expo-location"),
    "expo-location remains in the mobile P0 surface",
  );
}
assert(
  !preferences.includes("현재 위치"),
  "current-location choice remains visible",
);
assert(
  preferences.includes('importantForAccessibility="no-hide-descendants"'),
  "preference decorative images remain accessible",
);
assert(
  !preferences.includes("height: 126"),
  "preference photo option keeps a fixed text-clipping height",
);
const parsedAppConfig = JSON.parse(appConfig).expo;
assert(
  !parsedAppConfig.ios?.infoPlist?.NSLocationWhenInUseUsageDescription &&
    !(parsedAppConfig.android?.permissions ?? []).some((permission) =>
      permission.includes("LOCATION"),
    ) &&
    !(parsedAppConfig.plugins ?? []).some((plugin) =>
      Array.isArray(plugin) ? plugin[0] === "expo-location" : plugin === "expo-location",
    ),
  "location permission remains declared",
);

for (const step of [
  "장면 하나 고르기",
  "어울리는 세 곳 보기",
  "비교하고 선택하기",
  "지도·기기에 저장하기",
]) {
  assert(guide.includes(step), `current guide step is missing: ${step}`);
}

assert(
  tabs.includes('label: "발견"') && tabs.includes('label: "내 장면"'),
  "tab labels are not 발견 / 내 장면",
);
assert(
  (tabs.match(/^\s*\{ label:/gm) ?? []).length === 2,
  "P0 tab bar must contain exactly two destinations",
);

console.log("GOAT P0 discovery flow contract verified.");

function protectedRoutes(source) {
  const match = source.match(/const protectedRoute = ([\\s\\S]*?);\\n/);
  return match?.[1] ?? "";
}

function assert(value, message) {
  if (!value) throw new Error(message);
}
