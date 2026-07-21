import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Mood } from '@workspace/api-client-react';
import { RecommendationCard } from '../types/place';
import { TravelPreferences, TravelOrigin } from '../types/preferences';
import {
  createRecommendationSessionId,
  isSafeRecommendationId,
} from '../services/recommendationRequest';

interface AppContextValue {
  selectedMood: Mood | null;
  travelPreferences: TravelPreferences | null;
  recommendations: RecommendationCard[];
  origin: TravelOrigin | null;
  sessionId: string;
  lastRecommendationRequestId: string | null;
  setSelectedMood: (mood: Mood) => void;
  setTravelPreferences: (prefs: TravelPreferences) => void;
  setRecommendations: (cards: RecommendationCard[]) => void;
  setOrigin: (origin: TravelOrigin | null) => void;
  setLastRecommendationRequestId: (requestId: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const APP_STATE_STORAGE_KEY = '@goat/app-state-v2';
const VALID_COMPANIONS = new Set(['혼자', '연인', '친구', '가족']);
const VALID_TRANSPORTS = new Set(['자차', '대중교통', '도보중심']);
const VALID_PURPOSES = new Set([
  '사진·포토스팟',
  '산책·힐링',
  '카페·실내휴식',
  '전시·건축관람',
  '체험·액티비티',
  '먹거리·야간탐방',
  '숙소·리조트',
]);

type StoredAppState = {
  version: 2;
  selectedMood: Mood | null;
  travelPreferences: TravelPreferences | null;
  recommendations: RecommendationCard[];
  origin: TravelOrigin | null;
  sessionId: string;
  lastRecommendationRequestId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStoredAppState(value: unknown): value is StoredAppState {
  if (!isRecord(value) || value.version !== 2) return false;
  const moodValid = value.selectedMood === null || (
    isRecord(value.selectedMood) && typeof value.selectedMood.id === 'string'
  );
  const preferencesValid = value.travelPreferences === null || (
    isRecord(value.travelPreferences) &&
    VALID_COMPANIONS.has(String(value.travelPreferences.companion)) &&
    VALID_TRANSPORTS.has(String(value.travelPreferences.transport)) &&
    VALID_PURPOSES.has(String(value.travelPreferences.purpose))
  );
  const recommendationsValid = Array.isArray(value.recommendations) && value.recommendations.every((card) =>
    isRecord(card) && isRecord(card.place) && typeof card.place.place_id === 'string'
  );
  const originValid = value.origin === null || (
    isRecord(value.origin) && typeof value.origin.type === 'string'
  );
  const sessionValid = isSafeRecommendationId(value.sessionId);
  const requestValid = value.lastRecommendationRequestId === null || (
    isSafeRecommendationId(value.lastRecommendationRequestId)
  );
  return moodValid && preferencesValid && recommendationsValid && originValid && sessionValid && requestValid;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [origin, setOrigin] = useState<TravelOrigin | null>(null);
  const [sessionId, setSessionId] = useState(createRecommendationSessionId);
  const [lastRecommendationRequestId, setLastRecommendationRequestId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(APP_STATE_STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!isStoredAppState(parsed)) return;
          setSelectedMood(parsed.selectedMood);
          setTravelPreferences(parsed.travelPreferences);
          setRecommendations(parsed.recommendations);
          setOrigin(parsed.origin);
          setSessionId(parsed.sessionId);
          setLastRecommendationRequestId(parsed.lastRecommendationRequestId);
        } catch {
          // 손상되거나 이전 버전인 저장값은 새 세션처럼 안전하게 무시한다.
        }
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: StoredAppState = {
      version: 2,
      selectedMood,
      travelPreferences,
      recommendations,
      origin,
      sessionId,
      lastRecommendationRequestId,
    };
    AsyncStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // 저장소 제한/시크릿 모드에서도 현재 세션 기능은 계속 동작해야 한다.
    });
  }, [hydrated, lastRecommendationRequestId, origin, recommendations, selectedMood, sessionId, travelPreferences]);

  if (!hydrated) return null;

  return (
    <AppContext.Provider
      value={{
        selectedMood,
        travelPreferences,
        recommendations,
        origin,
        sessionId,
        lastRecommendationRequestId,
        setSelectedMood,
        setTravelPreferences,
        setRecommendations,
        setOrigin,
        setLastRecommendationRequestId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
