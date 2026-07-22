import type { AccessGrade } from "./goatRecommendationTypes";

export const ACCESSIBILITY_RECOMMENDATION_POINTS: Readonly<Record<AccessGrade, number>> = Object.freeze({
  상: 12,
  중: 7,
  하: 1,
});

export type AccessibilityEvaluation = {
  grade?: AccessGrade;
  rawScore?: number;
  maxScore: number;
  reviewRequired: boolean;
  reasons: string[];
};

export type PublicTransportEvaluationInput = {
  hubConnection?: "easy" | "transfer_required" | "difficult";
  transfers?: number;
  typicalHeadwayMinutes?: number;
  finalWalkMinutes?: number;
  finalWalkCondition?: "safe" | "difficult" | "unsafe";
  taxiDependency?: "none" | "optional" | "required";
  serviceStability?: "stable" | "limited" | "unreliable";
};

export type CarEvaluationInput = {
  roadAccess?: "easy" | "narrow_or_steep" | "difficult_or_unpaved";
  parking?: "ample" | "limited" | "difficult_or_none";
  walkFromParkingMinutes?: number;
  generalVehicleAccess?: "allowed" | "caution" | "restricted";
  seasonalRestriction?: "none" | "possible" | "frequent";
};

const publicTransportRequiredFields = [
  "hubConnection",
  "transfers",
  "typicalHeadwayMinutes",
  "finalWalkMinutes",
  "finalWalkCondition",
  "taxiDependency",
  "serviceStability",
] as const;

const carRequiredFields = [
  "roadAccess",
  "parking",
  "walkFromParkingMinutes",
  "generalVehicleAccess",
  "seasonalRestriction",
] as const;

function hasMissingField<T extends object>(input: T, fields: readonly (keyof T)[]): boolean {
  return fields.some((field) => input[field] === undefined || input[field] === null);
}

function pointsForThreshold(value: number, highMax: number, middleMax: number): number {
  if (value <= highMax) return 2;
  if (value <= middleMax) return 1;
  return 0;
}

export function getAccessibilityRecommendationScore(grade: unknown): number {
  return grade === "상" || grade === "중" || grade === "하"
    ? ACCESSIBILITY_RECOMMENDATION_POINTS[grade]
    : 0;
}

/**
 * 대표 기차역·시외버스터미널에서 장소까지의 일반적인 관광객 이동을 평가한다.
 * 실제 사용자 출발지별 시간·거리는 별도 경로 로직에서 계산한다.
 */
export function evaluatePublicTransportAccessibility(
  input: PublicTransportEvaluationInput,
): AccessibilityEvaluation {
  if (hasMissingField(input, publicTransportRequiredFields)) {
    return {
      maxScore: 14,
      reviewRequired: true,
      reasons: ["대중교통 등급 판정에 필요한 환승·배차·마지막 도보·택시 의존 정보가 부족합니다."],
    };
  }

  const transfers = Math.max(0, Number(input.transfers));
  const headway = Math.max(0, Number(input.typicalHeadwayMinutes));
  const finalWalk = Math.max(0, Number(input.finalWalkMinutes));
  const rawScore = (
    { easy: 2, transfer_required: 1, difficult: 0 }[input.hubConnection!]
    + pointsForThreshold(transfers, 1, 2)
    + pointsForThreshold(headway, 30, 60)
    + pointsForThreshold(finalWalk, 15, 30)
    + { safe: 2, difficult: 1, unsafe: 0 }[input.finalWalkCondition!]
    + { none: 2, optional: 1, required: 0 }[input.taxiDependency!]
    + { stable: 2, limited: 1, unreliable: 0 }[input.serviceStability!]
  );

  const severeBarrier = input.hubConnection === "difficult"
    || transfers >= 3
    || headway > 90
    || finalWalk > 30
    || input.finalWalkCondition === "unsafe"
    || input.taxiDependency === "required"
    || input.serviceStability === "unreliable";
  const allHighConditions = input.hubConnection === "easy"
    && transfers <= 1
    && headway <= 30
    && finalWalk <= 15
    && input.finalWalkCondition === "safe"
    && input.taxiDependency === "none"
    && input.serviceStability === "stable";

  const grade: AccessGrade = severeBarrier ? "하" : allHighConditions ? "상" : rawScore >= 7 ? "중" : "하";
  return {
    grade,
    rawScore,
    maxScore: 14,
    reviewRequired: false,
    reasons: severeBarrier
      ? ["과도한 환승·긴 배차·장거리 또는 위험한 마지막 도보·택시 필수·불안정 운행 중 하나 이상에 해당합니다."]
      : [grade === "상" ? "환승·배차·마지막 도보 부담이 모두 작습니다." : "대중교통 방문은 가능하지만 일부 환승·대기·도보 부담이 있습니다."],
  };
}

/** 일반 승용차의 도로 진입, 주차, 주차 후 도보와 계절 통제를 평가한다. */
export function evaluateCarAccessibility(input: CarEvaluationInput): AccessibilityEvaluation {
  if (hasMissingField(input, carRequiredFields)) {
    return {
      maxScore: 10,
      reviewRequired: true,
      reasons: ["자차 등급 판정에 필요한 진입도로·주차·주차 후 도보·차량 제한 정보가 부족합니다."],
    };
  }

  const parkingWalk = Math.max(0, Number(input.walkFromParkingMinutes));
  const rawScore = (
    { easy: 2, narrow_or_steep: 1, difficult_or_unpaved: 0 }[input.roadAccess!]
    + { ample: 2, limited: 1, difficult_or_none: 0 }[input.parking!]
    + pointsForThreshold(parkingWalk, 10, 25)
    + { allowed: 2, caution: 1, restricted: 0 }[input.generalVehicleAccess!]
    + { none: 2, possible: 1, frequent: 0 }[input.seasonalRestriction!]
  );

  const severeBarrier = input.roadAccess === "difficult_or_unpaved"
    || input.parking === "difficult_or_none"
    || parkingWalk > 25
    || input.generalVehicleAccess === "restricted"
    || input.seasonalRestriction === "frequent";
  const allHighConditions = input.roadAccess === "easy"
    && input.parking === "ample"
    && parkingWalk <= 10
    && input.generalVehicleAccess === "allowed"
    && input.seasonalRestriction === "none";

  const grade: AccessGrade = severeBarrier ? "하" : allHighConditions ? "상" : rawScore >= 5 ? "중" : "하";
  return {
    grade,
    rawScore,
    maxScore: 10,
    reviewRequired: false,
    reasons: severeBarrier
      ? ["험로·주차 곤란·긴 주차 후 도보·일반 차량 제한·빈번한 계절 통제 중 하나 이상에 해당합니다."]
      : [grade === "상" ? "일반 승용차 진입과 주차가 모두 용이합니다." : "자차 방문은 가능하지만 도로·주차·도보 또는 계절상 불편이 있습니다."],
  };
}
