import {
  db,
  recommendationSessionPlacesTable,
  recommendationSessionsTable,
} from "@workspace/db";
import {
  getPlaceById,
} from "@workspace/travel-domain";
import { count, desc, eq } from "drizzle-orm";

export interface RecommendationExposureQuery {
  userId?: string;
  recentLimit?: number;
}

function countRecent(rows: Array<{ placeId: string }>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const row of rows) result[row.placeId] = (result[row.placeId] ?? 0) + 1;
  return result;
}

export class DbRecommendationExposureRepository {
  async getExposureStats(query: RecommendationExposureQuery) {
    const recentLimit = Math.max(1, Math.min(query.recentLimit ?? 20, 100));
    const recentRows = query.userId
      ? await db
          .select({ placeId: recommendationSessionPlacesTable.placeId })
          .from(recommendationSessionPlacesTable)
          .innerJoin(
            recommendationSessionsTable,
            eq(
              recommendationSessionPlacesTable.recommendationId,
              recommendationSessionsTable.id,
            ),
          )
          .where(eq(recommendationSessionsTable.userId, query.userId))
          .orderBy(desc(recommendationSessionPlacesTable.createdAt))
          .limit(recentLimit)
      : [];

    const totalRows = await db
      .select({
        placeId: recommendationSessionPlacesTable.placeId,
        total: count(),
      })
      .from(recommendationSessionPlacesTable)
      .groupBy(recommendationSessionPlacesTable.placeId);

    const totalExposureByPlaceId = Object.fromEntries(
      totalRows.map(({ placeId, total }) => [placeId, Number(total)]),
    );
    const themeTotals = new Map<string, number[]>();
    for (const row of totalRows) {
      const theme = getPlaceById(row.placeId)?.primary_mood;
      if (!theme) continue;
      const values = themeTotals.get(theme) ?? [];
      values.push(Number(row.total));
      themeTotals.set(theme, values);
    }
    const themeAverageExposure = Object.fromEntries(
      Array.from(themeTotals, ([theme, values]) => [
        theme,
        Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
      ]),
    );

    return {
      recentExposureByPlaceId: countRecent(recentRows),
      totalExposureByPlaceId,
      themeAverageExposure,
    };
  }
}

export const dbRecommendationExposureRepository = new DbRecommendationExposureRepository();
