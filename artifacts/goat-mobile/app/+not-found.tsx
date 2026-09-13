import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { GoatMark } from "@/src/components/editorial/Brand";
import { fonts, palette, radius, spacing } from '@/src/theme/editorial';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "페이지를 찾을 수 없어요" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.mark, { backgroundColor: colors.secondary }]}><GoatMark /></View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          요청한 화면을 찾을 수 없어요.
        </Text>

        <Link href="/" style={[styles.link, { backgroundColor: colors.primary }]} accessibilityRole="link">
          <Text style={[styles.linkText, { color: palette.paper }]}>
            홈으로 돌아가기
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.serif,
    textAlign: 'center',
  },
  link: {
    marginTop: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  linkText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  mark: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, marginBottom: spacing.lg },
});
