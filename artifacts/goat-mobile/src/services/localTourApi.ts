export interface LocalTourData {
  placeName: string;
  description?: string;
  openingHours?: string;
  admissionFee?: string;
  website?: string;
}

export async function fetchLocalTourData(_placeName: string, _city: string): Promise<LocalTourData | null> {
  // TODO: Connect to local government tourism information APIs
  // Future use: fill data gaps for Gangwon city/county places
  // Sources:
  //   - 강원도 문화관광 (gw.go.kr)
  //   - 각 시군 관광 API (춘천, 강릉, 속초, 양양, 평창, etc.)
  return null;
}
