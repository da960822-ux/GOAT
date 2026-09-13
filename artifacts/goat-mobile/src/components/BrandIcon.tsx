import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type BrandIconName =
  | "menu" | "notification" | "location" | "mood" | "home" | "recommend"
  | "map" | "bookmark" | "user" | "back" | "share" | "search" | "time"
  | "transport" | "crowd" | "course" | "like" | "dislike" | "warning"
  | "delete" | "logout" | "check" | "arrow-right" | "refresh" | "close"
  | "google" | "kakao" | "heart" | "people" | "car" | "bus" | "walk"
  | "leaf" | "camera" | "food" | "sun" | "info" | "database" | "image"
  | "mail" | "external" | "shield" | "zap" | "briefcase"
  | "notifications-outline" | "location-outline" | "sparkles-outline" | "map-outline" | "map-pin" | "bookmark-outline" | "person-outline" | "chevron-back" | "arrow-left" | "share-outline" | "time-outline" | "clock" | "car-outline" | "navigation" | "people-outline" | "users" | "heart-outline" | "bus-outline" | "walk-outline" | "leaf-outline" | "camera-outline" | "bicycle-outline" | "restaurant-outline" | "sunny-outline" | "partly-sunny-outline" | "cloudy-night-outline" | "checkmark" | "chevron-right" | "arrow-forward" | "alert-circle" | "alert-triangle" | "cloud-offline-outline" | "hourglass-outline" | "x" | "logo-google" | "chatbubble" | "mail-outline" | "image-outline" | "shield-checkmark-outline" | "external-link" | "calendar";

const aliases: Partial<Record<BrandIconName, BrandIconName>> = {
  "notifications-outline": "notification", "location-outline": "location", location: "location",
  "sparkles-outline": "recommend", "map-outline": "map", "map-pin": "location",
  "bookmark-outline": "bookmark", bookmark: "bookmark", "person-outline": "user",
  "chevron-back": "back", "arrow-left": "back", "share-outline": "share",
  "time-outline": "time", clock: "time", "car-outline": "car", navigation: "transport",
  "people-outline": "people", users: "people", "heart-outline": "heart",
  "bus-outline": "bus", "walk-outline": "walk", "leaf-outline": "leaf",
  "camera-outline": "camera", "bicycle-outline": "transport", "restaurant-outline": "food",
  "sunny-outline": "sun", "partly-sunny-outline": "sun", "cloudy-night-outline": "time",
  "checkmark": "check", "chevron-right": "arrow-right", "arrow-forward": "arrow-right",
  "share": "share", "alert-circle": "warning", "alert-triangle": "warning",
  "cloud-offline-outline": "warning", "hourglass-outline": "time", "x": "close",
  "logo-google": "google", chatbubble: "kakao", "mail-outline": "mail",
  "image-outline": "image", image: "image", "shield-checkmark-outline": "shield",
  "external-link": "external", calendar: "time",
};

// Use the platform's native symbol language on iOS for standard actions. Custom
// GOAT marks (course, mood, transport) keep their authored SVG on every platform.
const SF_SYMBOLS: Partial<Record<BrandIconName | string, SFSymbol>> = {
  menu: "line.3.horizontal", notification: "bell", location: "location", home: "house.fill",
  map: "map", bookmark: "bookmark", user: "person", back: "chevron.left", share: "square.and.arrow.up",
  search: "magnifyingglass", time: "clock", heart: "heart", camera: "camera", delete: "trash",
  check: "checkmark", close: "xmark", refresh: "arrow.clockwise", info: "info.circle", mail: "envelope",
  external: "arrow.up.right.square", warning: "exclamationmark.triangle", people: "person.2",
};

