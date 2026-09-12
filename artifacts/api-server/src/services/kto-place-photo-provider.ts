import type { ProviderPhoto } from "./place-photo-service";

const KTO_BASE = "https://apis.data.go.kr/B551011";
const PHOTO_GALLERY_PATH = "PhotoGalleryService1/gallerySearchList1";
const KOR_SEARCH_PATH = "KorService2/searchKeyword2";
const KOR_DETAIL_IMAGE_PATH = "KorService2/detailImage2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type KtoItem = Record<string, unknown>;

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

const imageUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "http:" && url.hostname === "tong.visitkorea.or.kr") {
      url.protocol = "https:";
    }
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const cache = new Map<string, { photos: ProviderPhoto[]; expiresAt: number }>();
const inFlight = new Map<string, Promise<ProviderPhoto[]>>();

const itemList = (payload: unknown): KtoItem[] => {
  const item = (payload as { response?: { body?: { items?: { item?: unknown } } } })
    ?.response?.body?.items?.item;
  if (!item || item === "") return [];
  return (Array.isArray(item) ? item : [item]).filter(
    (value): value is KtoItem => Boolean(value) && typeof value === "object",
  );
};

const value = (item: KtoItem, key: string) => {
  const candidate = item[key];
  return typeof candidate === "string" ? candidate.trim() : "";
};

const knownPlace = (placeName: string, city: string, item: KtoItem) => {
  const title = normalize(value(item, "title") || value(item, "galTitle"));
  const address = normalize(
    [
      value(item, "addr1"),
      value(item, "galPhotographyLocation"),
      value(item, "galAddr1"),
      value(item, "galAddr2"),
    ].join(" "),
  );
  return title.includes(normalize(placeName)) && address.includes(normalize(city));
};

async function request(path: string, params: Record<string, string>) {
  const serviceKey = process.env.KTO_SERVICE_KEY?.trim();
  if (!serviceKey) return [];
  const search = new URLSearchParams({
    serviceKey,
    MobileOS: "ETC",
    MobileApp: "GOAT",
    _type: "json",
    ...params,
  });
  const response = await fetch(`${KTO_BASE}/${path}?${search}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`KTO_${response.status}`);
  return itemList(await response.json());
}

const galleryPhoto = (item: KtoItem): ProviderPhoto | null => {
  const url = imageUrl(value(item, "galWebImageUrl") || value(item, "galThumbnailImageUrl"));
  if (!url) return null;
  const sourceRef = value(item, "galContentId") || url;
  return {
    provider: "KTO_PHOTO",
    sourceRef,
    url,
    placeVerified: true,
    rightsConfirmed: true,
    title: value(item, "galTitle") || undefined,
    photographyLocation:
      value(item, "galPhotographyLocation") || value(item, "galAddr1") || undefined,
    keywords: value(item, "galSearchKeyword").split(/[,\s]+/).filter(Boolean),
  };
};

const detailPhoto = (item: KtoItem): ProviderPhoto | null => {
  const url = imageUrl(value(item, "originimgurl") || value(item, "smallimageurl"));
  if (!url) return null;
  return {
    provider: "KTO_TOUR_INFO",
    sourceRef: value(item, "serialnum") || url,
    url,
    placeVerified: true,
    rightsConfirmed: true,
    title: value(item, "imgname") || undefined,
  };
};

/** Fetches only KTO records with a title/address match for this exact place. */
export async function fetchKtoPlacePhotos(
  placeName: string,
  city: string,
): Promise<ProviderPhoto[]> {
  const cacheKey = `${normalize(city)}:${normalize(placeName)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.photos;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const request = fetchUncachedKtoPlacePhotos(placeName, city)
    .then((photos) => {
      cache.set(cacheKey, { photos, expiresAt: Date.now() + CACHE_TTL_MS });
      return photos;
    })
    .finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, request);
  return request;
}

async function fetchUncachedKtoPlacePhotos(
  placeName: string,
  city: string,
): Promise<ProviderPhoto[]> {
  const [galleryItems, searchItems] = await Promise.all([
    request(PHOTO_GALLERY_PATH, { keyword: placeName, numOfRows: "20", pageNo: "1" }),
    request(KOR_SEARCH_PATH, { keyword: placeName, numOfRows: "10", pageNo: "1" }),
  ]);

  const gallery = galleryItems
    .filter((item) => knownPlace(placeName, city, item))
    .map(galleryPhoto)
    .filter((photo): photo is ProviderPhoto => photo !== null);

  const matchedContent = searchItems.find((item) => knownPlace(placeName, city, item));
  if (!matchedContent) return gallery;
  const contentId = value(matchedContent, "contentid");
  if (!contentId) return gallery;

  const detailItems = await request(KOR_DETAIL_IMAGE_PATH, {
    contentId,
    imageYN: "Y",
    subImageYN: "Y",
    numOfRows: "20",
    pageNo: "1",
  });
  return [
    ...gallery,
    ...detailItems.map(detailPhoto).filter((photo): photo is ProviderPhoto => photo !== null),
  ];
}
