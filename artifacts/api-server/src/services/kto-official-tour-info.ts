const KTO_BASE = "https://apis.data.go.kr/B551011/KorService2";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type KtoEntity = { contentId: string; contentTypeId: string; canonicalName: string };

const entities: Record<string, KtoEntity> = {
  "GOAT-001": { contentId: "1607565", contentTypeId: "12", canonicalName: "제이드가든" },
  "GOAT-002": { contentId: "2815362", contentTypeId: "12", canonicalName: "레고랜드 코리아 리조트" },
  "GOAT-004": { contentId: "2590796", contentTypeId: "12", canonicalName: "해피초원목장" },
  "GOAT-005": { contentId: "2726691", contentTypeId: "28", canonicalName: "아웃오브파크" },
  "GOAT-009": { contentId: "2633832", contentTypeId: "14", canonicalName: "뮤지엄산" },
  "GOAT-010": { contentId: "2800692", contentTypeId: "12", canonicalName: "소금산그랜드밸리" },
  "GOAT-011": { contentId: "2495006", contentTypeId: "12", canonicalName: "알파카월드" },
  "GOAT-012": { contentId: "1818945", contentTypeId: "12", canonicalName: "원대리 자작나무 숲 (속삭이는 자작나무 숲)" },
  "GOAT-013": { contentId: "3072017", contentTypeId: "12", canonicalName: "인제성당" },
  "GOAT-014": { contentId: "2774550", contentTypeId: "28", canonicalName: "알펜시아리조트 눈썰매장" },
  "GOAT-016": { contentId: "129263", contentTypeId: "12", canonicalName: "대관령양떼목장" },
  "GOAT-017": { contentId: "1949976", contentTypeId: "12", canonicalName: "대관령 하늘목장" },
  "GOAT-018": { contentId: "2640123", contentTypeId: "12", canonicalName: "삼양라운드힐" },
  "GOAT-019": { contentId: "3302532", contentTypeId: "28", canonicalName: "발왕산 천년주목숲길" },
  "GOAT-020": { contentId: "2470392", contentTypeId: "12", canonicalName: "삼탄아트마인" },
  "GOAT-021": { contentId: "125616", contentTypeId: "12", canonicalName: "민둥산" },
  "GOAT-022": { contentId: "2610091", contentTypeId: "12", canonicalName: "매봉산 바람의 언덕" },
  "GOAT-023": { contentId: "125611", contentTypeId: "12", canonicalName: "태기산" },
  "GOAT-024": { contentId: "127722", contentTypeId: "12", canonicalName: "안목해변" },
  "GOAT-025": { contentId: "127951", contentTypeId: "12", canonicalName: "하슬라아트월드" },
  "GOAT-027": { contentId: "3542992", contentTypeId: "12", canonicalName: "BTS 버스정류장" },
  "GOAT-028": { contentId: "2605193", contentTypeId: "12", canonicalName: "정동진역" },
  "GOAT-029": { contentId: "2714439", contentTypeId: "12", canonicalName: "안반데기" },
  "GOAT-030": { contentId: "585605", contentTypeId: "12", canonicalName: "금진해변" },
  "GOAT-034": { contentId: "2820546", contentTypeId: "12", canonicalName: "무릉별유천지" },
  "GOAT-035": { contentId: "2714696", contentTypeId: "12", canonicalName: "어달항" },
  "GOAT-036": { contentId: "129588", contentTypeId: "12", canonicalName: "묵호항" },
  "GOAT-037": { contentId: "129176", contentTypeId: "12", canonicalName: "묵호등대" },
  "GOAT-038": { contentId: "2549932", contentTypeId: "12", canonicalName: "속초 외옹치 바다향기로" },
  "GOAT-040": { contentId: "2501905", contentTypeId: "12", canonicalName: "서피비치" },
  "GOAT-041": { contentId: "3041749", contentTypeId: "12", canonicalName: "양리단길" },
  "GOAT-043": { contentId: "2807083", contentTypeId: "12", canonicalName: "에이프레임" },
  "GOAT-044": { contentId: "125684", contentTypeId: "12", canonicalName: "아야진해변" },
  "GOAT-047": { contentId: "2570207", contentTypeId: "12", canonicalName: "능파대 (강원평화지역 국가지질공원)" },
  "GOAT-049": { contentId: "2662796", contentTypeId: "12", canonicalName: "쏠비치 삼척" },
  "GOAT-051": { contentId: "125711", contentTypeId: "12", canonicalName: "장호해변·장호항" },
  "GOAT-052": { contentId: "125709", contentTypeId: "12", canonicalName: "용화해변" },
  "GOAT-053": { contentId: "2633902", contentTypeId: "12", canonicalName: "초곡 용굴촛대바위길" },
  "GOAT-054": { contentId: "2760361", contentTypeId: "12", canonicalName: "철원 한탄강 주상절리길(잔도)" },
  "GOAT-055": { contentId: "590440", contentTypeId: "12", canonicalName: "쏠비치 양양" },
  "GOAT-056": { contentId: "127770", contentTypeId: "12", canonicalName: "허브나라농원" },
  "GOAT-057": { contentId: "2778965", contentTypeId: "12", canonicalName: "로미지안가든" },
  "GOAT-058": { contentId: "2749319", contentTypeId: "12", canonicalName: "고석정 꽃밭" },
  "GOAT-059": { contentId: "2589656", contentTypeId: "12", canonicalName: "파크로쉬 리조트앤웰니스(PARK ROCHE Resort&Wellness)" },
  "GOAT-060": { contentId: "2792635", contentTypeId: "12", canonicalName: "켄싱턴 프렌치 가든" },
  "GOAT-061": { contentId: "4097702", contentTypeId: "12", canonicalName: "델피노" },
};

