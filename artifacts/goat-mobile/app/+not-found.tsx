import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { fonts, palette, radius, spacing } from '@/src/theme/editorial';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.eyebrow, { backgroundColor: colors.secondary }]}><Text style={[styles.eyebrowText, { color: colors.primary }]}>GOAT</Text></View>
        <Text style={[styles.title, { color: colors.foreground }]}>
          This screen doesn&apos;t exist.
        </Text>

        <Link href="/" style={[styles.link, { backgroundColor: colors.primary }]} accessibilityRole="link">
          <Text style={[styles.linkText, { color: palette.paper }]}>
            Go to home screen!
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
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  linkText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  eyebrow: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.md },
  eyebrowText: { fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1.2 },
});
