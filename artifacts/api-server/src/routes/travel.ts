import { Router, type IRouter } from "express";
import {
  createGoatCourseRecommendation,
  getPlaceById,
  getRecommendations,
  moodCategories,
  referenceCards,
  type TravelPreferences,
} from "@workspace/travel-domain";
import { z } from "zod";
import { ApiError } from "../lib/api-response";
import { createRateLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

const readPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RECOMMEND_RATE_LIMIT_WINDOW_MS = readPositiveInt(
  process.env.RECOMMEND_RATE_LIMIT_WINDOW_SECONDS,
  60,
) * 1000;
const recommendRateLimit = createRateLimiter({
  windowMs: RECOMMEND_RATE_LIMIT_WINDOW_MS,
  max: readPositiveInt(process.env.RECOMMEND_RATE_LIMIT_MAX, 30),
});
const courseRateLimit = createRateLimiter({
  windowMs: RECOMMEND_RATE_LIMIT_WINDOW_MS,
  max: readPositiveInt(process.env.COURSE_RATE_LIMIT_MAX, 8),
});

const defaultLlmModel = process.env.OPENROUTER_DEFAULT_MODEL?.trim() || "openai/gpt-4o-mini";
const allowedLlmModels = new Set(
  (process.env.OPENROUTER_ALLOWED_MODELS ?? defaultLlmModel)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean),
);
const isDebugEnabled = process.env.ALLOW_RECOMMENDATION_DEBUG === "true";