type KtoItem = Record<string, unknown>;
export type OfficialTourInfo = {
  contentId: string;
  canonicalName: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  overview?: string;
  parking?: string;
  usageTime?: string;
  restDate?: string;
  phone?: string;
  homepage?: string;
  attribution: { label: string; sourceUrl: string };
};

const cache = new Map<string, { value: OfficialTourInfo | null; expiresAt: number }>();
const stripHtml = (value: unknown) => typeof value === "string"
  ? value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  : "";
const text = (item: KtoItem, ...keys: string[]) => keys.map((key) => stripHtml(item[key])).find(Boolean);
const numeric = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const items = (payload: unknown): KtoItem[] => {
  const item = (payload as { response?: { body?: { items?: { item?: unknown } } } })?.response?.body?.items?.item;
  if (!item || item === "") return [];
  return (Array.isArray(item) ? item : [item]).filter((value): value is KtoItem => Boolean(value) && typeof value === "object");
};

async function request(path: string, params: Record<string, string>) {
  const serviceKey = process.env.KTO_SERVICE_KEY?.trim();
  if (!serviceKey) throw new Error("KTO_SERVICE_KEY_MISSING");
  const search = new URLSearchParams({ serviceKey, MobileOS: "ETC", MobileApp: "GOAT", _type: "json", ...params });
  const response = await fetch(`${KTO_BASE}/${path}?${search}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`KTO_${response.status}`);
  return items(await response.json());
}

export async function fetchOfficialTourInfo(placeId: string): Promise<OfficialTourInfo | null> {
  const entity = entities[placeId];
  if (!entity) return null;
  const cached = cache.get(placeId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const [commonResult, introResult] = await Promise.allSettled([
    request("detailCommon2", { contentId: entity.contentId }),
    request("detailIntro2", { contentId: entity.contentId, contentTypeId: entity.contentTypeId }),
  ]);
  if (commonResult.status === "rejected" && introResult.status === "rejected") throw commonResult.reason;
  const common = commonResult.status === "fulfilled" ? commonResult.value[0] : undefined;
  const intro = introResult.status === "fulfilled" ? introResult.value[0] : undefined;
  if (!common && !intro) {
    cache.set(placeId, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }
  const value: OfficialTourInfo = {
    contentId: entity.contentId,
    canonicalName: text(common ?? {}, "title") ?? entity.canonicalName,
    address: text(common ?? {}, "addr1"),
    latitude: numeric(common?.mapy),
    longitude: numeric(common?.mapx),
    overview: text(common ?? {}, "overview"),
    parking: text(intro ?? {}, "parking", "parkingculture", "parkingleports", "parkinglodging", "chkparkingbeach"),
    usageTime: text(intro ?? {}, "usetime", "usetimeculture", "usetimeleports", "usetimefestival"),
    restDate: text(intro ?? {}, "restdate", "restdateculture", "restdateleports", "restdatefestival"),
    phone: text(common ?? {}, "tel", "telname"),
    homepage: text(common ?? {}, "homepage"),
    attribution: { label: "ⓒ한국관광공사", sourceUrl: "https://www.data.go.kr/data/15101578/openapi.do" },
  };
  cache.set(placeId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
