import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Mood, PublicRecommendationData, PublicSelection, RecommendCourseData } from '@workspace/api-client-react';
import type { ReferenceCardId, RecommendationSelection } from '@workspace/travel-domain/catalog';
import { TravelPreferences, TravelOrigin } from '../types/preferences';
import type { RecommendationAttempt, RecommendationSession } from '../services/recommendationApi';

export type RecommendationMethod = RecommendationSelection['method'];

interface AppContextValue {
  selectedMood: Mood | null;
  selectedReferenceCardId: ReferenceCardId | null;
  recommendationMethod: RecommendationMethod | null;
  travelPreferences: TravelPreferences | null;
  recommendationSession: RecommendationSession | null;
  course: RecommendCourseData | null;
  pendingAttempt: RecommendationAttempt | null;
  origin: TravelOrigin | null;
  publicSelection: PublicSelection | null;
  publicRecommendation: PublicRecommendationData | null;
  setSelectedMood: (mood: Mood | null) => void;
  setSelectedReferenceCardId: (referenceCardId: ReferenceCardId | null) => void;
  setTravelPreferences: (prefs: TravelPreferences) => void;
  setRecommendationSession: (session: RecommendationSession | null) => void;
  setCourse: (course: RecommendCourseData | null) => void;
  setPendingAttempt: (attempt: RecommendationAttempt | null) => void;
  setOrigin: (origin: TravelOrigin | null) => void;
  setPublicSelection: (selection: PublicSelection | null) => void;
  setPublicRecommendation: (recommendation: PublicRecommendationData | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedReferenceCardId, setSelectedReferenceCardIdState] = useState<ReferenceCardId | null>(null);
  const [recommendationMethod, setRecommendationMethod] = useState<RecommendationMethod | null>(null);
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences | null>(null);
  const [recommendationSession, setRecommendationSession] = useState<RecommendationSession | null>(null);
  const [course, setCourse] = useState<RecommendCourseData | null>(null);
  const [pendingAttempt, setPendingAttempt] = useState<RecommendationAttempt | null>(null);
  const [origin, setOrigin] = useState<TravelOrigin | null>(null);
  const [publicSelection, setPublicSelection] = useState<PublicSelection | null>(null);
  const [publicRecommendation, setPublicRecommendation] = useState<PublicRecommendationData | null>(null);

  const selectMood = (mood: Mood | null) => {
    setSelectedMood(mood);
    setSelectedReferenceCardIdState(null);
    setRecommendationMethod(mood ? 'mood' : null);
  };

  const selectReference = (referenceCardId: ReferenceCardId | null) => {
    setSelectedReferenceCardIdState(referenceCardId);
    setSelectedMood(null);
    setRecommendationMethod(referenceCardId ? 'reference' : null);
  };


  return (
    <AppContext.Provider
      value={{
        selectedMood,
        selectedReferenceCardId,
        recommendationMethod,
        travelPreferences,
        recommendationSession,
        course,
        pendingAttempt,
        origin,
        publicSelection,
        publicRecommendation,
        setSelectedMood: selectMood,
        setSelectedReferenceCardId: selectReference,
        setTravelPreferences,
        setRecommendationSession,
        setCourse,
        setPendingAttempt,
        setOrigin,
        setPublicSelection,
        setPublicRecommendation,
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
