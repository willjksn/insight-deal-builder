import { ProductionDayShot } from "@/lib/production/types";

export type ProductionShotType =
  | "master_wide"
  | "medium_shot"
  | "close_up"
  | "insert_shot"
  | "reaction_shot"
  | "movement_shot"
  | "vertical_social_shot"
  | "thumbnail_shot"
  | "bts_shot"
  | "room_tone"
  | "wild_line";

export const SHOT_TYPE_LABELS: Record<ProductionShotType, string> = {
  master_wide: "Wide / Establishing",
  medium_shot: "Medium",
  close_up: "Close-up",
  insert_shot: "Insert",
  reaction_shot: "Reaction",
  movement_shot: "Movement",
  vertical_social_shot: "Vertical / Social",
  thumbnail_shot: "Thumbnail",
  bts_shot: "BTS",
  room_tone: "Room tone",
  wild_line: "Wild line",
};

export function formatShotTypeLabel(shotType?: string): string {
  if (!shotType?.trim()) return "—";
  const key = shotType.trim().toLowerCase().replace(/\s+/g, "_") as ProductionShotType;
  if (SHOT_TYPE_LABELS[key]) return SHOT_TYPE_LABELS[key];
  return shotType.replace(/_/g, " ");
}

export function formatProductionShotLabel(shot: ProductionDayShot): string {
  if (shot.shotName?.trim()) {
    const num = shot.scoutShotNumber ?? "";
    return num ? `${num}. ${shot.shotName.trim()}` : shot.shotName.trim();
  }
  return shot.label;
}
