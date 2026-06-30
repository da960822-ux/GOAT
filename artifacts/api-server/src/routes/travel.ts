import { Router, type IRouter } from "express";
import {
  getPlaceById,
  getRecommendations,
  moodCategories,
  type TravelPreferences,
} from "@workspace/travel-domain";
import { z } from "zod";
import { ApiError } from "../lib/api-response";

const router: IRouter = Router();

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
      })),
    },
  });
});

router.post("/recommend-from-tags", (req, res, next) => {
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
