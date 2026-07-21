const SEARCH_ALIASES: Record<string, string[]> = {
  '금진해변·헌화로 드라이브 코스': ['헌화로', '금진해변'],
};

export function getKtoSearchTerms(placeName: string): string[] {
  return [placeName, ...(SEARCH_ALIASES[placeName] ?? [])].filter(Boolean);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s·()\-_/]/g, '');
}

export function isRelevantKtoResult(
  city: string,
  query: string,
  title: string,
  location: string
): boolean {
  if (!city || !location) return false;

  const cityRoot = normalize(city.replace(/[시군구]$/, ''));
  const normalizedLocation = normalize(location);
  if (cityRoot && normalizedLocation.includes(cityRoot)) return true;

  const normalizedTitle = normalize(title);
  const normalizedQuery = normalize(query);
  const sameTitle =
    normalizedTitle.length >= 3 &&
    (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle));

  return /강원(?:특별자치도|도)/.test(location) && sameTitle;
}
