/**
 * usePlacePhoto
 *
 * Photo fetch priority:
 *   1. KorService2 firstimage (from getTourInfo — per-place official photo)
 *   2. PhotoGalleryService1 by contentId (when tour info has no firstimage)
 *   3. null imageUrl (show placeholder / gradient)
 *
 * PhotoGalleryService1 keyword search was removed — the API rejects free-form
 * Korean keywords with INVALID_REQUEST_PARAMETER_ERROR.
 */

import { useState, useEffect } from 'react';
import { getTourInfo } from '../services/ktoTourInfoApi';
import { KTOPhotoResult } from '../services/ktoPhotoApi';

export type { KTOPhotoResult };

interface UsePlacePhotoResult {
  photo: KTOPhotoResult | null;
  loading: boolean;
}

export function usePlacePhoto(
  placeName: string,
  primaryMood: string,
  moodTags: string[],
  city?: string
): UsePlacePhotoResult {
  const [photo, setPhoto] = useState<KTOPhotoResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPhoto(null);

    (async () => {
      try {
        // 1. KorService2 firstimage — most accurate per-place photo
        const tourInfo = await getTourInfo(placeName, city ?? '');
        if (!cancelled && tourInfo.imageUrl) {
          setPhoto({ imageUrl: tourInfo.imageUrl, source: 'KTO_PHOTO_API' });
          setLoading(false);
          return;
        }

        // 2. Photo gallery by contentId (if tour info found a contentId)
        if (tourInfo.contentId) {
          const { getPlacePhotoByContentId } = await import('../services/ktoPhotoApi');
          const result = await getPlacePhotoByContentId(tourInfo.contentId);
          if (!cancelled && result?.imageUrl) {
            setPhoto(result);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to null
      }

      if (!cancelled) {
        setPhoto({ imageUrl: null, source: 'fallback' });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeName, city]);

  return { photo, loading };
}
