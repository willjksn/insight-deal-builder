export type RefineTarget =
  | "brief"
  | "beats"
  | "script"
  | "shots"
  | "shot"
  | "edit"
  | "sound"
  | "music"
  | "look"
  | "lighting"
  | "coverage"
  | "shoot_order"
  | "checklist";

export function refineTargetFromSection(section: string): RefineTarget | null {
  const map: Record<string, RefineTarget> = {
    brief: "brief",
    beats: "beats",
    script: "script",
    shots: "shots",
    edit: "edit",
    sound: "sound",
    music: "music",
    look: "look",
    lighting: "lighting",
    coverage: "coverage",
    shoot_order: "shoot_order",
    checklist: "checklist",
  };
  return map[section] || null;
}
