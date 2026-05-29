export interface WeatherCondition {
  sky: 'clear' | 'cloudy' | 'overcast' | 'rainy' | 'snowy' | 'unknown';
  temperature?: number;
  windSpeed?: number;
  label: string;
}

export interface WeatherSuitability {
  score: number;
  label: string;
  reason: string;
}

export async function fetchWeather(_city: string): Promise<WeatherCondition> {
  // TODO: Connect to KMA (기상청) short-term weather forecast API
  // API: 기상청 단기예보 조회서비스 (data.go.kr)
  // Use city to get grid coordinates (nx, ny) then call forecast API
  // Returns: sky condition, rain probability, temperature, wind speed
  return { sky: 'unknown', label: '날씨 정보 없음' };
}

export function calculateWeatherSuitability(
  _weather: WeatherCondition,
  _placeType: string,
  _bestSeason: string
): WeatherSuitability {
  // TODO: Implement weather suitability calculation
  // Logic: rain + outdoor = low, rain + indoor = medium, clear + outdoor = high
  // Also consider best_season match with current season
  return { score: 0, label: '정보 없음', reason: '날씨 API 연결 후 제공 예정' };
}
