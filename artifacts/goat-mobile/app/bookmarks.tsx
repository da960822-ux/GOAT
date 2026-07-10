import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Header } from '@/src/components/Header';
import { EmptyState } from '@/src/components/EmptyState';
import {
  getBookmarks,
  removeBookmark,
} from '@/src/services/bookmarkService';
import { useColors } from '@/hooks/useColors';
import type { Place } from '@/src/types/place';

export default function BookmarksScreen() {
  const router = useRouter();
  const colors = useColors();

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const savedPlaces = await getBookmarks();

    setPlaces(savedPlaces);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function handleRemove(placeId: string) {
    await removeBookmark(placeId);

    setPlaces((current) =>
      current.filter((item) => item.place_id !== placeId)
    );
  }

  if (!loading && places.length === 0) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background },
        ]}
      >
        <Header
          title="저장한 곳"
          onBack={() => router.back()}
        />

        <EmptyState
          title="아직 저장한 장소가 없어요"
          description="마음에 드는 장소의 북마크 버튼을 눌러 저장해보세요."
          actionLabel="감성 선택하러 가기"
          onAction={() => router.replace('/mood-selection')}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
    >
      <Header
        title="저장한 곳"
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.count,
            { color: colors.mutedForeground },
          ]}
        >
          저장한 장소 {places.length}곳
        </Text>

        {places.map((place) => {
          const imageUrl =
            typeof place.imageUrl === 'string'
              ? place.imageUrl
              : undefined;

          return (
            <TouchableOpacity
              key={place.place_id}
              style={[
                styles.card,
                {
                  backgroundColor: '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.82}
              onPress={() =>
                router.push({
                  pathname: '/detail/[id]',
                  params: {
                    id: place.place_id,
                  },
                })
              }
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.image,
                    { backgroundColor: colors.secondary },
                  ]}
                />
              )}

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <View style={styles.titleText}>
                    <Text
                      style={[
                        styles.name,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {place.place_name}
                    </Text>

                    <Text
                      style={[
                        styles.meta,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {place.city} · {place.place_type}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={(event) => {
                      event.stopPropagation();

                      Alert.alert(
                        '저장 취소',
                        '이 장소를 저장 목록에서 삭제할까요?',
                        [
                          {
                            text: '취소',
                            style: 'cancel',
                          },
                          {
                            text: '삭제',
                            style: 'destructive',
                            onPress: () =>
                              void handleRemove(place.place_id),
                          },
                        ]
                      );
                    }}
                  >
                    <Feather
                      name="trash-2"
                      size={17}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>

                <Text
                  style={[
                    styles.season,
                    { color: colors.primary },
                  ]}
                  numberOfLines={1}
                >
                  추천 계절 · {place.best_season}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  count: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 12,
  },

  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },

  image: {
    width: 104,
    minHeight: 112,
  },

  body: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
  },

  titleRow: {
    flexDirection: 'row',
    gap: 8,
  },

  titleText: {
    flex: 1,
  },

  name: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },

  meta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },

  season: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  removeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});