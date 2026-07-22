import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const specDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(specDirectory, "..", "..");
const generatedEntrypoints = [
  "lib/api-client-react/src/generated/api.ts",
  "lib/api-zod/src/generated/api.ts",
];

const generatedSchemaTypes = [
  "lib/api-client-react/src/generated/api.schemas.ts",
  "lib/api-zod/src/generated/types/createRecommendationRequest.ts",
];

const generatedSelectionType = `({
  moodId: MoodId;
  referenceCardId?: never;
} | {
  referenceCardId: ReferenceCardId;
  moodId?: never;
}) & {`;

const generatedSelectionSchema = `
const recommendationMoodIdSchema = zod.enum(['sea-coast', 'japan-alley', 'alps-ranch', 'forest-garden-rest', 'retro-market-harbor', 'architecture-exhibit-landmark', 'resort-cafe-exotic']);
const recommendationReferenceCardIdSchema = zod.enum(['REF_SEA_01', 'REF_SEA_02', 'REF_SEA_03', 'REF_JP_01', 'REF_JP_02', 'REF_JP_03', 'REF_ALPS_01', 'REF_ALPS_02', 'REF_ALPS_03', 'REF_NATURE_01', 'REF_NATURE_02', 'REF_NATURE_03', 'REF_RETRO_01', 'REF_RETRO_02', 'REF_RETRO_03', 'REF_ARCH_01', 'REF_ARCH_02', 'REF_ARCH_03', 'REF_RESORT_01', 'REF_RESORT_02', 'REF_RESORT_03']);

export const RecommendationSelectionInputSchema = zod.union([
  zod.object({
    moodId: recommendationMoodIdSchema,
    referenceCardId: zod.never().optional(),
  }),
  zod.object({
    referenceCardId: recommendationReferenceCardIdSchema,
    moodId: zod.never().optional(),
  }),
]);
`;

for (const relativePath of generatedEntrypoints) {
  const target = path.resolve(workspaceRoot, relativePath);
  const source = await readFile(target, "utf8");
  await writeFile(target, `${source.trimEnd()}\n`, "utf8");
}

for (const relativePath of generatedSchemaTypes) {
  const target = path.resolve(workspaceRoot, relativePath);
  const source = await readFile(target, "utf8");
  let normalized = source.replace(
    `(unknown & {\n  moodId?: MoodId;\n  referenceCardId?: ReferenceCardId;`,
    generatedSelectionType,
  );
  const selectionStart = normalized.indexOf(
    "export type CreateRecommendationRequest = ({",
  );
  const selectionEnd = normalized.indexOf("\n});", selectionStart);
  if (selectionStart >= 0 && selectionEnd >= 0) {
    normalized = `${normalized.slice(0, selectionEnd)}\n};${normalized.slice(selectionEnd + 4)}`;
  }
  await writeFile(target, normalized, "utf8");
}

const generatedZodPath = path.resolve(
  workspaceRoot,
  "lib/api-zod/src/generated/api.ts",
);
const generatedZod = await readFile(generatedZodPath, "utf8");
const normalizedZod = generatedZod
  .replace(
    "import * as zod from 'zod';\n",
    `import * as zod from 'zod';\n${generatedSelectionSchema}`,
  )
  .replaceAll(
    "zod.union([zod.unknown(),zod.unknown()])",
    "RecommendationSelectionInputSchema",
  );
await writeFile(generatedZodPath, `${normalizedZod.trimEnd()}\n`, "utf8");
