import { useState, useEffect } from 'react';
import { getVisitConcentration } from '../services/ktoVisitApi';
import { KTOVisitConcentration } from '../services/ktoTypes';

interface UseVisitConcentrationResult {
  concentration: KTOVisitConcentration | null;
  loading: boolean;
}

export function useVisitConcentration(
  placeName: string,
  contentId?: string
): UseVisitConcentrationResult {
  const [concentration, setConcentration] = useState<KTOVisitConcentration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setConcentration(null);

    getVisitConcentration(placeName, contentId).then((result) => {
      if (!cancelled) {
        setConcentration(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [placeName]);

  return { concentration, loading };
}
