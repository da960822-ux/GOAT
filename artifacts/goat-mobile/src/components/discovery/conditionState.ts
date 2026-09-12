export type PlaceIdDiffKind = "PLACE_CHANGED" | "ORDER_CHANGED" | "NO_CHANGE";

export type PlaceIdDiff = { kind: PlaceIdDiffKind; message: string };

export type ConditionSnapshot<Conditions, Result> = {
  conditions: Conditions;
  result: Result;
};

export type ConditionState<Conditions, Result> = {
  committed: ConditionSnapshot<Conditions, Result>;
  draft: Conditions;
  undo: ConditionSnapshot<Conditions, Result> | null;
};

export function createConditionState<Conditions, Result>(conditions: Conditions, result: Result): ConditionState<Conditions, Result> {
  return { committed: { conditions, result }, draft: conditions, undo: null };
}

export function updateConditionDraft<Conditions, Result>(state: ConditionState<Conditions, Result>, draft: Conditions): ConditionState<Conditions, Result> {
  return { ...state, draft };
}

export function resetConditionDraft<Conditions, Result>(state: ConditionState<Conditions, Result>): ConditionState<Conditions, Result> {
  return { ...state, draft: state.committed.conditions };
}

export function applyConditionResult<Conditions, Result>(state: ConditionState<Conditions, Result>, result: Result): ConditionState<Conditions, Result> {
  return { committed: { conditions: state.draft, result }, draft: state.draft, undo: state.committed };
}

export function restoreUndo<Conditions, Result>(state: ConditionState<Conditions, Result>): ConditionState<Conditions, Result> {
  if (!state.undo) return state;
  return { committed: state.undo, draft: state.undo.conditions, undo: null };
}

export function syncConditionResult<Conditions, Result>(state: ConditionState<Conditions, Result>, result: Result): ConditionState<Conditions, Result> {
  return { ...state, committed: { ...state.committed, result } };
}

export function discardConditionUndo<Conditions, Result>(state: ConditionState<Conditions, Result>): ConditionState<Conditions, Result> {
  return { ...state, undo: null };
}

export function diffPlaceIds(before: readonly string[], after: readonly string[]): PlaceIdDiff {
  if (before.length === after.length && before.every((placeId, index) => placeId === after[index])) return { kind: "NO_CHANGE", message: "기존 세 곳이 그대로 적합해요" };
  if (before.length === after.length && before.every((placeId) => after.includes(placeId))) return { kind: "ORDER_CHANGED", message: "세 곳의 순서가 달라졌어요" };
  return { kind: "PLACE_CHANGED", message: "추천 장소가 바뀌었어요" };
}
