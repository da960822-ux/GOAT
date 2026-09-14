import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
// Expo CLI loads .env.local automatically; mirror that behavior so a local
// release preflight does not report a false missing API URL.
const loadEnvValue = (name) => {
  const current = process.env[name];
  if (typeof current === "string" && current.trim()) return current.trim();
  for (const file of [".env", ".env.local"]) {
    const target = path.join(root, file);
    if (!fs.existsSync(target)) continue;
    const line = fs.readFileSync(target, "utf8").split(/\r?\n/).find((value) => value.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return "";
};
const app = readJson("app.json").expo;
const eas = readJson("eas.json");
const pkg = readJson("package.json");
const errors = [];
const warnings = [];

const requireValue = (value, label) => {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} 값이 비어 있습니다.`);
};

requireValue(app.android?.package, "Android package");
requireValue(app.extra?.eas?.projectId, "EAS projectId");
if (!Number.isInteger(app.android?.versionCode) || app.android.versionCode < 1) {
  errors.push("Android versionCode는 1 이상의 정수여야 합니다.");
}
if (eas.build?.production?.android?.buildType !== "app-bundle") {
  errors.push("production Android 빌드는 app-bundle이어야 합니다.");
}

const apiBaseUrl = loadEnvValue("EXPO_PUBLIC_API_BASE_URL");
if (!apiBaseUrl) errors.push("EXPO_PUBLIC_API_BASE_URL이 release 환경에 없습니다.");
else if (!apiBaseUrl.startsWith("https://")) errors.push("운영 API 주소는 HTTPS여야 합니다.");

if (pkg.dependencies?.["expo-location"] || pkg.devDependencies?.["expo-location"]) {
  errors.push("원스토어 출시 범위에 expo-location이 포함되어 있습니다.");
}
const appSource = fs.readdirSync(path.join(root, "app"), { recursive: true })
  .filter((name) => typeof name === "string" && name.endsWith(".tsx"))
  .map((name) => fs.readFileSync(path.join(root, "app", name), "utf8"))
  .join("\n");
if (/expo-location|requestForegroundPermissionsAsync|getCurrentPositionAsync|ACCESS_(FINE|COARSE)_LOCATION/.test(appSource)) {
  errors.push("앱 화면 코드에 현재 위치 권한 또는 GPS 호출이 남아 있습니다.");
}
if ((app.android?.permissions ?? []).some((value) => String(value).includes("LOCATION"))) {
  errors.push("app.json에 Android 위치 권한이 선언되어 있습니다.");
}
const blockedLocationPermissions = new Set(app.android?.blockedPermissions ?? []);
for (const permission of [
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
]) {
  if (!blockedLocationPermissions.has(permission)) {
    errors.push(`Android 위치 권한 차단 목록에 ${permission}이 없습니다.`);
  }
}

const pngSize = (relativePath) => {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};
const icon = pngSize(app.icon);
if (!icon || icon.width < 1024 || icon.height < 1024 || icon.width !== icon.height) {
  errors.push("앱 아이콘 원본은 정사각형 1024px 이상 PNG여야 합니다.");
}

const storeAssets = path.resolve(root, "../../..", "GOAT_원스토어_제출패키지");
const storeIcon = path.join(storeAssets, "graphics", "goat-onestore-icon-512.png");
const storeGraphic = path.join(storeAssets, "graphics", "goat-onestore-graphic-1024x578.jpg");
const storeScreenshots = path.join(storeAssets, "screenshots");
const storeIconSize = fs.existsSync(storeIcon)
  ? (() => {
      const buffer = fs.readFileSync(storeIcon);
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    })()
  : null;
if (!storeIconSize || storeIconSize.width !== 512 || storeIconSize.height !== 512) {
  errors.push("원스토어 아이콘은 512x512 PNG여야 합니다.");
}
if (!fs.existsSync(storeGraphic)) errors.push("원스토어 1024x578 프로모션 그래픽이 없습니다.");
const screenshotCount = fs.existsSync(storeScreenshots)
  ? fs.readdirSync(storeScreenshots).filter((name) => name.toLowerCase().endsWith(".png")).length
  : 0;
if (screenshotCount < 5) errors.push("원스토어 정상 화면 스크린샷이 5장 미만입니다.");
warnings.push("versionCode가 기존 원스토어 판매본보다 큰지는 개발자센터에서 확인해야 합니다.");
warnings.push("서명, target/min SDK, 64비트 ABI, 최종 권한은 생성한 AAB와 범용 APK로 확인해야 합니다.");

for (const message of warnings) console.warn(`WARN: ${message}`);
if (errors.length) {
  for (const message of errors) console.error(`ERROR: ${message}`);
  process.exit(1);
}
console.log("ONE store release configuration checks passed.");
