import { useState, useEffect } from 'react';
import { getPlacePhoto, KTOPhotoResult } from '../services/ktoPhotoApi';

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

    getPlacePhoto(placeName, primaryMood, moodTags, city).then((result) => {
      if (!cancelled) {
        setPhoto(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeName]);

  return { photo, loading };
}
