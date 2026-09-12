import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const componentRoot = resolve(appRoot, "src/components/discovery");
const allowedPackages = new Set(["react", "react-native", "expo-image", "react-native-safe-area-context"]);
const required = {
  "SceneCoverCard.tsx": ["expo-image", "장면 예시 ·", "accessibilityRole", "Pressable"],
  "DecisionCard.tsx": ["expo-image", "여기로 갈래요", "교체할 수 있는 곳이 없어요", "accessibilityRole", "Pressable"],
  "DecisionSheet.tsx": ["Modal", "지도에서 보기", "내 장면에 저장", "공유하기", "accessibilityRole", "Pressable"],
};

const errors = [];
for (const [file, markers] of Object.entries(required)) {
  const path = resolve(componentRoot, file);
  let source = "";
  try {
    source = readFileSync(path, "utf8");
  } catch {
    errors.push(`${file} is missing`);
    continue;
  }

  for (const marker of markers) {
    if (!source.includes(marker)) errors.push(`${file} is missing ${JSON.stringify(marker)}`);
  }

  for (const match of source.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/") && !allowedPackages.has(specifier)) {
      errors.push(`${file} imports unsupported package ${specifier}`);
    }
  }
}

if (errors.length) {
  console.error("Discovery component verification failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Discovery component verification passed.");
