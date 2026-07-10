import React, {
  useCallback,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { GoatLogo } from '@/src/components/GoatLogo';
import { useApp } from '@/src/context/AppContext';
import { getBookmarks } from '@/src/services/bookmarkService';
import {
  getRecentRecommendation,
  type RecentRecommendation,
} from '@/src/services/recentRecommendationService';
import type { Place } from '@/src/types/place';

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const {
    setSelectedMood,
    setTravelPreferences,
    setRecommendations,
    setOrigin,
  } = useApp();

  const [recent, setRecent] =
    useState<RecentRecommendation | null>(null);

  const [bookmarks, setBookmarks] =
    useState<Place[]>([]);

  const topPad =
    Platform.OS === 'web'
      ? 67
      : insets.top;

  const bottomPad =
    Platform.OS === 'web'
      ? 34
      : insets.bottom;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([
        getRecentRecommendation(),
        getBookmarks(),
      ]).then(([recentValue, savedPlaces]) => {
        if (!active) {
          return;
        }

        setRecent(recentValue);
        setBookmarks(savedPlaces.slice(0, 3));
      });

      return () => {
        active = false;
      };
    }, [])
  );

  function handleContinue() {
    if (!recent) {
      return;
    }

    setSelectedMood(recent.mood);

    if (recent.preferences) {
      setTravelPreferences(recent.preferences);
    }

    setRecommendations(recent.recommendations);
    setOrigin(recent.origin);

    router.push('/results');
  }

  const recentTitle =
    recent?.recommendations?.[0]?.place?.place_name;

  const recentDate = recent
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'long',
        day: 'numeric',
      }).format(new Date(recent.savedAt))
    : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomPad + 28,
        }}
      >
        <ImageBackground
          source={require('@/assets/images/hero-landing.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.overlay} />

          <View
            style={[
              styles.heroContent,
              { paddingTop: topPad + 24 },
            ]}
          >
            <View style={styles.logoRow}>
              <GoatLogo
                variant="badge"
                size="md"
                theme="dark"
              />
            </View>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTagline}>
                해외여행 같은 장면을{'\n'}
                강원에서 찾아보세요
              </Text>

              <Text style={styles.heroSub}>
                오늘 끌리는 감성 하나면 충분해요
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.bottom}>
          <Text
            style={[
              styles.subcopy,
              { color: colors.mutedForeground },
            ]}
          >
            감성을 고르면 그 장면을 가장 닮은{'\n'}
            강원 명소 3곳을 조용히 골라드려요.
          </Text>

          <TouchableOpacity
            style={[
              styles.cta,
              { backgroundColor: colors.primary },
            ]}
            onPress={() =>
              router.push('/mood-selection')
            }
            activeOpacity={0.88}
            testID="landing-cta"
          >
            <Text style={styles.ctaText}>
              오늘의 감성 찾기
            </Text>
          </TouchableOpacity>

          {recent &&
            recent.recommendations.length >= 3 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    최근 추천
                  </Text>

                  <Text
                    style={[
                      styles.sectionMeta,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {recentDate}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.recentCard,
                    {
                      backgroundColor: colors.secondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleContinue}
                  activeOpacity={0.82}
                >
                  <View style={styles.recentIcon}>
                    <Feather
                      name="clock"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.recentText}>
                    <Text
                      style={[
                        styles.recentMood,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {recent.mood.name}
                    </Text>

                    <Text
                      style={[
                        styles.recentPlace,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {recentTitle} 외 2곳
                    </Text>
                  </View>

                  <View style={styles.continueRow}>
                    <Text
                      style={[
                        styles.continueText,
                        { color: colors.primary },
                      ]}
                    >
                      이어보기
                    </Text>

                    <Feather
                      name="chevron-right"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.foreground },
                ]}
              >
                저장한 곳
              </Text>

              <TouchableOpacity
                onPress={() =>
                  router.push('/bookmarks')
                }
              >
                <Text
                  style={[
                    styles.sectionLink,
                    { color: colors.primary },
                  ]}
                >
                  전체보기
                </Text>
              </TouchableOpacity>
            </View>

            {bookmarks.length > 0 ? (
              bookmarks.map((place) => (
                <TouchableOpacity
                  key={place.place_id}
                  style={[
                    styles.savedRow,
                    {
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/detail/[id]',
                      params: {
                        id: place.place_id,
                      },
                    })
                  }
                >
                  <View
                    style={[
                      styles.savedIcon,
                      {
                        backgroundColor: colors.secondary,
                      },
                    ]}
                  >
                    <Feather
                      name="bookmark"
                      size={15}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.savedText}>
                    <Text
                      style={[
                        styles.savedName,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {place.place_name}
                    </Text>

                    <Text
                      style={[
                        styles.savedMeta,
                        {
                          color:
                            colors.mutedForeground,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {place.city} · {place.place_type}
                    </Text>
                  </View>

                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                style={[
                  styles.emptySaved,
                  { borderColor: colors.border },
                ]}
                onPress={() =>
                  router.push('/mood-selection')
                }
              >
                <Feather
                  name="bookmark"
                  size={18}
                  color={colors.mutedForeground}
                />

                <Text
                  style={[
                    styles.emptySavedText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  아직 저장한 장소가 없어요
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.serviceLink}
            onPress={() =>
              router.push('/service')
            }
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.serviceLinkText,
                { color: colors.mutedForeground },
              ]}
            >
              서비스 안내
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },

  hero: {
    height: 340,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 6, 58, 0.52)',
  },

  heroContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },

  logoRow: {
    flexDirection: 'row',
  },

  heroTextBlock: {
    gap: 10,
  },

  heroTagline: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    lineHeight: 42,
    letterSpacing: 0.2,
  },

  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
  },

  bottom: {
    paddingHorizontal: 28,
    paddingTop: 32,
  },

  subcopy: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 32,
  },

  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 28,
  },

  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  section: {
    marginBottom: 26,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },

  sectionMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },

  sectionLink: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    gap: 12,
  },

  recentIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentText: {
    flex: 1,
  },

  recentMood: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },

  recentPlace: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },

  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  continueText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },

  savedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  savedText: {
    flex: 1,
  },

  savedName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },

  savedMeta: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },

  emptySaved: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 20,
  },

  emptySavedText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },

  serviceLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },

  serviceLinkText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
  },
});