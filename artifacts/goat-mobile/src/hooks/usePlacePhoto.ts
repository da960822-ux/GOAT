/**
 * usePlacePhoto
 *
 * Photo fetch priority:
 *   1. PhotoGalleryService1 keyword search with city validation
 *   2. KorService2 firstimage (when the gallery has no matching photo)
 *   3. null imageUrl (show placeholder / gradient)
 *
 */

import { useState, useEffect } from 'react';
import { getTourInfo } from '../services/ktoTourInfoApi';
import { getPlacePhoto, KTOPhotoResult } from '../services/ktoPhotoApi';

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
        // 1. Curated tourism photo gallery with place/city validation
        const result = await getPlacePhoto(placeName, city ?? '');
        if (!cancelled && result.imageUrl) {
          setPhoto(result);
          setLoading(false);
          return;
        }

        // 2. KorService2 firstimage when the gallery has no match
        const tourInfo = await getTourInfo(placeName, city ?? '');
        if (!cancelled && tourInfo.imageUrl) {
          setPhoto({ imageUrl: tourInfo.imageUrl, source: 'KTO_PHOTO_API' });
          setLoading(false);
          return;
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