export function BrandIcon({ name, size = 24, color = "#173F36", filled = false, strokeWidth = 1.8, style, motion }:
  { name: BrandIconName | string; size?: number; color?: string; filled?: boolean; strokeWidth?: number; style?: StyleProp<ViewStyle>; motion?: "pulse" | "spin" }) {
  const reducedMotion = useReducedMotion();
  const motionValue = useSharedValue(0);
  React.useEffect(() => {
    cancelAnimation(motionValue);
    if (!motion || reducedMotion) {
      motionValue.value = 0;
      return;
    }
    if (motion === "spin") {
      motionValue.value = withRepeat(withTiming(360, { duration: 1400 }), -1, false);
    } else {
      motionValue.value = withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0, { duration: 650 })), -1, false);
    }
    return () => cancelAnimation(motionValue);
  }, [motion, reducedMotion, motionValue]);
  const motionStyle = useAnimatedStyle(() => motion === "spin"
    ? { transform: [{ rotate: `${motionValue.value}deg` }] }
    : motion === "pulse"
      ? { transform: [{ scale: 1 + motionValue.value * 0.08 }], opacity: 0.72 + motionValue.value * 0.28 }
      : {});
  const icon = aliases[name as BrandIconName] ?? name;
  const common = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const sfName = process.env.EXPO_OS === "ios" ? SF_SYMBOLS[icon] : undefined;
  if (sfName) {
    return <Animated.View style={[{ width: size, height: size }, style, motionStyle]}>
      <SymbolView name={sfName} tintColor={color} weight={filled ? "semibold" : "regular"} resizeMode="scaleAspectFit" style={{ width: size, height: size }} />
    </Animated.View>;
  }
  let content: React.ReactNode;
  switch (icon) {
    case "menu": content = <><Line x1="4" y1="7" x2="20" y2="7" {...common}/><Line x1="4" y1="12" x2="16" y2="12" {...common}/><Line x1="4" y1="17" x2="20" y2="17" {...common}/></>; break;
    case "notification": content = <><Path d="M6.5 17h11l-1.5-2.2V10a4 4 0 0 0-8 0v4.8L6.5 17Z" {...common}/><Path d="M10 19a2.2 2.2 0 0 0 4 0" {...common}/></>; break;
    case "location": content = <><Path d="M12 21s7-6.2 7-11.6a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z" {...common} fill={filled ? color : "none"}/><Circle cx="12" cy="9.5" r="2.35" {...common} fill={filled ? "transparent" : "none"}/></>; break;
    case "home": content = <><Path d="m3.5 10.5 8.5-7 8.5 7v9.2a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3Z" {...common} fill={filled ? color : "none"}/><Path d="M9.2 20.5v-6h5.6v6" {...common}/></>; break;
    case "recommend": case "mood": content = <><Path d="m12 2.8 1.75 5.45L19.2 10l-5.45 1.75L12 17.2l-1.75-5.45L4.8 10l5.45-1.75Z" {...common} fill={filled ? color : "none"}/><Path d="m19.3 15 .72 2.2 2.18.8-2.18.72-.72 2.28-.76-2.28-2.14-.72 2.14-.8Z" {...common} fill={filled ? color : "none"}/></>; break;
    case "map": content = <><Path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" {...common} fill={filled ? color : "none"}/><Line x1="9" y1="3" x2="9" y2="18" {...common}/><Line x1="15" y1="6" x2="15" y2="21" {...common}/></>; break;
    case "bookmark": content = <Path d="M7 4.5h10v16l-5-3.2L7 20.5Z" {...common} fill={filled ? color : "none"}/>; break;
    case "user": content = <><Circle cx="12" cy="8" r="3.5" {...common}/><Path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" {...common} fill={filled ? color : "none"}/></>; break;
    case "back": content = <><Polyline points="14.5 5 7.5 12 14.5 19" {...common}/></>; break;
    case "arrow-right": content = <><Line x1="5" y1="12" x2="19" y2="12" {...common}/><Polyline points="14 7 19 12 14 17" {...common}/></>; break;
    case "share": content = <><Circle cx="18" cy="5" r="2" {...common}/><Circle cx="6" cy="12" r="2" {...common}/><Circle cx="18" cy="19" r="2" {...common}/><Line x1="8" y1="11" x2="16" y2="6" {...common}/><Line x1="8" y1="13" x2="16" y2="18" {...common}/></>; break;
    case "search": content = <><Circle cx="10.5" cy="10.5" r="6" {...common}/><Line x1="15" y1="15" x2="20" y2="20" {...common}/></>; break;
    case "time": content = <><Circle cx="12" cy="12" r="8.5" {...common}/><Polyline points="12 7 12 12 15.5 14" {...common}/></>; break;
    case "transport": case "car": content = <><Path d="M4 14h16l-2-6H7l-3 6v4h2m12 0h2v-4" {...common}/><Circle cx="7" cy="17" r="1.5" {...common}/><Circle cx="17" cy="17" r="1.5" {...common}/></>; break;
    case "bus": content = <><Rect x="5" y="3" width="14" height="17" rx="3" {...common}/><Line x1="5" y1="13" x2="19" y2="13" {...common}/><Circle cx="8" cy="17" r="1" fill={color}/><Circle cx="16" cy="17" r="1" fill={color}/></>; break;
    case "walk": content = <><Circle cx="13" cy="4.5" r="1.8" {...common}/><Path d="m11 9 3-1 2 4 3 1m-7-4-2 5-4 3m7-4-1 4-3 4m4-4 4 4" {...common}/></>; break;
    case "people": content = <><Circle cx="9" cy="8" r="3" {...common}/><Circle cx="17" cy="9" r="2.3" {...common}/><Path d="M3 20c.7-4 2.7-6 6-6s5.3 2 6 6m1-5c2.7.2 4.3 1.8 5 4.5" {...common}/></>; break;
    case "heart": content = <Path d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5C4 5.8 6 4 8.5 4c1.5 0 2.8.8 3.5 2  .7-1.2 2-2 3.5-2C18 4 20 5.8 20 8.5Z" {...common} fill={filled ? color : "none"}/>; break;
    case "leaf": content = <><Path d="M20 4C10 4 5 9 5 16c4 2 11 1 15-12Z" {...common}/><Path d="M5 20c3-6 7-9 12-12" {...common}/></>; break;
    case "camera": content = <><Path d="M4 8h4l1.5-2h5L16 8h4v11H4Z" {...common}/><Circle cx="12" cy="13.5" r="3.3" {...common}/></>; break;
    case "food": content = <><Path d="M7 3v8m-3-8v5c0 2 1 3 3 3s3-1 3-3V3m-3 8v10m10-18v18m0-18c-3 3-3 8 0 10" {...common}/></>; break;
    case "sun": content = <><Circle cx="12" cy="12" r="4" {...common}/><Path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" {...common}/></>; break;
    case "course": content = <><Path d="M6 18c1.1-3.8 2.9-5.9 5.3-5.9 2.7 0 2.5-4.2 6.7-6.1" {...common} strokeWidth={Math.max(strokeWidth, 2.1)}/><Circle cx="6" cy="18" r="2.9" {...common} fill={filled ? color : "none"}/><Circle cx="18" cy="6" r="2.9" {...common} fill={filled ? color : "none"}/><Circle cx="6" cy="18" r=".9" fill={filled ? "#FFFFFF" : color}/><Circle cx="18" cy="6" r=".9" fill={filled ? "#FFFFFF" : color}/></>; break;
    case "like": case "dislike": content = <Path d={icon === "like" ? "M8 20H4V9h4m0 11h9l3-8c.5-1.8-.5-3-2-3h-4l1-4c.2-1.2-.6-2-1.5-2L8 9Z" : "M8 4H4v11h4m0-11h9l3 8c.5 1.8-.5 3-2 3h-4l1 4c.2 1.2-.6 2-1.5 2L8 15Z"} {...common}/>; break;
    case "delete": content = <><Path d="M5 7h14M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6m4-6v6" {...common}/></>; break;
    case "logout": content = <><Path d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9" {...common}/></>; break;
    case "refresh": content = <><Path d="M20 7v5h-5M4 17v-5h5" {...common}/><Path d="M18.5 11A7 7 0 0 0 6 7m0 10a7 7 0 0 0 12-4" {...common}/></>; break;
    case "check": content = <Polyline points="5 12.5 10 17 19 7" {...common}/>; break;
    case "close": content = <><Line x1="6" y1="6" x2="18" y2="18" {...common}/><Line x1="18" y1="6" x2="6" y2="18" {...common}/></>; break;
    case "google": content = <Path d="M20 12.2c0-.7-.1-1.4-.2-2H12v3.7h4.5a3.9 3.9 0 0 1-1.7 2.5v2.5h2.8c1.6-1.5 2.4-3.8 2.4-6.7ZM12 20c2.3 0 4.2-.8 5.6-2l-2.8-2.2c-.8.5-1.7.8-2.8.8-2.2 0-4.1-1.5-4.8-3.5H4.4v2.3A8.5 8.5 0 0 0 12 20Zm-4.8-6.9A5 5 0 0 1 7 12c0-.4.1-.8.2-1.2V8.5H4.4A8.5 8.5 0 0 0 3.5 12c0 1.3.3 2.5.9 3.5l2.8-2.4ZM12 7.4c1.3 0 2.4.4 3.3 1.3l2.5-2.5A8.3 8.3 0 0 0 4.4 8.5l2.8 2.3c.7-2 2.6-3.4 4.8-3.4Z" fill={color}/>; break;
    case "kakao": content = <><Path d="M12 5c-4.7 0-8.5 2.8-8.5 6.3 0 2.2 1.5 4.1 3.8 5.2L6.5 20l4-2.5 1.5.1c4.7 0 8.5-2.8 8.5-6.3S16.7 5 12 5Z" fill={color}/></>; break;
    case "warning": content = <><Path d="m12 3 9 17H3Z" {...common}/><Line x1="12" y1="9" x2="12" y2="14" {...common}/><Circle cx="12" cy="17" r=".7" fill={color}/></>; break;
    case "info": content = <><Circle cx="12" cy="12" r="9" {...common}/><Line x1="12" y1="10.5" x2="12" y2="17" {...common}/><Circle cx="12" cy="7.5" r=".8" fill={color}/></>; break;
    case "zap": content = <Polyline points="13 2 4.5 13 11 13 10 22 19.5 10 13 10 13 2" {...common}/>; break;
    case "briefcase": content = <><Rect x="3" y="7" width="18" height="13" rx="2" {...common}/><Path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" {...common}/></>; break;
    case "database": content = <><Path d="M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0Zm0 0c0 2 16 2 16 0M4 12c0 2 16 2 16 0" {...common}/></>; break;
    case "image": content = <><Rect x="3" y="4" width="18" height="16" rx="2" {...common}/><Circle cx="9" cy="9" r="2" {...common}/><Path d="m4 18 5-5 3 3 3-4 5 6" {...common}/></>; break;
    case "mail": content = <><Rect x="3" y="5" width="18" height="14" rx="2" {...common}/><Path d="m4 7 8 6 8-6" {...common}/></>; break;
    case "shield": content = <><Path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6Z" {...common}/><Polyline points="8.5 12 11 14.5 16 9.5" {...common}/></>; break;
    case "external": content = <><Path d="M13 5H5v14h14v-8" {...common}/><Path d="M14 4h6v6m0-6-9 9" {...common}/></>; break;
    default: content = null;
  }
  return <Animated.View style={[{ width: size, height: size }, style, motionStyle]}><Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={true} focusable={false}>{content}</Svg></Animated.View>;
}
