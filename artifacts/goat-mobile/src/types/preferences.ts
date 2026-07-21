export type {
  Companion,
  OriginType,
  Transport,
  TravelOrigin,
  VisitTime,
} from "@workspace/travel-domain";

import type {
  Companion,
  Transport,
  TravelOrigin,
  VisitTime,
} from "@workspace/travel-domain";

export type TravelPurpose =
  | "사진·포토스팟"
  | "산책·힐링"
  | "카페·실내휴식"
  | "전시·건축관람"
  | "체험·액티비티"
  | "먹거리·야간탐방"
  | "숙소·리조트";

export type TravelSeason = "봄" | "여름" | "가을" | "겨울";

export interface TravelPreferences {
  companion: Companion;
  transport: Transport;
  visitTime: VisitTime | null;
  purpose: TravelPurpose;
  season: TravelSeason | null;
}

export interface PersistedTravelState {
  travelPreferences: TravelPreferences | null;
  origin: TravelOrigin | null;
}
