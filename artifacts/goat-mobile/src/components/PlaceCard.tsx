import React, {
  useEffect,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

import type {
  RecommendationCard,
} from '@/src/types/place';
import { RecommendationRoleBadge } from './RecommendationRoleBadge';
import { openKakaoMap } from '@/src/services/mapLink';
import { getRegionPalette } from '@/src/utils/regionColors';
import {
  getFeedback,
  removeFeedback,
  saveFeedback,
  type DislikeReason,
  type FeedbackType,
} from '@/src/services/feedbackService';
import { useColors } from '@/hooks/useColors';
import { usePlacePhoto } from '@/src/hooks/usePlacePhoto';
import {
  useVisitConcentration,
} from '@/src/hooks/useVisitConcentration';

interface PlaceCardProps {
  card: RecommendationCard;
  onPress?: () => void;
}

const CROWD_CHIP: Record<
  string,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
  }
> = {
  low: {
    label: '방문 여유',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#166534',
  },

  medium: {
    label: '보통',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
  },

  high: {
    label: '방문 집중 예상',
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#9F1239',
  },
};

function getPhotoSource(
  photo: NonNullable<
    ReturnType<
      typeof usePlacePhoto
    >['photo']
  >
) {
  return (
    photo.imageSource ?? {
      uri: photo.imageUrl!,
    }
  );
}

