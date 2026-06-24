/**
 * Normalized output types for all KTO (Korea Tourism Organization) API services.
 * Source: https://www.data.go.kr (한국관광공사)
 */

/** 1. 관광사진 정보_GW — tourism photo gallery */
export interface KTOPhotoResult {
  imageUrl: string | null;
  title?: string;
  location?: string;
  keywords?: string[];
  source: 'KTO_PHOTO_API' | 'KTO_AWARD_PHOTO_API' | 'fallback';
}

/** 2. 국문 관광정보 서비스_GW — official tourism info */
export interface KTOTourInfo {
  contentId?: string;
  contentTypeId?: string;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  /** firstimage URL from searchKeyword2 result — primary photo source */
  imageUrl?: string;
  overview?: string;
  parking?: string;
  usageTime?: string;
  restDate?: string;
  phone?: string;
  homepage?: string;
  source: 'KTO_TOUR_INFO' | 'local';
}

/** 3. 관광지 집중률 방문자 추이 예측 — visitor concentration prediction */
export interface KTOVisitConcentration {
  concentrationLevel: 'low' | 'medium' | 'high' | 'unknown';
  trendLabel?: string;
  /** 가장 붐비는 시기를 100으로 본 상대 집중률 */
  concentrationRate?: number;
  predictedVisitors?: number;
  baseDate?: string;
  source: 'KTO_VISIT_CONCENTRATION' | 'fallback';
}

/** 4. 기초지자체 중심 관광지 정보 — local government tourism data */
export interface KTOLocalGovInfo {
  regionName?: string;
  city?: string;
  relatedTourSpots?: string[];
  regionKeywords?: string[];
  source: 'KTO_LOCAL_GOV_TOUR_INFO' | 'fallback';
}

/** 5. 관광공모전(사진) 수상작 정보 — award-winning contest photos */
export interface KTOAwardPhoto {
  imageUrl: string | null;
  title?: string;
  awardInfo?: string;
  location?: string;
  keywords?: string[];
  source: 'KTO_AWARD_PHOTO_API' | 'fallback';
}
