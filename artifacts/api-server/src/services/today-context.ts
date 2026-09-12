import type { NormalizedCandidateConditions } from "@workspace/travel-domain";

const KMA_FORECAST_URL =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

export type ContextFactor = "WEATHER" | "VISIT_CONCENTRATION";
export type ContextFactorStatus = "APPLIED" | "SKIPPED";
export type ContextSkipReason =
  | "PROVIDER_NOT_CONFIGURED"
  | "PROVIDER_UNAVAILABLE"
  | "NO_SAME_DAY_FORECAST"
  | "MISSING_COORDINATES"
  | "CONCENTRATION_COMPARABILITY_UNSUPPORTED"
  | "CONCENTRATION_PLACE_OR_DATE_UNCONFIRMED";

export type ContextFactorResult = {
  factor: ContextFactor;
  status: ContextFactorStatus;
  reason?: ContextSkipReason;
};

export type TodayStatus = "NOT_REQUESTED" | "APPLIED" | "NO_CHANGE" | "UNAVAILABLE";

/**
 * B only reports application facts. A keeps ownership of candidate selection and
 * supplies the before/after IDs after it applies a valid same-group comparison.
 */
export function summarizeTodayContext(input: {
  requested: boolean;
  factors: ContextFactorResult[];
  baselinePlaceIds: string[];
  conditionedPlaceIds: string[];
}): {
  todayStatus: TodayStatus;
  appliedFactors: ContextFactor[];
  skippedFactors: ContextFactor[];
  partialApplied: boolean;
} {
  if (!input.requested) {
    return { todayStatus: "NOT_REQUESTED", appliedFactors: [], skippedFactors: [], partialApplied: false };
  }
  const appliedFactors = input.factors.filter(({ status }) => status === "APPLIED").map(({ factor }) => factor);
  const skippedFactors = input.factors.filter(({ status }) => status === "SKIPPED").map(({ factor }) => factor);
  if (appliedFactors.length === 0) {
    return { todayStatus: "UNAVAILABLE", appliedFactors, skippedFactors, partialApplied: false };
  }
  const unchanged = input.baselinePlaceIds.length === input.conditionedPlaceIds.length
    && input.baselinePlaceIds.every((placeId, index) => placeId === input.conditionedPlaceIds[index]);
  return {
    todayStatus: unchanged ? "NO_CHANGE" : "APPLIED",
    appliedFactors,
    skippedFactors,
    partialApplied: skippedFactors.length > 0,
  };
}

export type WeatherForecast = ContextFactorResult & {
  windowStartKst: string | null;
  windowEndKst: string | null;
  hours: Array<{
    atKst: string;
    sky: "CLEAR" | "CLOUDY" | "OVERCAST" | "UNKNOWN";
    precipitation: "NONE" | "RAIN_OR_SNOW" | "UNKNOWN";
    temperatureC: number | null;
    windSpeedMps: number | null;
  }>;
};

/** Converts B's provider result into the normalized boundary consumed by A. */
export function toDiscoveryWeatherCondition(
  forecast: WeatherForecast,
): NonNullable<NormalizedCandidateConditions["weather"]> {
  if (forecast.status !== "APPLIED" || !forecast.windowStartKst || !forecast.windowEndKst) {
    return {
      status: "UNAVAILABLE",
      reason: forecast.reason === "PROVIDER_UNAVAILABLE" ? "TIMEOUT" : "NO_DATA",
    };
  }
  return {
    status: "COMPARABLE",
    comparisonKey: `${forecast.windowStartKst}/${forecast.windowEndKst}`,
    preference: forecast.hours.filter(({ precipitation }) => precipitation === "NONE").length,
  };
}

type KmaItem = {
  category?: unknown;
  fcstDate?: unknown;
  fcstTime?: unknown;
  fcstValue?: unknown;
};