const requestSchema = z
  .object({
    moodId: z.string().min(1).optional(),
    referenceCardId: z.string().min(1).optional(),
    travelPurpose: z.enum([
      "사진·포토스팟",
      "산책·힐링",
      "카페·실내휴식",
      "전시·건축관람",
      "체험·액티비티",
      "먹거리·야간탐방",
      "숙소·리조트",
    ]).optional(),
    transportType: z.enum(["자차", "대중교통", "도보중심"]).optional(),
    visitTime: z.enum(["새벽", "오전", "한낮", "오후", "저녁", "야간"]).optional(),
    currentMonth: z.number().int().min(1).max(12).optional(),
    debug: z.boolean().optional(),
    preferences: z
      .object({
        companion: z.enum(["혼자", "연인", "친구", "가족"]),
        transport: z.enum(["자차", "대중교통", "도보중심"]),
        visitTime: z.enum(["새벽", "오전", "한낮", "오후", "일몰", "저녁", "야간", "밤/새벽"]).nullable().optional(),
        purpose: z.enum(["가볍게 산책", "사진 위주", "액티비티", "조용한 휴식"]),
      })
      .strict()
      .optional(),
    origin: z
      .object({
        type: z.enum(["current", "region", "skip"]),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        regionName: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    excludeIds: z.array(z.string().min(1)).max(58).refine(
      (ids) => new Set(ids).size === ids.length,
      "excludeIds에는 중복된 장소 ID를 넣을 수 없습니다.",
    ).optional(),
  })
  .strict()
  .refine((body) => body.moodId || body.referenceCardId, {
    message: "moodId 또는 referenceCardId 중 하나는 필수입니다.",
    path: ["moodId"],
  });

const courseRequestSchema = z
  .object({
    selectedPlaceId: z.string().min(1),
    primaryTheme: z.enum([
      "바다·해안 무드",
      "일본 소도시·골목 무드",
      "알프스·고원·목장 무드",
      "숲·정원·자연휴식 무드",
      "레트로·시장·항구 무드",
      "건축·전시·랜드마크 무드",
      "휴양·카페·이국공간 무드",
    ]),
    userMoodTags: z.array(z.string().min(1)).max(10).optional(),
    userSceneTags: z.array(z.string().min(1)).max(10).optional(),
    companionType: z.enum(["혼자", "친구", "연인", "가족"]).optional(),
    travelPurpose: z.enum([
      "사진·포토스팟",
      "산책·힐링",
      "카페·실내휴식",
      "전시·건축관람",
      "체험·액티비티",
      "먹거리·야간탐방",
      "숙소·리조트",
    ]).optional(),
    transportType: z.enum(["자차", "대중교통", "도보중심"]).optional(),
    radiusMeters: z.number().int().min(100).max(20000).optional(),
    maxCandidatesForLlm: z.number().int().min(1).max(20).optional(),
    forceRuleBasedFallback: z.boolean().optional(),
    llmModel: z.string().min(1).max(120).optional(),
    debug: z.boolean().optional(),
  })
  .strict();

const courseMapQuerySchema = z.object({
  centerLat: z.coerce.number().min(-90).max(90),
  centerLng: z.coerce.number().min(-180).max(180),
  level: z.coerce.number().int().min(1).max(14).optional(),
  markers: z.string().min(2).max(6000),
});

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function parseCourseMapMarkers(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) throw new Error("markers must be an array");
  return parsed.slice(0, 12).map((marker) => {
    if (!marker || typeof marker !== "object") throw new Error("invalid marker");
    const record = marker as Record<string, unknown>;
    const lat = Number(record.lat);
    const lng = Number(record.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("invalid marker coordinates");
    return {
      order: Number.isFinite(Number(record.order)) ? Number(record.order) : undefined,
      title: String(record.title ?? "").slice(0, 120),
      lat,
      lng,
    };
  });
}

router.get("/moods", (_req, res) => {
  res.json({
    success: true,
    code: "SUCCESS",
    message: "감성 카테고리를 조회했습니다.",
    data: {
      moods: moodCategories.map(({ id, name, description, keywords }) => ({
        id,
        name,
        description,
        keywords,
        referenceCards: referenceCards.filter((card) => card.primaryTheme === name),
      })),
      referenceCards,
    },
  });
});

router.get("/course-map", (req, res, next) => {
  const parsed = courseMapQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(new ApiError(400, "INVALID_REQUEST", "지도 요청값이 올바르지 않습니다.", parsed.error.flatten()));
    return;
  }

  const kakaoJavascriptKey = process.env.KAKAO_JAVASCRIPT_KEY?.trim();
  if (!kakaoJavascriptKey) {
    next(new ApiError(500, "KAKAO_JAVASCRIPT_KEY_MISSING", "Kakao JavaScript 키가 설정되지 않았습니다."));
    return;
  }

  let markers: ReturnType<typeof parseCourseMapMarkers>;
  try {
    markers = parseCourseMapMarkers(parsed.data.markers);
  } catch {
    next(new ApiError(400, "INVALID_REQUEST", "지도 마커 요청값이 올바르지 않습니다."));
    return;
  }

  const markerJson = serializeForInlineScript(markers);
  const markerHtml = markers
    .map((marker) => `<li><strong>${escapeHtml(marker.order ?? "")}</strong> ${escapeHtml(marker.title)}</li>`)
    .join("");

  res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; }
    body { overflow: hidden; background: #e5e7eb; font-family: Arial, sans-serif; }
    #error { display: none; padding: 12px; font-size: 13px; color: #475569; }
    .badge {
      min-width: 22px; height: 22px; border-radius: 999px; background: #0ea5e9; color: #fff;
      border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.2);
      display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="error">카카오 지도를 불러오지 못했습니다. Kakao Developers의 JavaScript SDK 도메인에 현재 주소를 등록했는지 확인해 주세요.<ul>${markerHtml}</ul></div>
  <script>
    window.__GOAT_COURSE_MAP__ = {
      center: { lat: ${parsed.data.centerLat}, lng: ${parsed.data.centerLng} },
      level: ${parsed.data.level ?? 7},
      markers: ${markerJson}
    };
  </script>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoJavascriptKey)}&autoload=false"></script>
  <script>
    function showError() {
      document.getElementById("map").style.display = "none";
      document.getElementById("error").style.display = "block";
    }
    function renderMap() {
      if (!window.kakao || !window.kakao.maps) {
        showError();
        return;
      }
      kakao.maps.load(function () {
        var data = window.__GOAT_COURSE_MAP__;
        var container = document.getElementById("map");
        var map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(data.center.lat, data.center.lng),
          level: data.level
        });
        var bounds = new kakao.maps.LatLngBounds();
        var path = [];
        data.markers.forEach(function (marker) {
          var position = new kakao.maps.LatLng(marker.lat, marker.lng);
          bounds.extend(position);
          path.push(position);
          new kakao.maps.Marker({ map: map, position: position, title: marker.title || "" });
          new kakao.maps.CustomOverlay({
            map: map,
            position: position,
            yAnchor: 1.55,
            content: '<div class="badge">' + (marker.order || '') + '</div>'
          });
        });
        if (path.length > 1) {
          new kakao.maps.Polyline({
            map: map,
            path: path,
            strokeWeight: 4,
            strokeColor: "#0EA5E9",
            strokeOpacity: 0.85,
            strokeStyle: "solid"
          });
          map.setBounds(bounds);
        }
      });
    }
    window.addEventListener("error", showError);
    renderMap();
  </script>
