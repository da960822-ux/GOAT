/** Generated from the GOAT OpenAPI contract. */
import type { TravelOrigin } from './travelOrigin';
export interface GeocodeOriginData {
  origin: TravelOrigin;
  address: string;
  source: 'ADDRESS' | 'KEYWORD';
}
