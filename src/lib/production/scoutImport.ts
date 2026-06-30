import { ScoutShotListItem } from "@/lib/scout/types";
import { ProductionDayShot } from "@/lib/production/types";

export function shotsFromScoutList(items: ScoutShotListItem[]): ProductionDayShot[] {
  return items.map((shot, index) => {
    const sceneRef = shot.scene?.trim();
    const notes = [shot.lens, shot.lightingNotes].filter(Boolean).join(" · ");
    const entry: ProductionDayShot = {
      id: crypto.randomUUID(),
      label: formatScoutShotLabel(shot),
      done: shot.status === "shot" || shot.status === "captured",
      scoutShotNumber: shot.shotNumber,
      sortOrder: index,
      shotType: shot.shotType,
      shotName: shot.shotName?.trim(),
      subjectAction: shot.subjectAction?.trim(),
      cameraMovement: shot.cameraMovement?.trim(),
    };
    if (sceneRef) entry.sceneRef = sceneRef;
    if (notes) entry.notes = notes;
    return entry;
  });
}

function formatScoutShotLabel(shot: ScoutShotListItem): string {
  const type = shot.shotType.replace(/_/g, " ");
  const name = shot.shotName?.trim();
  if (name) return `${shot.shotNumber}. ${name}`;
  if (shot.subjectAction?.trim()) return `${shot.shotNumber}. ${type} — ${shot.subjectAction.trim()}`;
  return `${shot.shotNumber}. ${type}`;
}
