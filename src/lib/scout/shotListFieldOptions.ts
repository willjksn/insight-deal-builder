import { SCOUT_CAMERA_MOVEMENTS } from "@/lib/scout/constants";
import { cameraMovementLabel, readCameraMovementsFromBrief } from "@/lib/scout/cameraMovementBrief";
import { ScoutCreativeBrief, ScoutShotListItem } from "@/lib/scout/types";

export const SCOUT_SHOT_FIELD_CUSTOM = "__custom__";

export type ShotListSelectOption = { value: string; label: string; disabled?: boolean };

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Lens choices from gear inventory plus any values already on shots. */
export function buildLensSelectOptions(
  lenses: string[],
  existingValues: string[] = []
): ShotListSelectOption[] {
  const options = uniqueStrings([...lenses, ...existingValues]).map((value) => ({
    value,
    label: value,
  }));

  if (!options.length) {
    options.push({ value: "", label: "Add lenses in gear settings", disabled: true });
  }

  options.push({ value: SCOUT_SHOT_FIELD_CUSTOM, label: "Custom…" });
  return options;
}

/** Movement choices from creative Q&A plus values already on shots. */
export function buildMovementSelectOptions(
  brief: ScoutCreativeBrief | undefined,
  existingValues: string[] = []
): ShotListSelectOption[] {
  const fromBriefKeys = readCameraMovementsFromBrief(brief ?? {});
  const fromBrief = fromBriefKeys.map((key) => cameraMovementLabel(key));

  const legacyText = brief?.cameraMovement?.trim();
  if (legacyText && fromBriefKeys.length === 0) {
    fromBrief.push(legacyText);
  }

  const options = uniqueStrings([...fromBrief, ...existingValues]).map((value) => ({
    value,
    label: value,
  }));

  if (!options.length) {
    options.push({
      value: "",
      label: "Complete creative Q&A for movement options",
      disabled: true,
    });
  }

  options.push({ value: SCOUT_SHOT_FIELD_CUSTOM, label: "Custom…" });
  return options;
}

/** Whether the stored value matches a preset option (not custom text). */
export function isPresetShotListValue(
  current: string,
  options: ShotListSelectOption[],
  customSentinel = SCOUT_SHOT_FIELD_CUSTOM
): boolean {
  const trimmed = current.trim();
  if (!trimmed) return false;
  return options.some(
    (opt) => opt.value === trimmed && opt.value !== customSentinel && !opt.disabled
  );
}

/** Map a stored field value to a select value (preset or custom sentinel). */
export function shotListSelectValue(
  current: string,
  options: ShotListSelectOption[],
  customSentinel = SCOUT_SHOT_FIELD_CUSTOM
): string {
  const trimmed = current.trim();
  if (!trimmed) return "";
  const preset = options.find(
    (opt) => opt.value === trimmed && opt.value !== customSentinel && !opt.disabled
  );
  return preset ? preset.value : customSentinel;
}

/** Labels for read-only display when value is a known movement key. */
export function formatStoredMovement(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  const byKey = SCOUT_CAMERA_MOVEMENTS.find((m) => m.value === trimmed);
  if (byKey) return byKey.label;
  return trimmed;
}

export function normalizeShotListRow(s: ScoutShotListItem): ScoutShotListItem {
  return {
    shotNumber: s.shotNumber,
    shotName: s.shotName?.trim() ?? "",
    scene: s.scene?.trim() ?? "Scene 1",
    shotType: s.shotType ?? "medium_shot",
    camera: s.camera?.trim() ?? "",
    lens: s.lens?.trim() ?? "",
    frameRate: s.frameRate?.trim() ?? "24fps",
    cameraMovement: s.cameraMovement?.trim() ?? "",
    subjectAction: s.subjectAction?.trim() ?? "",
    blockingNotes: s.blockingNotes?.trim() ?? "",
    lightingNotes: s.lightingNotes?.trim() ?? "",
    audioDialogueNotes: s.audioDialogueNotes?.trim() ?? "",
    priority: s.priority ?? "must_have",
    status: s.status ?? "planned",
    notes: s.notes?.trim() ?? "",
  };
}

export function shotListsEqual(a: ScoutShotListItem[], b: ScoutShotListItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((row, index) => {
    const left = normalizeShotListRow(row);
    const right = normalizeShotListRow(b[index]);
    return JSON.stringify(left) === JSON.stringify(right);
  });
}
