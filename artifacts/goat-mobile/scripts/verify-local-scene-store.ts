import assert from "node:assert/strict";
import {
  LocalSceneStore,
  type KeyValueStorage,
} from "../src/services/localSceneStore";

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  async removeItem(key: string) {
    this.values.delete(key);
  }
}

async function main() {
  const storage = new MemoryStorage();
  const store = new LocalSceneStore(storage, () => "2026-09-12T10:00:00.000Z");

  await store.saveScene({
    placeId: "place-a",
    selectionId: "scene-a",
    note: "다시 보기",
    selected: true,
  });
  await store.saveScene({
    placeId: "place-a",
    selectionId: "scene-b",
    note: "덮어쓰면 안 됨",
    selected: false,
  });

  assert.deepEqual(await store.getScenes(), [
    {
      placeId: "place-a",
      selectionId: "scene-a",
      note: "다시 보기",
      selected: true,
      savedAt: "2026-09-12T10:00:00.000Z",
    },
  ]);

  await store.removeScene("place-a");
  assert.deepEqual(await store.getScenes(), []);

  await store.saveDraft({
    selectionId: "scene-a",
    placeIds: ["place-a", "place-b", "place-c"],
    seenIds: ["place-a", "place-b", "place-c", "place-d"],
    mode: "SCENE",
    catalogVersion: "catalog-1",
    policyVersion: "goat-discovery-r4",
    revision: 2,
  });

  assert.deepEqual(
    await store.restoreDraft({
      catalogVersion: "catalog-1",
      policyVersion: "goat-discovery-r4",
      selectionIds: ["scene-a"],
      placeIds: ["place-a", "place-b", "place-c"],
    }),
    {
      status: "RESTORED",
      draft: {
        selectionId: "scene-a",
        placeIds: ["place-a", "place-b", "place-c"],
        seenIds: ["place-a", "place-b", "place-c", "place-d"],
        mode: "SCENE",
        catalogVersion: "catalog-1",
        policyVersion: "goat-discovery-r4",
        revision: 2,
      },
    },
  );

  assert.deepEqual(
    await store.restoreDraft({
      catalogVersion: "catalog-2",
      policyVersion: "goat-discovery-r4",
      selectionIds: ["scene-a"],
      placeIds: ["place-a", "place-b", "place-c"],
    }),
    { status: "STALE" },
  );

  const persisted = [...storage.values.values()].join("\n");
  assert.equal(persisted.includes("photo"), false);
  assert.equal(persisted.includes("token"), false);

  const failingStore = new LocalSceneStore({
    getItem: async () => null,
    setItem: async () => {
      throw new Error("disk full");
    },
    removeItem: async () => undefined,
  });
  await assert.rejects(
    () => failingStore.saveScene({ placeId: "x", selectionId: "scene-a" }),
    /disk full/,
  );

  console.log("local scene store contract verified");
}

void main();
