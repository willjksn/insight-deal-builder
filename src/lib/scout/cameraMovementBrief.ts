import { SCOUT_CAMERA_MOVEMENTS } from "@/lib/scout/constants";
import { ScoutCreativeBrief } from "@/lib/scout/types";

export function cameraMovementLabel(value: string): string {
  return SCOUT_CAMERA_MOVEMENTS.find((m) => m.value === value)?.label ?? value;
}

export function formatCameraMovementLabels(values: string[]): string {
  return values.map(cameraMovementLabel).join(", ");
}

/** Read selected movement keys from brief (array or legacy single value). */
export function readCameraMovementsFromBrief(brief: ScoutCreativeBrief): string[] {
  if (brief.cameraMovements?.length) {
    return [...new Set(brief.cameraMovements.filter(Boolean))];
  }
  const legacy = brief.cameraMovement?.trim();
  if (!legacy) return [];

  const byValue = SCOUT_CAMERA_MOVEMENTS.find((m) => m.value === legacy);
  if (byValue) return [byValue.value];

  const tokens = legacy.split(",").map((s) => s.trim()).filter(Boolean);
  const resolved = tokens.flatMap((token) => {
    const valueMatch = SCOUT_CAMERA_MOVEMENTS.find((m) => m.value === token);
    if (valueMatch) return [valueMatch.value];
    const labelMatch = SCOUT_CAMERA_MOVEMENTS.find(
      (m) => m.label.toLowerCase() === token.toLowerCase()
    );
    if (labelMatch) return [labelMatch.value];
    return [];
  });
  return [...new Set(resolved)];
}

export function toggleCameraMovement(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((v) => v !== value)
    : [...selected, value];
}

export function withCameraMovements(
  brief: ScoutCreativeBrief,
  movements: string[]
): ScoutCreativeBrief {
  const cameraMovements = [...new Set(movements.filter(Boolean))];
  return {
    ...brief,
    cameraMovements,
    cameraMovement: cameraMovements.length ? formatCameraMovementLabels(cameraMovements) : undefined,
  };
}