export function PlaceCard({
  card,
  onPress,
}: PlaceCardProps) {
  const {
    place,
    role,
    reason,
  } = card;

  const colors = useColors();

  const [
    feedback,
    setFeedback,
  ] = useState<FeedbackType | null>(
    null
  );

  const region = getRegionPalette(
    place.region_group
  );

  const {
    photo,
    loading: photoLoading,
  } = usePlacePhoto(
    place.place_name,
    place.primary_mood,
    place.mood_tags,
    place.city
  );

  const {
    concentration,
  } = useVisitConcentration(
    place.place_name,
    place.city
  );

  const crowdChip =
    concentration?.concentrationLevel
      ? CROWD_CHIP[
          concentration.concentrationLevel
        ]
      : null;

  async function handleKakaoMap() {
    try {
      await openKakaoMap(place);
    } catch {
      Alert.alert(
        '카카오맵을 열 수 없어요.',
        '잠시 후 다시 시도해주세요.'
      );
    }
  }

  const timeShort =
    place.best_time.length > 14
      ? place.best_time.slice(0, 14) +
        '…'
      : place.best_time;

  const hasPhoto =
    !photoLoading &&
    Boolean(
      photo?.imageUrl ||
      photo?.imageSource
    );

  useEffect(() => {
    getFeedback(
      place.place_id
    ).then((value) => {
      setFeedback(
        value?.type ?? null
      );
    });
  }, [place.place_id]);

  async function handleLike() {
    if (feedback === 'LIKE') {
      await removeFeedback(
        place.place_id
      );

      setFeedback(null);
      return;
    }

    await saveFeedback(
      place.place_id,
      'LIKE'
    );

    setFeedback('LIKE');
  }

  function handleDislike() {
    if (
      feedback === 'DISLIKE'
    ) {
      void removeFeedback(
        place.place_id
      ).then(() => {
        setFeedback(null);
      });

      return;
    }

    const reasons: Array<{
      text: string;
      code: DislikeReason;
    }> = [
      {
        text: '너무 멀어요',
        code: 'TOO_FAR',
      },
      {
        text:
          '원하는 분위기가 아니에요',
        code: 'NOT_MY_MOOD',
      },
      {
        text: '교통이 불편해요',
        code:
          'TRANSPORT_DIFFICULT',
      },
      {
        text: '이미 가본 곳이에요',
        code: 'ALREADY_VISITED',
      },
      {
        text:
          '사람이 많을 것 같아요',
        code: 'TOO_CROWDED',
      },
    ];

    Alert.alert(
      '추천이 아쉬운 이유',
      '선택한 내용은 이 기기에 임시 저장됩니다.',
      [
        ...reasons.map((item) => ({
          text: item.text,

          onPress: () =>
            void saveFeedback(
              place.place_id,
              'DISLIKE',
              item.code
            ).then(() => {
              setFeedback(
                'DISLIKE'
              );
            }),
        })),

        {
          text: '취소',
          style: 'cancel',
        },
      ]
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            '#FAFAF9',
          borderColor:
            colors.border,
        },
      ]}
    >
      {(hasPhoto ||
        photoLoading) ? (
        <View
          style={[
            styles.thumbWrap,
            {
              backgroundColor:
                region.bg,
            },
          ]}
        >
          {hasPhoto && (
            <Image
              source={getPhotoSource(
                photo!
              )}
              style={styles.thumb}
              contentFit="cover"
              transition={300}
            />
          )}

          {photoLoading && (
            <View
              style={[
                styles.thumbSkeleton,
                {
                  backgroundColor:
                    region.bg,
                },
              ]}
            />
          )}

          <View
            style={styles.thumbFade}
          />

          {hasPhoto &&
            (
              photo?.source ===
                'KTO_PHOTO_API' ||
              photo?.source ===
                'LOCAL_PLACE_IMAGE'
            ) && (
              <View
                style={
                  styles.photoSourceBadge
                }
              >
                <Text
                  style={
                    styles.photoSourceText
                  }
                >
                  {photo.source ===
                  'LOCAL_PLACE_IMAGE'
                    ? '보조 이미지'
                    : '관광사진 기반'}
                </Text>
              </View>
            )}
        </View>
      ) : (
        <View
          style={[
            styles.thumbFallback,
            {
              backgroundColor:
                region.bg,
              borderBottomColor:
                region.border,
            },
          ]}
        />
      )}

      <View style={styles.body}>
        <View
          style={styles.topRow}
        >
          <RecommendationRoleBadge
            role={role}
          />

          <View
            style={styles.topRight}
          >
            {crowdChip && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      crowdChip.bg,
                    borderColor:
                      crowdChip.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        crowdChip.text,
                    },
                  ]}
                >
                  {crowdChip.label}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.regionBadge,
                {
                  backgroundColor:
                    region.bg,
                  borderColor:
                    region.border,
                },
              ]}
            >
              <View
                style={[
                  styles.regionDot,
                  {
                    backgroundColor:
                      region.accent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.regionLabel,
                  {
                    color:
                      region.accent,
                  },
                ]}
              >
                {place.city}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.reason,
            {
              color:
                colors.foreground,
            },
          ]}
          numberOfLines={3}
        >
          {reason ||
            '선택한 여행 조건과 잘 맞는 장소예요.'}
        </Text>

        <View
          style={styles.nameRow}
        >
          <Text
            style={[
              styles.placeName,
              {
                color:
                  colors.foreground,
              },
            ]}
          >
            {place.place_name}
          </Text>

          <Text
            style={[
              styles.meta,
              {
                color:
                  colors.mutedForeground,
              },
            ]}
          >
            {place.place_type}
          </Text>
        </View>

        <View style={styles.tags}>
          {place.mood_tags
            .slice(0, 4)
            .map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  {
                    backgroundColor:
                      region.bg,
                    borderColor:
                      region.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color:
                        region.accent,
                    },
                  ]}
                >
                  #{tag}
                </Text>
              </View>
            ))}
        </View>

        <View
          style={styles.infoRow}
        >
          <InfoPill
            icon="clock"
            label={timeShort}
            color={
              colors.mutedForeground
            }
          />

          <InfoPill
            icon="calendar"
            label={
              place.best_season ||
              '계절 정보 없음'
            }
            color={
              colors.mutedForeground
            }
          />
        </View>

        {Boolean(place.note) && (
          <View
            style={[
              styles.cautionRow,
              {
                backgroundColor:
                  '#FFFBEB',
                borderColor:
                  '#FDE68A',
              },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={11}
              color="#D97706"
              style={{
                marginTop: 1,
              }}
            />

            <Text
              style={
                styles.cautionText
              }
              numberOfLines={2}
            >
              {place.note}
            </Text>
          </View>
        )}

        <View
          style={styles.feedbackRow}
        >
          <TouchableOpacity
            style={[
              styles.feedbackBtn,
              feedback === 'LIKE' &&
                styles.feedbackBtnActive,
            ]}
            onPress={handleLike}
            activeOpacity={0.75}
          >
            <Feather
              name="thumbs-up"
              size={13}
              color={
                feedback === 'LIKE'
                  ? colors.primary
                  : colors.mutedForeground
              }
            />

            <Text
              style={[
                styles.feedbackText,
                {
                  color:
                    feedback ===
                    'LIKE'
                      ? colors.primary
                      : colors.mutedForeground,
                },
              ]}
            >
              좋아요
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.feedbackBtn,
              feedback ===
                'DISLIKE' &&
                styles.feedbackBtnActive,
            ]}
            onPress={handleDislike}
            activeOpacity={0.75}
          >
            <Feather
              name="thumbs-down"
              size={13}
              color={
                feedback ===
                'DISLIKE'
                  ? colors.primary
                  : colors.mutedForeground
              }
            />

            <Text
              style={[
                styles.feedbackText,
                {
                  color:
                    feedback ===
                    'DISLIKE'
                      ? colors.primary
                      : colors.mutedForeground,
                },
              ]}
            >
              별로예요
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                colors.border,
            },
          ]}
        />

        <View
          style={styles.actions}
        >
          <TouchableOpacity
            style={styles.kakaoBtn}
            onPress={handleKakaoMap}
            activeOpacity={0.82}
          >
            <Feather
              name="navigation"
              size={13}
              color="#3A1D00"
            />

            <Text
              style={
                styles.kakaoBtnText
              }
            >
              카카오맵
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailLink}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.detailLinkText,
                {
                  color:
                    colors.primary,
                },
              ]}
            >
              장소 열어보기
            </Text>

            <Feather
              name="arrow-right"
              size={13}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function InfoPill({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.infoPill}>
      <Feather
        name={icon as any}
        size={11}
        color={color}
      />

      <Text
        style={[
          styles.infoPillText,
          { color },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const THUMB_HEIGHT = 152;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  thumbWrap: {
    width: '100%',
    height: THUMB_HEIGHT,
    position: 'relative',
  },

  thumb: {
    width: '100%',
    height: THUMB_HEIGHT,
  },

  thumbSkeleton: {
    width: '100%',
    height: THUMB_HEIGHT,
    opacity: 0.5,
  },

  thumbFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor:
      'rgba(250,250,249,0.55)',
  },

  photoSourceBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor:
      'rgba(0,0,0,0.38)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  photoSourceText: {
    fontSize: 10,
    fontFamily:
      'Inter_400Regular',
    color: '#FFFFFF',
  },

  thumbFallback: {
    height: 6,
    borderBottomWidth: 1,
  },

  body: {
    padding: 18,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },

  chipText: {
    fontSize: 11,
    fontFamily:
      'Inter_600SemiBold',
  },

  regionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },

  regionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  regionLabel: {
    fontSize: 11,
    fontFamily:
      'Inter_500Medium',
  },

  reason: {
    fontSize: 14,
    fontFamily:
      'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 12,
  },

  nameRow: {
    marginBottom: 10,
  },

  placeName: {
    fontSize: 19,
    fontWeight: '700',
    fontFamily:
      'Inter_700Bold',
    marginBottom: 2,
  },

  meta: {
    fontSize: 12,
    fontFamily:
      'Inter_400Regular',
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },

  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },

  tagText: {
    fontSize: 11,
    fontFamily:
      'Inter_400Regular',
  },

  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },

  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  infoPillText: {
    fontSize: 12,
    fontFamily:
      'Inter_400Regular',
  },

  cautionRow: {
    flexDirection: 'row',
    alignItems:
      'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 9,
    padding: 8,
    marginBottom: 10,
  },

  cautionText: {
    flex: 1,
    fontSize: 11,
    fontFamily:
      'Inter_400Regular',
    lineHeight: 17,
    color: '#92400E',
  },

  feedbackRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor:
      '#F5F5F4',
  },

  feedbackBtnActive: {
    backgroundColor:
      '#EEEAFD',
  },

  feedbackText: {
    fontSize: 11,
    fontFamily:
      'Inter_600SemiBold',
  },

  divider: {
    height: 1,
    marginBottom: 12,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 5,
    backgroundColor:
      '#F7E600',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },

  kakaoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily:
      'Inter_700Bold',
    color: '#3A1D00',
  },

  detailLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'flex-end',
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },

  detailLinkText: {
    fontSize: 13,
    fontFamily:
      'Inter_600SemiBold',
  },
});