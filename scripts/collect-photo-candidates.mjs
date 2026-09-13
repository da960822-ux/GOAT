import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const workDir = path.join(root, "tmp", "photo-selection");
const dbPath = path.join(root, "문서", "goat_places_clean_db_ready.json");
const envPaths = [path.join(root, "..", "GOAT.env"), path.join(root, ".env")];
const excludedPlaceTypes = /(숙소|리조트|호텔|풀빌라|카라반)/;

const aliases = {
  "GOAT-001": ["제이드가든", "제이드가든 수목원", "이탈리안 웨딩가든"],
  "GOAT-002": ["레고랜드 코리아", "레고랜드", "하중도"],
  "GOAT-003": ["춘천 산토리니", "구봉산 산토리니", "산토리니 카페"],
  "GOAT-004": ["해피초원목장", "춘천 해피초원목장", "사북면 목장"],
  "GOAT-006": ["교토정원", "춘천 교토정원", "서부대성로 정원"],
  "GOAT-009": ["뮤지엄 SAN", "뮤지엄산", "오크밸리 뮤지엄"],
  "GOAT-010": ["소금산 그랜드밸리", "소금산 출렁다리", "간현관광지"],
  "GOAT-011": ["알파카월드", "홍천 알파카월드", "덕밭재길"],
  "GOAT-012": ["원대리 자작나무숲", "인제 자작나무숲", "속삭이는 자작나무숲"],
  "GOAT-013": ["인제성당", "천주교 인제성당", "인제 천주교회"],
  "GOAT-015": ["육백마지기", "청옥산 육백마지기", "미탄면 회동리"],
  "GOAT-016": ["대관령양떼목장", "대관령 양떼목장", "대관령마루길"],
  "GOAT-017": ["하늘목장", "대관령 하늘목장", "꽃밭양지길 하늘목장"],
  "GOAT-018": ["삼양라운드힐", "삼양목장", "대관령 삼양목장"],
  "GOAT-019": ["발왕산 천년주목숲길", "발왕산", "애니포레", "용평 발왕산"],
  "GOAT-020": ["삼탄아트마인", "삼척탄좌", "고한 삼탄아트마인"],
  "GOAT-021": ["민둥산", "정선 민둥산", "민둥산 억새"],
  "GOAT-022": ["매봉산 바람의 언덕", "태백 바람의 언덕", "매봉산 풍력발전단지"],
  "GOAT-023": ["태기산", "횡성 태기산", "태기산 설경"],
  "GOAT-024": ["안목해변 카페거리", "강릉 커피거리", "안목해변", "안목항"],
};

const normalize = (value = "") => value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
const cityStem = (city) => normalize(city).replace(/[시군]$/, "");
const itemValue = (item, key) => typeof item?.[key] === "string" ? item[key].trim() : "";

async function loadEnv() {
  for (const envPath of envPaths) {
    try {
      const text = await readFile(envPath, "utf8");
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function extractItems(payload) {
  const item = payload?.response?.body?.items?.item;
  if (!item || item === "") return [];
  return Array.isArray(item) ? item : [item];
}

function identityMatches(place, query, item) {
  const title = normalize(itemValue(item, "galTitle"));
  const location = normalize([
    itemValue(item, "galPhotographyLocation"),
    itemValue(item, "galAddr1"),
    itemValue(item, "galAddr2"),
  ].join(" "));
  const identityTerms = aliases[place.place_id].map(normalize).filter((term) => term.length >= 3);
  const queryTerm = normalize(query);
  const cityMatched = location.includes(cityStem(place.city));
  const named = identityTerms.some((term) => title.includes(term) || location.includes(term));
  const queriedPlace = queryTerm.length >= 3 && (title.includes(queryTerm) || location.includes(queryTerm));
  return cityMatched && (named || queriedPlace);
}

async function search(serviceKey, keyword) {
  const params = new URLSearchParams({
    serviceKey,
    MobileOS: "ETC",
    MobileApp: "GOAT",
    _type: "json",
    numOfRows: "30",
    pageNo: "1",
    keyword,
  });
  const response = await fetch(`https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`KTO request failed (${response.status})`);
  return extractItems(await response.json());
}

async function downloadCandidate(placeDir, candidate, index) {
  const response = await fetch(candidate.imageUrl, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 30_000) return null;
  const digest = createHash("sha256").update(bytes).digest("hex");
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const fileName = `${String(index + 1).padStart(2, "0")}-${digest.slice(0, 12)}.${extension}`;
  await writeFile(path.join(placeDir, fileName), bytes);
  return { ...candidate, fileName, bytes: bytes.length, sha256: digest };
}

await loadEnv();
const serviceKey = process.env.KTO_SERVICE_KEY?.trim();
if (!serviceKey) throw new Error("KTO_SERVICE_KEY is not configured");

const places = JSON.parse(await readFile(dbPath, "utf8"))
  .filter((place) => place.data_status === "confirmed" && !excludedPlaceTypes.test(place.place_type))
  .slice(0, 20);

await mkdir(workDir, { recursive: true });
const manifest = [];
for (const place of places) {
  const found = [];
  for (const query of aliases[place.place_id]) {
    let items = [];
    try {
      items = await search(serviceKey, query);
    } catch (error) {
      console.error(`${place.place_id} ${query}: ${error.message}`);
      continue;
    }
    for (const item of items) {
      const rawUrl = itemValue(item, "galWebImageUrl") || itemValue(item, "galThumbnailImageUrl");
      if (!rawUrl || !identityMatches(place, query, item)) continue;
      const imageUrl = rawUrl.replace(/^http:\/\/tong\.visitkorea\.or\.kr/i, "https://tong.visitkorea.or.kr");
      found.push({
        identifier: itemValue(item, "galContentId") || imageUrl,
        imageUrl,
        title: itemValue(item, "galTitle"),
        location: itemValue(item, "galPhotographyLocation") || itemValue(item, "galAddr1"),
        photographer: itemValue(item, "galPhotographer") || null,
        keywords: itemValue(item, "galSearchKeyword"),
        matchedQuery: query,
      });
    }
  }

  const unique = [...new Map(found.map((item) => [item.imageUrl, item])).values()];
  const placeDir = path.join(workDir, place.place_id);
  await mkdir(placeDir, { recursive: true });
  const candidates = [];
  const seenHashes = new Set();
  for (const candidate of unique) {
    if (candidates.length >= 6) break;
    try {
      const downloaded = await downloadCandidate(placeDir, candidate, candidates.length);
      if (!downloaded || seenHashes.has(downloaded.sha256)) continue;
      seenHashes.add(downloaded.sha256);
      candidates.push(downloaded);
    } catch {
      // Unavailable remote images are ordinary candidate misses.
    }
  }

  manifest.push({
    place_id: place.place_id,
    place_name: place.place_name,
    city: place.city,
    primary_mood: place.primary_mood,
    mood_tags: place.mood_tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    photo_point: place.photo_point,
    aliases: aliases[place.place_id],
    candidates,
  });
  console.log(`${place.place_id} ${place.place_name}: ${candidates.length} candidates`);
}

await writeFile(path.join(workDir, "candidates.json"), `${JSON.stringify(manifest, null, 2)}\n`);
