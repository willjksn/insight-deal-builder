import { ScoutAppMode, ScoutMood } from "./types";

export interface LightingPresetMode {
  id: ScoutAppMode | string;
  name: string;
  description: string;
  moods: ScoutMood[];
  contrastLevel: "low" | "medium" | "high";
  keyStyle: string;
  fillStyle: string;
  practicals: string;
  overhead: string;
  whiteBalance: string;
}

export const LIGHTING_PRESET_MODES: LightingPresetMode[] = [
  {
    id: "warm_creator",
    name: "Warm Creator Look",
    description: "Creator content, lifestyle, podcast, beauty, warm room scenes.",
    moods: ["warm", "soft_beauty", "natural"],
    contrastLevel: "medium",
    keyStyle: "Soft large key camera-left or window-motivated",
    fillStyle: "Controlled fill or negative fill opposite",
    practicals: "Warm practicals in background for depth",
    overhead: "Turn off flat ceiling lights unless motivated",
    whiteBalance: "Manual ~3200–4500K depending on practical mix",
  },
  {
    id: "horror",
    name: "Horror / Thriller Look",
    description: "Scary scenes, suspense, dramatic rooms.",
    moods: ["scary", "suspense", "dramatic", "moody"],
    contrastLevel: "high",
    keyStyle: "Harder motivated light with stronger shadow side",
    fillStyle: "Minimal fill; add negative fill",
    practicals: "Cool hallway spill or flicker if available",
    overhead: "Off unless intentionally motivated",
    whiteBalance: "Manual; lean cool or split warm/cool for contrast",
  },
  {
    id: "luxury_commercial",
    name: "Luxury Commercial Look",
    description: "Brand, product, beauty, polished creator scenes.",
    moods: ["luxury", "clean_commercial", "soft_beauty"],
    contrastLevel: "medium",
    keyStyle: "Large soft key with clean skin tone",
    fillStyle: "Controlled fill; subtle hair light",
    practicals: "Background practicals for premium depth",
    overhead: "Avoid ugly mixed overhead",
    whiteBalance: "Manual 4500–5600K for clean skin",
  },
  {
    id: "natural_daylight",
    name: "Natural Daylight Look",
    description: "Kitchen, living room, lifestyle, interviews.",
    moods: ["natural", "documentary"],
    contrastLevel: "low",
    keyStyle: "Window as motivation; key matches window direction",
    fillStyle: "Bounce or negative fill camera-right",
    practicals: "Add practicals for depth only",
    overhead: "Turn off ceiling lights",
    whiteBalance: "Manual 5200–5600K daylight",
  },
  {
    id: "podcast",
    name: "Podcast / Interview Look",
    description: "Seated talking scenes with clean audio.",
    moods: ["warm", "natural", "clean_commercial"],
    contrastLevel: "medium",
    keyStyle: "Soft key at ~45° to subject",
    fillStyle: "Gentle fill or negative fill for shape",
    practicals: "Background practicals; keep mics intentional",
    overhead: "Off to avoid harsh shadows on faces",
    whiteBalance: "Manual; match key to dominant source",
  },
];

export function pickLightingPreset(projectMood: ScoutMood, appMode?: ScoutAppMode): LightingPresetMode {
  if (appMode === "horror") {
    return LIGHTING_PRESET_MODES.find((p) => p.id === "horror")!;
  }
  if (appMode === "commercial") {
    return LIGHTING_PRESET_MODES.find((p) => p.id === "luxury_commercial")!;
  }
  if (appMode === "podcast") {
    return LIGHTING_PRESET_MODES.find((p) => p.id === "podcast")!;
  }
  const byMood = LIGHTING_PRESET_MODES.find((p) => p.moods.includes(projectMood));
  return byMood ?? LIGHTING_PRESET_MODES[0];
}