const kstParts = (date: Date) => {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    values.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${get("year")}${get("month")}${get("day")}`,
    hour: Number(get("hour")),
  };
};

export function latestKmaBase(now = new Date()) {
  const kst = kstParts(now);
  const minute = Number(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    minute: "2-digit",
  }).formatToParts(now).find((part) => part.type === "minute")?.value ?? "0");
  const baseHour = [23, 20, 17, 14, 11, 8, 5, 2].find(
    (hour) => kst.hour > hour || (kst.hour === hour && minute >= 10),
  );
  if (baseHour !== undefined) {
    return { baseDate: kst.date, baseTime: `${baseHour}`.padStart(2, "0") + "00" };
  }
  return { baseDate: kstParts(new Date(now.getTime() - 24 * 60 * 60 * 1000)).date, baseTime: "2300" };
}

/** Korea Meteorological Administration DFS grid conversion for place coordinates. */
export function toKmaGrid(latitude: number, longitude: number) {
  const radius = 6371.00877;
  const gridKm = 5;
  const standardLatitude1 = (30 * Math.PI) / 180;
  const standardLatitude2 = (60 * Math.PI) / 180;
  const originLongitude = (126 * Math.PI) / 180;
  const originLatitude = (38 * Math.PI) / 180;
  const re = radius / gridKm;
  const sn = Math.log(Math.cos(standardLatitude1) / Math.cos(standardLatitude2))
    / Math.log(
      Math.tan(Math.PI * 0.25 + standardLatitude2 * 0.5)
      / Math.tan(Math.PI * 0.25 + standardLatitude1 * 0.5),
    );
  const sf = Math.tan(Math.PI * 0.25 + standardLatitude1 * 0.5) ** sn
    * Math.cos(standardLatitude1) / sn;
  const ro = re * sf / Math.tan(Math.PI * 0.25 + originLatitude * 0.5) ** sn;
  const ra = re * sf / Math.tan(Math.PI * 0.25 + (latitude * Math.PI) / 360) ** sn;
  const theta = longitude * Math.PI / 180 - originLongitude;
  const angle = ((theta > Math.PI ? theta - Math.PI * 2 : theta < -Math.PI ? theta + Math.PI * 2 : theta) * sn);
  return {
    nx: Math.floor(ra * Math.sin(angle) + 43 + 0.5),
    ny: Math.floor(ro - ra * Math.cos(angle) + 136 + 0.5),
  };
}

const skippedWeather = (reason: ContextSkipReason): WeatherForecast => ({
  factor: "WEATHER",
  status: "SKIPPED",
  reason,
  windowStartKst: null,
  windowEndKst: null,
  hours: [],
});

function kmaItems(data: unknown): KmaItem[] {
  const item = (data as {
    response?: { body?: { items?: { item?: unknown } } };
  })?.response?.body?.items?.item;
  return Array.isArray(item) ? item as KmaItem[] : item ? [item as KmaItem] : [];
}

const numberOrNull = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Selects only the next KST on-the-hour through the following two same-day hours. */
export function normalizeShortTermForecast(items: KmaItem[], now = new Date()): WeatherForecast {
  const kst = kstParts(now);
  const targetHours = Array.from(
    { length: Math.max(0, Math.min(3, 24 - (kst.hour + 1))) },
    (_, index) => String(kst.hour + index + 1).padStart(2, "0") + "00",
  );
  const byHour = new Map(targetHours.map((hour) => [hour, new Map<string, unknown>()]));
  for (const item of items) {
    const hour = String(item.fcstTime ?? "").padStart(4, "0");
    if (String(item.fcstDate ?? "") === kst.date && byHour.has(hour) && typeof item.category === "string") {
      byHour.get(hour)!.set(item.category, item.fcstValue);
    }
  }
  const hours = targetHours
    .map((hour) => {
      const values = byHour.get(hour)!;
      if (values.size === 0) return null;
      const pty = numberOrNull(values.get("PTY"));
      const skyValue = numberOrNull(values.get("SKY"));
      return {
        atKst: `${kst.date}${hour}`,
        sky: (skyValue === 1 ? "CLEAR" : skyValue === 3 ? "CLOUDY" : skyValue === 4 ? "OVERCAST" : "UNKNOWN") as WeatherForecast["hours"][number]["sky"],
        precipitation: (pty === 0 ? "NONE" : pty === null ? "UNKNOWN" : "RAIN_OR_SNOW") as WeatherForecast["hours"][number]["precipitation"],
        temperatureC: numberOrNull(values.get("TMP") ?? values.get("T1H")),
        windSpeedMps: numberOrNull(values.get("WSD")),
      };
    })
    .filter((hour): hour is NonNullable<typeof hour> => hour !== null);
  if (hours.length === 0) return skippedWeather("NO_SAME_DAY_FORECAST");
  return {
    factor: "WEATHER",
    status: "APPLIED",
    windowStartKst: hours[0]!.atKst,
    windowEndKst: hours.at(-1)!.atKst,
    hours,
  };
}

export async function getShortTermForecast(
  coordinates: { latitude?: number; longitude?: number },
  now = new Date(),
): Promise<WeatherForecast> {
  const serviceKey = process.env.KMA_SERVICE_KEY?.trim();
  if (!serviceKey) return skippedWeather("PROVIDER_NOT_CONFIGURED");
  if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) {
    return skippedWeather("MISSING_COORDINATES");
  }
  const { nx, ny } = toKmaGrid(coordinates.latitude!, coordinates.longitude!);
  const base = latestKmaBase(now);
  const params = new URLSearchParams({
    serviceKey,
    numOfRows: "300",
    pageNo: "1",
    dataType: "JSON",
    base_date: base.baseDate,
    base_time: base.baseTime,
    nx: String(nx),
    ny: String(ny),
  });
  try {
    const response = await fetch(`${KMA_FORECAST_URL}?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return skippedWeather("PROVIDER_UNAVAILABLE");
    return normalizeShortTermForecast(kmaItems(await response.json()), now);
  } catch {
    return skippedWeather("PROVIDER_UNAVAILABLE");
  }
}
