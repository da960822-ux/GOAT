import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { API_BASE_URL, resolveApiUrl } from "@/src/config/api";

WebBrowser.maybeCompleteAuthSession();
const PROVIDER_KEY = "goat.auth.provider";

export type AuthProviderName = "kakao" | "google";
export type AuthUser = {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  provider?: AuthProviderName;
};

type MeResponse = { data?: { user?: Record<string, unknown> } };

function normalizeUser(payload: MeResponse, provider?: AuthProviderName): AuthUser | null {
  const user = payload.data?.user;
  if (!user || typeof user.id !== "string") return null;
  return {
    id: user.id,
    displayName: typeof user.displayName === "string" ? user.displayName : "GOAT 여행자",
    email: typeof user.email === "string" ? user.email : null,
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
    lastLoginAt: typeof user.lastLoginAt === "string" ? user.lastLoginAt : null,
    provider,
  };
}

type AuthValue = {
  session: AuthUser | null;
  loading: boolean;
  signIn: (provider: AuthProviderName, next?: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    if (!API_BASE_URL) { setSession(null); return null; }
    try {
      const response = await fetch(resolveApiUrl("/api/auth/me"), { credentials: "include", headers: { accept: "application/json" } });
      if (!response.ok) { setSession(null); return null; }
      const storedProvider = await AsyncStorage.getItem(PROVIDER_KEY);
      const user = normalizeUser(await response.json() as MeResponse, storedProvider === "kakao" || storedProvider === "google" ? storedProvider : undefined);
      setSession(user);
      return user;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  useEffect(() => { restoreSession().finally(() => setLoading(false)); }, [restoreSession]);

  const signIn = useCallback(async (provider: AuthProviderName, next = "/") => {
    await AsyncStorage.setItem(PROVIDER_KEY, provider);
    const callbackPath = `/login/callback?next=${encodeURIComponent(next)}`;
    const startUrl = `${resolveApiUrl(`/api/auth/${provider}/start`)}?redirect_to=${encodeURIComponent(callbackPath)}`;
    if (Platform.OS === "web") {
      window.location.assign(startUrl);
      return;
    }
    const callbackUrl = resolveApiUrl(callbackPath);
    const result = await WebBrowser.openAuthSessionAsync(startUrl, callbackUrl);
    if (result.type === "success") await restoreSession();
  }, [restoreSession]);

  const signOut = useCallback(async () => {
    try { await fetch(resolveApiUrl("/api/auth/logout"), { method: "POST", credentials: "include" }); }
    finally { await AsyncStorage.removeItem(PROVIDER_KEY); setSession(null); }
  }, []);

  const value = useMemo(() => ({ session, loading, signIn, signOut, restoreSession }), [loading, restoreSession, session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
