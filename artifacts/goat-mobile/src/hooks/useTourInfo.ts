import { useState, useEffect } from 'react';
import { getTourInfo } from '../services/ktoTourInfoApi';
import { KTOTourInfo } from '../services/ktoTypes';

interface UseTourInfoResult {
  info: KTOTourInfo | null;
  loading: boolean;
}

export function useTourInfo(placeName: string, city: string): UseTourInfoResult {
  const [info, setInfo] = useState<KTOTourInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!placeName.trim() || !city.trim()) {
      setInfo(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setInfo(null);

    getTourInfo(placeName, city).then((result) => {
      if (!cancelled) {
        setInfo(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeName, city]);

  return { info, loading };
}
