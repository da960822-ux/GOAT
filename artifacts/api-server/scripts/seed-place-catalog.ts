import { db, placePhotosTable, placesTable, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getPlaceMinimumDetail, goatPlacesDataset } from "@workspace/travel-domain";
import { getKtoEntity } from "../src/services/kto-official-tour-info";
import { getGooglePlacePhotoSelections } from "../src/services/google-place-photo-selections";
import { getCuratedPlacePhotos } from "../src/services/curated-place-photos";

const syntheticSources: Record<string, string[]> = {
  "GOAT-007": ["https://lifeisromance.co.kr/Jogakbam"],
  "GOAT-031": ["https://www.welfarehello.com/community/hometownNews/d8c29678-5088-4320-9c31-1ad33851fd3e"],
  "GOAT-035": ["https://mind-ddase.com/219", "https://v.daum.net/v/YJEamTEoW3"],
  "GOAT-041": ["https://www.travie.com/news/articleView.html?idxno=21488"],
};

const places = goatPlacesDataset.places;
const google = new Map(getGooglePlacePhotoSelections());

async function main() {
  const placeRows = places.map((place) => {
    const detail = getPlaceMinimumDetail(place);
    const kto = getKtoEntity(place.place_id);
    const externalIds = {
      ...(kto ? { ktoContentId: kto.contentId, ktoContentTypeId: kto.contentTypeId, ktoCanonicalName: kto.canonicalName } : {}),
      ...(google.has(place.place_id) ? { googlePlaceId: google.get(place.place_id)!.googlePlaceId } : {}),
    };
    return {
      placeId: place.place_id,
      placeName: place.place_name,
      city: place.city,
      regionGroup: place.region_group,
      placeType: place.place_type,
      primaryTheme: place.primaryTheme,
      moodTags: place.mood_tags ?? [],
      sceneTags: place.sceneTags ?? [],
      photoPoint: place.photo_point ?? null,
      purposeTags: place.purpose_tags ?? [],
      seasonTags: place.season_tags ?? [],
      bestTime: place.best_time ?? null,
      accessibility: place.accessibility ?? {},
      recommendationUse: place.recommendation_use ?? null,
      note: detail.visitCheck,
      // Keep the DB detail record useful even when live KTO enrichment is unavailable.
      // This sentence is derived only from the reviewed catalog fields.
      description: detail.description,
      address: place.address ?? null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      coordinateSource: place.coordinateSource ?? null,
      verificationStatus: place.verification_status ?? null,
      verificationItems: place.verification_items ?? null,
      sourceUrls: place.sourceUrls?.length ? place.sourceUrls : [detail.sourceUrl],
      sourceCheckedAt: place.source_checked_at ? new Date(place.source_checked_at) : new Date(detail.checkedAt),
      operatingCondition: place.operatingCondition ?? null,
      externalIds,
      isRecommendationCandidate: true,
      isCourseCandidate: true,
    };
  });

  await db.insert(placesTable).values(placeRows).onConflictDoUpdate({
    target: placesTable.placeId,
    set: {
      placeName: sql`excluded.place_name`,
      city: sql`excluded.city`,
      address: sql`excluded.address`,
      latitude: sql`excluded.latitude`,
      longitude: sql`excluded.longitude`,
      note: sql`excluded.note`,
      description: sql`excluded.description`,
      accessibility: sql`excluded.accessibility`,
      bestTime: sql`excluded.best_time`,
      seasonTags: sql`excluded.season_tags`,
      sourceUrls: sql`excluded.source_urls`,
      sourceCheckedAt: sql`excluded.source_checked_at`,
      externalIds: sql`excluded.external_ids`,
      isRecommendationCandidate: sql`excluded.is_recommendation_candidate`,
      isCourseCandidate: sql`excluded.is_course_candidate`,
      updatedAt: new Date(),
    },
  });

  const photoRows: Array<typeof placePhotosTable.$inferInsert> = [];
  for (const place of places) {
    const curated = getCuratedPlacePhotos(place.place_id);
    curated.forEach((photo, index) => photoRows.push({
      placeId: place.place_id,
      url: photo.url,
      provider: photo.provider,
      sourceRef: photo.sourceRef,
      attribution: photo.attribution ?? { label: "ⓒ한국관광공사", sourceUrl: "https://www.data.go.kr/data/15101914/openapi.do", author: photo.author },
      isHero: index === 0,
      photoType: "PHOTO",
      metadata: { keywords: photo.keywords ?? [], rightsConfirmed: photo.rightsConfirmed },
      isActive: true,
    }));
    const selection = google.get(place.place_id);
    selection?.candidateIndexes.forEach((candidateIndex, index) => photoRows.push({
      placeId: place.place_id,
      provider: "GOOGLE_PLACES",
      sourceRef: `google:${selection.googlePlaceId}:${candidateIndex}`,
      attribution: { label: "Google Maps", sourceUrl: `https://www.google.com/maps/search/?api=1&query=place_id:${selection.googlePlaceId}` },
      isHero: curated.length === 0 && index === 0,
      photoType: "PHOTO",
      metadata: { candidateIndex, mediaResolvedAtRequest: true },
      isActive: true,
    }));
    const sources = syntheticSources[place.place_id];
    if (sources) photoRows.push({
      placeId: place.place_id,
      storagePath: `assets/synthetic-place-reference/${place.place_id}.png`,
      provider: "OWNED",
      sourceRef: `synthetic-reference:${place.place_id}`,
      attribution: { label: "GOAT generated reference (synthetic)", sourceUrl: sources[0] },
      isHero: false,
      photoType: "SYNTHETIC_REFERENCE_ONLY",
      metadata: { referenceSources: sources, warning: "Generated visual reference; not an official place photograph." },
      isActive: true,
    });
  }
  if (photoRows.length) {
    await db.insert(placePhotosTable).values(photoRows).onConflictDoNothing();
  }
  console.log(`Seeded ${placeRows.length} places and ${photoRows.length} photo metadata rows.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
