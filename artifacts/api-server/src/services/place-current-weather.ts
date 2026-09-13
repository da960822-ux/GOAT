import { getShortTermForecast, type WeatherForecast } from "./today-context";

export type CurrentWeather = {
  atKst: string;
  sky: "CLEAR" | "CLOUDY" | "OVERCAST" | "UNKNOWN";
  precipitation: "NONE" | "RAIN_OR_SNOW" | "UNKNOWN";
  temperatureC: number | null;
  windSpeedMps: number | null;
  attribution: { label: string; sourceUrl: string };
};

export async function getPlaceCurrentWeather(
  coordinates: { latitude?: number; longitude?: number },
  forecastProvider: typeof getShortTermForecast = getShortTermForecast,
): Promise<CurrentWeather | null> {
  const forecast: WeatherForecast | null = await forecastProvider(coordinates).catch(() => null);
  const hour = forecast?.status === "APPLIED" ? forecast.hours[0] : undefined;
  return hour ? {
    ...hour,
    attribution: { label: "기상청", sourceUrl: "https://www.data.go.kr/data/15084084/openapi.do" },
  } : null;
}
