import {
  ExposureStats,
  RecommendationCardRole,
} from "./goatRecommendationTypes";

export interface RecommendationExposureQuery {
  userId?: string;
  sessionId?: string;
  referenceCardId?: string;
  primaryTheme?: string;
  /** 최근 몇 개의 노출 카드 row를 recentExposureByPlaceId 계산에 사용할지. 기본 20. */
  recentLimit?: number;
}

export interface RecommendationExposureCardInput {
  placeId: string;
  rankNo: number;
  cardRole?: RecommendationCardRole | string;
}

export interface SaveRecommendationExposuresInput {
  requestId: string;
  userId?: string;
  sessionId?: string;
  referenceCardId?: string;
  primaryTheme?: string;
  travelPurpose?: string;
  cards: RecommendationExposureCardInput[];
  createdAt?: Date | string;
}

export interface RecommendationExposureRecord {
  id: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  placeId: string;
  rankNo: number;
  cardRole?: string;
  referenceCardId?: string;
  primaryTheme?: string;
  travelPurpose?: string;
  createdAt: string;
}

export interface RecommendationExposureRepository {
  /** rerollOfRequestId가 들어왔을 때 직전 카드 3개를 강제 제외하기 위한 조회. */
  findPlaceIdsByRequestId(requestId: string): Promise<string[]>;

  /** 엔진의 recentExposureByPlaceId, totalExposureByPlaceId, themeAverageExposure에 그대로 넘길 통계 조회. */
  getExposureStats(query: RecommendationExposureQuery): Promise<Required<ExposureStats>>;

  /** 추천 결과 카드 3개를 노출 로그로 저장. 다음 추천/다시 추천에서 재노출 보정에 사용된다. */
  saveExposures(input: SaveRecommendationExposuresInput): Promise<void>;
}

function countByPlaceId(records: RecommendationExposureRecord[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const record of records) {
    result[record.placeId] = (result[record.placeId] ?? 0) + 1;
  }
  return result;
}

function matchesUserOrSession(record: RecommendationExposureRecord, query: RecommendationExposureQuery): boolean {
  if (!query.userId && !query.sessionId) return true;
  return Boolean(
    (query.userId && record.userId === query.userId) ||
    (query.sessionId && record.sessionId === query.sessionId),
  );
}

function matchesReferenceScope(record: RecommendationExposureRecord, query: RecommendationExposureQuery): boolean {
  if (query.referenceCardId && record.referenceCardId !== query.referenceCardId) return false;
  return true;
}

function buildThemeAverageExposure(records: RecommendationExposureRecord[]): Record<string, number> {
  const themePlaceCounts = new Map<string, Map<string, number>>();

  for (const record of records) {
    if (!record.primaryTheme) continue;
    if (!themePlaceCounts.has(record.primaryTheme)) themePlaceCounts.set(record.primaryTheme, new Map());
    const placeCounts = themePlaceCounts.get(record.primaryTheme);
    if (!placeCounts) continue;
    placeCounts.set(record.placeId, (placeCounts.get(record.placeId) ?? 0) + 1);
  }

  const result: Record<string, number> = {};
  for (const [theme, placeCounts] of themePlaceCounts.entries()) {
    const values = Array.from(placeCounts.values());
    result[theme] = values.length > 0
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
      : 0;
  }
  return result;
}

/**
 * DB 연결 전에도 추천 다양성 로직을 검증할 수 있는 메모리 저장소.
 * 실제 백엔드에서는 같은 인터페이스로 MySQL/JPA/Supabase 구현체만 교체하면 된다.
 */
export class InMemoryRecommendationExposureRepository implements RecommendationExposureRepository {
  private readonly records: RecommendationExposureRecord[] = [];
  private nextId = 1;

  constructor(initialRecords: RecommendationExposureRecord[] = []) {
    this.records.push(...initialRecords);
    this.nextId = initialRecords.length + 1;
  }

  async findPlaceIdsByRequestId(requestId: string): Promise<string[]> {
    return this.records
      .filter((record) => record.requestId === requestId)
      .sort((a, b) => a.rankNo - b.rankNo)
      .map((record) => record.placeId);
  }

  async getExposureStats(query: RecommendationExposureQuery): Promise<Required<ExposureStats>> {
    const recentLimit = query.recentLimit ?? 20;

    const scopedRecentRecords = this.records
      .filter((record) => matchesUserOrSession(record, query))
      .filter((record) => matchesReferenceScope(record, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, recentLimit);

    return {
      recentExposureByPlaceId: countByPlaceId(scopedRecentRecords),
      totalExposureByPlaceId: countByPlaceId(this.records),
      themeAverageExposure: buildThemeAverageExposure(this.records),
    };
  }

  async saveExposures(input: SaveRecommendationExposuresInput): Promise<void> {
    const createdAt = input.createdAt instanceof Date
      ? input.createdAt.toISOString()
      : input.createdAt ?? new Date().toISOString();

    for (const card of input.cards) {
      this.records.push({
        id: String(this.nextId++),
        requestId: input.requestId,
        userId: input.userId,
        sessionId: input.sessionId,
        placeId: card.placeId,
        rankNo: card.rankNo,
        cardRole: card.cardRole ? String(card.cardRole) : undefined,
        referenceCardId: input.referenceCardId,
        primaryTheme: input.primaryTheme,
        travelPurpose: input.travelPurpose,
        createdAt,
      });
    }
  }

  /** 테스트/디버깅용. 운영 코드에서는 직접 records를 만지지 말고 repository 메서드를 사용한다. */
  getRecords(): RecommendationExposureRecord[] {
    return [...this.records];
  }
}
