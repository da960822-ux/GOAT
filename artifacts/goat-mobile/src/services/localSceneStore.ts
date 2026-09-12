import { z } from "zod";

const SCENES_KEY = "@goat_scenes_v1";
const DRAFT_KEY = "@goat_recommendation_draft_v1";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const savedSceneSchema = z
  .object({
    placeId: z.string().min(1),
    selectionId: z.string().min(1),
    note: z.string().max(500).optional(),
    selected: z.boolean(),
    savedAt: z.string().datetime(),
  })
  .strict();

const recommendationDraftSchema = z
  .object({
    selectionId: z.string().min(1),
    placeIds: z
      .array(z.string().min(1))
      .length(3)
      .refine((ids) => new Set(ids).size === 3),
    seenIds: z
      .array(z.string().min(1))
      .max(61)
      .refine((ids) => new Set(ids).size === ids.length),
    mode: z.enum(["SCENE", "TODAY"]),
    catalogVersion: z.string().min(1),
    policyVersion: z.literal("goat-discovery-r4"),
    revision: z.number().int().nonnegative(),
  })
  .strict();

export type SavedScene = z.infer<typeof savedSceneSchema>;
export type RecommendationDraft = z.infer<typeof recommendationDraftSchema>;
export type SaveSceneInput = Omit<SavedScene, "savedAt" | "selected"> & {
  selected?: boolean;
};

export type DraftRestoreResult =
  | { status: "EMPTY" }
  | { status: "STALE" }
  | { status: "RESTORED"; draft: RecommendationDraft };

export class LocalSceneStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now = () => new Date().toISOString(),
  ) {}

  async getScenes(): Promise<SavedScene[]> {
    const raw = await this.storage.getItem(SCENES_KEY);
    if (!raw) return [];
    return z.array(savedSceneSchema).parse(JSON.parse(raw));
  }

  async saveScene(input: SaveSceneInput): Promise<SavedScene> {
    const scenes = await this.getScenes();
    const existing = scenes.find((scene) => scene.placeId === input.placeId);
    if (existing) return existing;

    const scene = savedSceneSchema.parse({
      ...input,
      selected: input.selected ?? false,
      savedAt: this.now(),
    });
    await this.storage.setItem(SCENES_KEY, JSON.stringify([...scenes, scene]));
    return scene;
  }

  async removeScene(placeId: string): Promise<void> {
    const scenes = await this.getScenes();
    await this.storage.setItem(
      SCENES_KEY,
      JSON.stringify(scenes.filter((scene) => scene.placeId !== placeId)),
    );
  }

  async saveDraft(draft: RecommendationDraft): Promise<void> {
    await this.storage.setItem(
      DRAFT_KEY,
      JSON.stringify(recommendationDraftSchema.parse(draft)),
    );
  }

  async restoreDraft(current: {
    catalogVersion: string;
    policyVersion: string;
    selectionIds: readonly string[];
    placeIds: readonly string[];
  }): Promise<DraftRestoreResult> {
    const raw = await this.storage.getItem(DRAFT_KEY);
    if (!raw) return { status: "EMPTY" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { status: "STALE" };
    }
    const result = recommendationDraftSchema.safeParse(parsed);
    if (!result.success) return { status: "STALE" };

    const draft = result.data;
    const validSelections = new Set(current.selectionIds);
    const validPlaces = new Set(current.placeIds);
    if (
      draft.catalogVersion !== current.catalogVersion ||
      draft.policyVersion !== current.policyVersion ||
      !validSelections.has(draft.selectionId) ||
      draft.placeIds.some((placeId) => !validPlaces.has(placeId))
    ) {
      return { status: "STALE" };
    }
    return { status: "RESTORED", draft };
  }

  async clearDraft(): Promise<void> {
    await this.storage.removeItem(DRAFT_KEY);
  }
}
