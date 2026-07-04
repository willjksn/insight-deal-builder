import {
  flattenShootingKit,
  normalizeShootingKit,
  ProductionShootingKit,
  SHOOTING_KIT_CATEGORY_LABELS,
  ShootingKitCategory,
} from "@/lib/production/shootingKit";

export function formatShootingKitForPrompt(kit?: ProductionShootingKit | null): string {
  const k = normalizeShootingKit(kit);
  if (!shootingKitHasContent(k)) return "";

  const lines = ["AVAILABLE SHOOTING KIT (use ONLY this gear in shot lists — do not invent bodies/lenses/supports not listed):"];
  const categories: ShootingKitCategory[] = [
    "cameraBodies",
    "lenses",
    "supports",
    "lights",
    "grip",
    "audio",
    "props",
    "other",
  ];
  for (const cat of categories) {
    const items = k[cat];
    if (items.length) {
      lines.push(`${SHOOTING_KIT_CATEGORY_LABELS[cat]}: ${items.join(" · ")}`);
    }
  }
  if (k.cameraSettingsNotes?.trim()) {
    lines.push(`Default camera settings: ${k.cameraSettingsNotes.trim()}`);
  }
  lines.push(
    "",
    "Per-shot gear rules:",
    "- cameraBody: pick from camera bodies list (or note if kit empty)",
    "- support: pick from supports list — dolly, gimbal, slider, tripod/sticks, locked, handheld",
    "- lens: pick from lenses list when possible",
    "- assignedLights: which lights from kit motivate this shot",
    "- assignedProps: props from kit used in frame",
    "- dollyMoveRef: letter/id linking to productionPack.dollyMoves when this shot uses a planned dolly move",
    "",
    "Also output productionPack sections when detailed shot list is on:",
    "- lensPlan: [{ lens, use }] — which lenses for which story beats",
    "- dollyMoves: [{ id, track, lens, purpose, execution }] — named moves (A, B, C…) with track placement and speed",
    "- blockingMap: ASCII/text floor plan of talent, figure positions, dolly start",
    "- cameraSetup: [{ setting, value, why }] — body codec, fps, shutter, profile, WB, ISO guidance",
    "- editPlan: [{ step, action }] — picture edit + sound design beats for trailer/spot"
  );
  return lines.join("\n");
}

function shootingKitHasContent(kit: ProductionShootingKit): boolean {
  return flattenShootingKit(kit).length > 0;
}
