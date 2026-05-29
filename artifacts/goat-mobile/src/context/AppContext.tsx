import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MoodCategory, RecommendationCard } from '../types/place';
import { TravelPreferences, TravelOrigin } from '../types/preferences';

interface AppContextValue {
  selectedMood: MoodCategory | null;
  travelPreferences: TravelPreferences | null;
  recommendations: RecommendationCard[];
  origin: TravelOrigin | null;
  setSelectedMood: (mood: MoodCategory) => void;
  setTravelPreferences: (prefs: TravelPreferences) => void;
  setRecommendations: (cards: RecommendationCard[]) => void;
  setOrigin: (origin: TravelOrigin | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMood, setSelectedMood] = useState<MoodCategory | null>(null);
  const [travelPreferences, setTravelPreferences] = useState<TravelPreferences | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);
  const [origin, setOrigin] = useState<TravelOrigin | null>(null);

  return (
    <AppContext.Provider
      value={{
        selectedMood,
        travelPreferences,
        recommendations,
        origin,
        setSelectedMood,
        setTravelPreferences,
        setRecommendations,
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
