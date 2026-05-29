import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MoodCategory, RecommendationCard } from '../types/place';

interface AppContextValue {
  selectedMood: MoodCategory | null;
  recommendations: RecommendationCard[];
  setSelectedMood: (mood: MoodCategory) => void;
  setRecommendations: (cards: RecommendationCard[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedMood, setSelectedMood] = useState<MoodCategory | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([]);

  return (
    <AppContext.Provider value={{ selectedMood, recommendations, setSelectedMood, setRecommendations }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
