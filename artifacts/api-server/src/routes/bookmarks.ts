import { Router, type IRouter } from "express";
import { bookmarksTable, db } from "@workspace/db";
import { getPlaceById } from "@workspace/travel-domain";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ApiError, getRequestId } from "../lib/api-response";
import { requireAuthenticatedUser } from "../lib/auth-context";

const router: IRouter = Router();
const bodySchema = z
  .object({ placeId: z.string().regex(/^GOAT-\d{3}$/) })
  .strict();

router.get("/bookmarks", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    const rows = await db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.userId, user.id))
      .orderBy(desc(bookmarksTable.createdAt));
    const items = rows.map((row) => {
      const place = getPlaceById(row.placeId);
      return {
        placeId: row.placeId,
        name: place?.place_name ?? row.placeNameAtSave,
        region: place?.city ?? row.regionAtSave ?? "",
        imageUrl: place?.imageUrl ?? null,
        bestSeasons: place?.best_season
          ? place.best_season
              .split(/[,/]/)
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        unavailable: !place,
        bookmarkedAt: row.createdAt.toISOString(),
      };
    });
    res.json({
      success: true,
      code: "SUCCESS",
      message: "Bookmarks loaded.",
      data: { items },
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/bookmarks", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success)
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid bookmark request.");
    const place = getPlaceById(parsed.data.placeId);
    if (!place) throw new ApiError(404, "PLACE_NOT_FOUND", "Place not found.");
    await db
      .insert(bookmarksTable)
      .values({
        userId: user.id,
        placeId: place.place_id,
        placeNameAtSave: place.place_name,
        regionAtSave: place.city,
      })
      .onConflictDoNothing({
        target: [bookmarksTable.userId, bookmarksTable.placeId],
      });
    res.json({
      success: true,
      code: "BOOKMARK_SAVED",
      message: "Bookmark saved.",
      data: { placeId: place.place_id, bookmarked: true },
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/bookmarks/:placeId/status", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    const [row] = await db
      .select({ placeId: bookmarksTable.placeId })
      .from(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.userId, user.id),
          eq(bookmarksTable.placeId, req.params.placeId),
        ),
      )
      .limit(1);
    res.json({
      success: true,
      code: "SUCCESS",
      message: "Bookmark status loaded.",
      data: { placeId: req.params.placeId, bookmarked: Boolean(row) },
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/bookmarks/:placeId", async (req, res, next) => {
  try {
    const user = await requireAuthenticatedUser(req);
    await db
      .delete(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.userId, user.id),
          eq(bookmarksTable.placeId, req.params.placeId),
        ),
      );
    res.json({
      success: true,
      code: "BOOKMARK_REMOVED",
      message: "Bookmark removed.",
      data: { placeId: req.params.placeId, bookmarked: false },
      requestId: getRequestId(req),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
