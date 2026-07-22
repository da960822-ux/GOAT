import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Mood, RecommendCourseData } from '@workspace/api-client-react';
import type { ReferenceCardId, RecommendationSelection } from '@workspace/travel-domain/catalog';
import { TravelPreferences, TravelOrigin } from '../types/preferences';
import type { RecommendationAttempt, RecommendationSession } from '../services/recommendationApi';

export type RecommendationMethod = RecommendationSelection['method'];

interface AppContextValue {
  selectedMood: Mood | null;
  recommendationMethod: RecommendationMethod | null;
  selectedReferenceCardId: ReferenceCardId | null;
  travelPreferences: TravelPreferences | null;
  recommendationSession: RecommendationSession | null;
  course: RecommendCourseData | null;
  pendingAttempt: RecommendationAttempt | null;
  origin: TravelOrigin | null;
  setSelectedMood: (mood: Mood | null) => void;
  setSelectedReferenceCardId: (referenceCardId: ReferenceCardId | null) => void;
  setTravelPreferences: (prefs: TravelPreferences) => void;
  setRecommendationSession: (session: RecommendationSession | null) => void;
  setCourse: (course: RecommendCourseData | null) => void;
  setPendingAttempt: (attempt: RecommendationAttempt | null) => void;
  setOrigin: (origin: TravelOrigin | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [recommendationMethod, setRecommendationMethod] = useState<RecommendationMethod | null>(null);
  const [selectedReferenceCardId, setSelectedReferenceCardIdState] = useState<ReferenceCardId | null>(null);
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences | null>(null);
  const [recommendationSession, setRecommendationSession] = useState<RecommendationSession | null>(null);
  const [course, setCourse] = useState<RecommendCourseData | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<RecommendationAttempt | null>(null);
  const [origin, setOrigin] = useState<TravelOrigin | null>(null);

  const selectMood = (mood: Mood | null) => {
    setSelectedMood(mood);
    setSelectedReferenceCardIdState(null);
    setRecommendationMethod(mood ? 'mood' : null);
  };

  const selectReferenceCard = (referenceCardId: ReferenceCardId | null) => {
    setSelectedReferenceCardIdState(referenceCardId);
    setSelectedMood(null);
    setRecommendationMethod(referenceCardId ? 'reference' : null);
  };

  return (
    <AppContext.Provider
      value={{
        selectedMood,
        recommendationMethod,
        selectedReferenceCardId,
        travelPreferences,
        recommendationSession,
        course,
        pendingAttempt,
        origin,
        setSelectedMood: selectMood,
        setSelectedReferenceCardId: selectReferenceCard,
        setTravelPreferences,
        setRecommendationSession,
        setCourse,
        setPendingAttempt,
        setOrigin,
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