</body>
</html>`);
});

router.post("/recommend-from-tags", recommendRateLimit, (req, res, next) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    next(
      new ApiError(
        400,
        "INVALID_REQUEST",
        "요청값이 올바르지 않습니다.",
        parsed.error.flatten(),
      ),
    );
    return;
  }

  if (parsed.data.debug && !isDebugEnabled) {
    next(new ApiError(403, "DEBUG_NOT_ALLOWED", "Debug responses are disabled."));
    return;
  }

  const mood = parsed.data.moodId
    ? moodCategories.find(({ id }) => id === parsed.data.moodId)
    : undefined;
  if (parsed.data.moodId && !mood) {
    next(new ApiError(400, "INVALID_MOOD_ID", "존재하지 않는 감성 ID입니다."));
    return;
  }

  const result = getRecommendations(
    mood?.id,
    parsed.data.preferences as TravelPreferences | undefined,
    parsed.data.excludeIds,
    {
      referenceCardId: parsed.data.referenceCardId,
      travelPurpose: parsed.data.travelPurpose,
      transportType: parsed.data.transportType,
      visitTime: parsed.data.visitTime,
      currentMonth: parsed.data.currentMonth,
      excludeIds: parsed.data.excludeIds,
      debug: parsed.data.debug,
    },
  );
  if (!result) {
    next(new ApiError(400, "INVALID_REQUEST", "추천 기준을 찾을 수 없습니다."));
    return;
  }

  res.json({
    success: true,
    code: "SUCCESS",
    message: "추천 장소를 조회했습니다.",
    data: {
      ...result,
    },
  });
});

router.post("/recommend-course", courseRateLimit, async (req, res, next) => {
  const parsed = courseRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    next(
      new ApiError(
        400,
        "INVALID_REQUEST",
        "코스 추천 요청값이 올바르지 않습니다.",
        parsed.error.flatten(),
      ),
    );
    return;
  }

  if (parsed.data.debug && !isDebugEnabled) {
    next(new ApiError(403, "DEBUG_NOT_ALLOWED", "Debug responses are disabled."));
    return;
  }

  if (parsed.data.llmModel && !allowedLlmModels.has(parsed.data.llmModel)) {
    next(new ApiError(400, "LLM_MODEL_NOT_ALLOWED", "The requested LLM model is not allowed."));
    return;
  }

  try {
    const result = await createGoatCourseRecommendation({
      ...parsed.data,
      llmModel: parsed.data.llmModel ?? defaultLlmModel,
    });
    if (result.status === "FAILED") {
      next(new ApiError(400, result.failReason ?? "COURSE_RECOMMENDATION_FAILED", result.message));
      return;
    }

    res.json({
      success: true,
      code: "SUCCESS",
      message: "하루 코스를 생성했습니다.",
      data: result,
    });
  } catch (error) {
    next(
      new ApiError(
        500,
        "COURSE_RECOMMENDATION_FAILED",
        error instanceof Error ? error.message : "하루 코스 생성 중 오류가 발생했습니다.",
      ),
    );
  }
});

router.get("/places/:id", (req, res, next) => {
  const place = getPlaceById(req.params.id);
  if (!place) {
    next(new ApiError(404, "PLACE_NOT_FOUND", "장소를 찾을 수 없습니다."));
    return;
  }

  res.json({
    success: true,
    code: "SUCCESS",
    message: "장소를 조회했습니다.",
    data: { place },
  });
});

export default router;
