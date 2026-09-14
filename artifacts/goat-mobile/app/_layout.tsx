import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalHost } from "@rn-primitives/portal";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GoatMark } from "@/src/components/editorial/Brand";
import { AppProvider } from "@/src/context/AppContext";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { API_BASE_URL } from "@/src/config/api";
import { palette } from "@/src/theme/editorial";

setBaseUrl(API_BASE_URL || null);

// Korean copy is rendered across dozens of surfaces. Keep line breaks word-aware
// by default so a single screen does not mix glyph-level wrapping with balanced
// Hangul wrapping. Individual labels may still override these props when needed.
const TextWithDefaults = Text as unknown as { defaultProps?: Record<string, unknown> };
const textDefaults = TextWithDefaults.defaultProps ?? {};
TextWithDefaults.defaultProps = {
  ...textDefaults,
  lineBreakStrategyIOS: "hangul-word",
  textBreakStrategy: "balanced",
  android_hyphenationFrequency: "none",
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { loading, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const protectedRoute = ["/recommendations", "/profile"].some((path) => pathname.startsWith(path));
    if (!session && protectedRoute) router.replace({ pathname: "/login", params: { next: pathname } } as never);
  }, [loading, pathname, router, session]);

  if (loading) return <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: palette.forest, alignItems: "center", justifyContent: "center", gap: 18 }}><GoatMark /><ActivityIndicator color={palette.ivory} /><Text style={{ color: palette.ivory, fontFamily: "PretendardRegular", fontSize: 14 }}>여행의 결을 준비하고 있어요</Text></View>;

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ animation: "fade" }} />
      <Stack.Screen name="login/callback" options={{ animation: "fade" }} />
      <Stack.Screen name="mood-selection" />
      <Stack.Screen name="reference-selection" />
      <Stack.Screen name="travel-preference" />
      <Stack.Screen name="analyzing" options={{ animation: "fade" }} />
      <Stack.Screen name="results" />
      <Stack.Screen name="detail/[id]" />
      <Stack.Screen name="network-error" options={{ animation: "fade" }} />
      <Stack.Screen name="no-results" options={{ animation: "fade" }} />
      <Stack.Screen name="recommendations" />
      <Stack.Screen name="map" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="about" />
      <Stack.Screen name="guide" />
      <Stack.Screen name="data-source" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="contact" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PretendardRegular: require("@/assets/fonts/Pretendard-Regular.ttf"),
    PretendardSemiBold: require("@/assets/fonts/Pretendard-SemiBold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <AuthProvider><RootLayoutNav /></AuthProvider>
                <PortalHost />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
