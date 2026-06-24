export type CrowdLevel = 'low' | 'medium' | 'high' | 'unknown';

export interface VisitorPrediction {
  level: CrowdLevel;
  label: string;
  note?: string;
}

export async function fetchVisitorPrediction(_placeId: string): Promise<VisitorPrediction> {
  // TODO: Connect to tourism visitor trend prediction data source
  // This is NOT real-time crowd detection.
  // Future use: relative crowd-risk indicator based on historical visitor trend data.
  // Data source: 한국관광 데이터랩 or 통합관광정보 API
  return { level: 'unknown', label: '정보 없음' };
}
