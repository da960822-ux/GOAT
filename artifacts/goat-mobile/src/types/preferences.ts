export type Companion = '혼자' | '연인' | '친구' | '가족';
export type Transport = '자차' | '대중교통';
export type VisitTime = '오전' | '오후' | '일몰' | '저녁' | '밤/새벽';
export type TravelPurpose = '가볍게 산책' | '사진 위주' | '액티비티' | '조용한 휴식';

export interface TravelPreferences {
  companion: Companion;
  transport: Transport;
  visitTime: VisitTime;
  purpose: TravelPurpose;
}
