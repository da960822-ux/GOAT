import React from "react";
import { Pressable, type PressableProps, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A small physical press cue shared by buttons and list rows. */
export function MotionPressable({ style, onPressIn, onPressOut, ...props }: PressableProps) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(pressed.get() ? 0.86 : 1, { duration: reduced ? 0 : 120 }),
    transform: [{ scale: withTiming(pressed.get() ? 0.975 : 1, { duration: reduced ? 0 : 120 }) }],
  }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => { pressed.set(1); onPressIn?.(event); }}
      onPressOut={(event) => { pressed.set(0); onPressOut?.(event); }}
      style={[styles.base, style, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({ base: { minHeight: 44 } });
