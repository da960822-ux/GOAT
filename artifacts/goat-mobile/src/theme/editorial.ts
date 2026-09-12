import { Platform } from "react-native";

export const palette = {
  forest: "#173F36",
  forestDeep: "#0F302A",
  forestSoft: "#3F665C",
  ivory: "#F6F2E9",
  paper: "#FFFCF6",
  sage: "#DDE3DA",
  sageDark: "#526A60",
  line: "#D9D9CF",
  ink: "#18322D",
  muted: "#5B6962",
  white: "#FFFFFF",
  coral: "#E87A5D",
  kakao: "#FEE500",
  error: "#A3493F",
  errorSurface: "#FCECEA",
  errorBorder: "#E4B4AA",
};

export const fonts = {
  serif: "NotoSerifKR_600SemiBold",
  serifRegular: "NotoSerifKR_400Regular",
  body: "PretendardRegular",
  medium: "PretendardMedium",
  semibold: "PretendardSemiBold",
  bold: "PretendardBold",
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 };

export const shadow = Platform.select({
  ios: { shadowColor: "#102F28", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  android: { elevation: 4 },
  default: {},
});
