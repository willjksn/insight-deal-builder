import { ScriptSuggestedShot } from "@/lib/scriptWriter/types";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";

export type ShotListDetailRow = { label: string; value: string };

/** Human-readable rows for UI / PDF — skips empty fields. */
export function shotListDetailRows(shot: ScriptSuggestedShot): ShotListDetailRow[] {
  const rows: ShotListDetailRow[] = [];
  const add = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) rows.push({ label, value: v });
  };

  add("Type", formatShotTypeLabel(shot.shotType));
  add("Scene", shot.sceneNumber ? `Scene ${shot.sceneNumber}` : undefined);
  add("What we see", shot.description);
  add("Action", shot.subjectAction);
  add("Camera", shot.cameraMovement);
  add("Body", shot.cameraBody);
  add("Lens", shot.lens);
  add("Support", shot.support);
  if (shot.assignedLights?.length) add("Lights", shot.assignedLights.join(" · "));
  if (shot.assignedProps?.length) add("Props", shot.assignedProps.join(" · "));
  add("Dolly move", shot.dollyMoveRef);
  add("Framing", shot.framing);
  add("Height", shot.cameraHeight);
  add("Blocking", shot.blocking);
  add("Lighting", shot.lighting);
  add("Exposure", shot.exposureNotes);
  add("Audio", shot.audioNotes);
  add("Setup", shot.setupNotes);
  add("Edit", shot.editNote);
  add("Duration", shot.duration);
  add("Purpose", shot.purpose);

  return rows;
}

/** Compact notes string for production board / crew packet. */
export function shotListNotesBlock(shot: ScriptSuggestedShot): string {
  const parts: string[] = [];
  const push = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) parts.push(`${label}: ${v}`);
  };

  push("See", shot.description);
  push("Action", shot.subjectAction);
  push("Cam", shot.cameraMovement);
  push("Body", shot.cameraBody);
  push("Lens", shot.lens);
  push("Support", shot.support);
  if (shot.assignedLights?.length) push("Lights", shot.assignedLights.join(" · "));
  if (shot.assignedProps?.length) push("Props", shot.assignedProps.join(" · "));
  if (shot.dollyMoveRef?.trim()) push("Move", shot.dollyMoveRef);
  push("Frame", shot.framing);
  push("Height", shot.cameraHeight);
  push("Block", shot.blocking);
  push("Light", shot.lighting);
  push("Exp", shot.exposureNotes);
  push("Audio", shot.audioNotes);
  push("Setup", shot.setupNotes);
  push("Edit", shot.editNote);
  push("Hold", shot.duration);
  push("Why", shot.purpose);

  return parts.join("\n");
}

export function shotListTitle(shot: ScriptSuggestedShot): string {
  const name = shot.shotName?.trim();
  if (name) return `${shot.shotNumber}. ${name}`;
  const type = formatShotTypeLabel(shot.shotType);
  return `${shot.shotNumber}. ${type}`;
}
