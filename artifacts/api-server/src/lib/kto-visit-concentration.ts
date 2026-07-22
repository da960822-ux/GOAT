const VISIT_CONCENTRATION_URL =
  "https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList";
const GANGWON_AREA_CODE = "51";
const CACHE_TTL_MS = 60 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const GANGWON_SIGUNGU_CODES: Record<string, string> = {
  춘천시: "51110",
  원주시: "51130",
  강릉시: "51150",
  동해시: "51170",
  태백시: "51190",
  속초시: "51210",
  삼척시: "51230",
  홍천군: "51720",
  횡성군: "51730",
  영월군: "51750",
  평창군: "51760",
  정선군: "51770",
  철원군: "51780",
  화천군: "51790",
  양구군: "51800",
  인제군: "51810",
  고성군: "51820",
  양양군: "51830",
};

export type VisitConcentration = {
  level: "low" | "medium" | "high" | "unknown";
  label: string | null;
  concentrationRate: number | null;
  baseDate: string | null;
  source: "KTO_VISIT_CONCENTRATION" | "fallback";
};

type CacheEntry = { data: VisitConcentration; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<VisitConcentration>>();

const fallback = (): VisitConcentration => ({
  level: "unknown",
  label: null,
  concentrationRate: null,
  baseDate: null,
  source: "fallback",
});

function normalizeCity(city: string): string {
  return city.trim().replace(/\s+/g, "");
}

export function classifyConcentrationRate(
  rawValue: unknown,
): VisitConcentration["level"] {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "unknown";
  }
  const parsed =
    typeof rawValue === "number"
      ? rawValue
      : Number.parseFloat(String(rawValue));
  if (!Number.isFinite(parsed)) return "unknown";
  const percentage = parsed <= 1 ? parsed * 100 : parsed;
  if (percentage >= 70) return "high";
  if (percentage >= 40) return "medium";
  return "low";
}

function labelForLevel(level: VisitConcentration["level"]): string | null {
  if (level === "low") return "방문 여유";
  if (level === "medium") return "보통";
  if (level === "high") return "방문 집중 예상";
  return null;
}

function extractItems(data: unknown): Array<Record<string, unknown>> {
  const item = (
    data as {
      response?: { body?: { items?: { item?: unknown } } };
    }
  )?.response?.body?.items?.item;
  if (!item || item === "") return [];
  return Array.isArray(item)
    ? (item as Array<Record<string, unknown>>)
    : [item as Record<string, unknown>];
}

function trimCache() {
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
}

async function fetchVisitConcentration(
  placeName: string,
  city: string,
): Promise<VisitConcentration> {
  const serviceKey = process.env.KTO_SERVICE_KEY?.trim();
  const signguCd = GANGWON_SIGUNGU_CODES[normalizeCity(city)];
  if (!serviceKey || !placeName.trim() || !signguCd) return fallback();

  const params = new URLSearchParams({
    serviceKey,
    MobileOS: "ETC",
    MobileApp: "GOAT",
    _type: "json",
    numOfRows: "30",
    pageNo: "1",
    areaCd: GANGWON_AREA_CODE,
    signguCd,
    tAtsNm: placeName.trim(),
  });

  try {
    const response = await fetch(`${VISIT_CONCENTRATION_URL}?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return fallback();

    const items = extractItems(await response.json());
    if (!items.length) return fallback();

    const rawValue = items[0]?.cnctrRate;
    const level = classifyConcentrationRate(rawValue);
    const parsedRate = Number.parseFloat(String(rawValue));
    return {
      level,
      label: labelForLevel(level),
      concentrationRate: Number.isFinite(parsedRate) ? parsedRate : null,
      baseDate: items[0]?.baseYmd ? String(items[0].baseYmd) : null,
      source: "KTO_VISIT_CONCENTRATION",
    };
  } catch {
    return fallback();
  }
}

export async function getVisitConcentration(
  placeName: string,
  city: string,
): Promise<VisitConcentration> {
  const key = `${normalizeCity(city)}::${placeName.trim()}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = fetchVisitConcentration(placeName, city)
    .then((data) => {
      cache.set(key, {
        data,
        expiresAt:
          Date.now() +
          (data.source === "KTO_VISIT_CONCENTRATION"
            ? CACHE_TTL_MS
            : FALLBACK_CACHE_TTL_MS),
      });
      trimCache();
      return data;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}
