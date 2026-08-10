import type { EquipmentCatalogItem } from "@/lib/types";
import {
  EMPTY_SHOOTING_KIT,
  normalizeShootingKit,
  shootingKitHasGear,
  type ProductionShootingKit,
  type ShootingKitCategory,
} from "@/lib/production/shootingKit";
import type { ContentPlanInputs } from "@/lib/contentPlan/types";

/** Map equipment-catalog categories onto shooting-kit categories. */
export const EQUIPMENT_CATEGORY_TO_KIT: Record<string, ShootingKitCategory> = {
  Camera: "cameraBodies",
  Lens: "lenses",
  Support: "supports",
  Lighting: "lights",
  Grip: "grip",
  Audio: "audio",
  Monitor: "other",
  Other: "other",
};

export function splitGearList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Legacy free-text fields → kit (used when structured shootingKit is absent). */
export function kitFromLegacyGearStrings(inputs: ContentPlanInputs): ProductionShootingKit {
  return normalizeShootingKit({
    cameraBodies: splitGearList(inputs.camerasAvailable),
    lenses: splitGearList(inputs.lensesAvailable),
    lights: splitGearList(inputs.lightingAvailable),
    other: splitGearList(inputs.equipmentAvailable),
  });
}

/** Prefer structured kit on the plan; fall back to comma-separated legacy fields. */
export function kitFromContentPlanInputs(inputs: ContentPlanInputs): ProductionShootingKit {
  if (inputs.shootingKit && shootingKitHasGear(inputs.shootingKit)) {
    return normalizeShootingKit(inputs.shootingKit);
  }
  return kitFromLegacyGearStrings(inputs);
}

export function mergeShootingKits(
  primary: ProductionShootingKit,
  secondary: ProductionShootingKit
): ProductionShootingKit {
  const a = normalizeShootingKit(primary);
  const b = normalizeShootingKit(secondary);
  const merge = (x: string[], y: string[]) => {
    const seen = new Set(x.map((s) => s.toLowerCase()));
    const out = [...x];
    for (const item of y) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      out.push(item);
      seen.add(key);
    }
    return out;
  };
  return {
    cameraBodies: merge(a.cameraBodies, b.cameraBodies),
    lenses: merge(a.lenses, b.lenses),
    supports: merge(a.supports, b.supports),
    lights: merge(a.lights, b.lights),
    grip: merge(a.grip, b.grip),
    audio: merge(a.audio, b.audio),
    props: merge(a.props, b.props),
    other: merge(a.other, b.other),
    cameraSettingsNotes:
      a.cameraSettingsNotes?.trim() || b.cameraSettingsNotes?.trim() || undefined,
  };
}

function otherGearLabel(kit: ProductionShootingKit): string {
  return [...kit.supports, ...kit.grip, ...kit.audio, ...kit.props, ...kit.other].join(", ");
}

/** Sync structured kit + legacy string fields (PDF / older prompt context). */
export function applyShootingKitToInputs(
  inputs: ContentPlanInputs,
  kit: ProductionShootingKit
): ContentPlanInputs {
  const k = normalizeShootingKit(kit);
  return {
    ...inputs,
    shootingKit: k,
    camerasAvailable: k.cameraBodies.join(", "),
    lensesAvailable: k.lenses.join(", "),
    lightingAvailable: k.lights.join(", "),
    equipmentAvailable: otherGearLabel(k),
  };
}

/** Fill empty legacy fields from a kit without clearing existing text. */
export function hydrateInputsFromKit(
  inputs: ContentPlanInputs,
  kit: ProductionShootingKit
): ContentPlanInputs {
  const k = normalizeShootingKit(kit);
  const next: ContentPlanInputs = {
    ...inputs,
    camerasAvailable:
      inputs.camerasAvailable?.trim() ||
      (k.cameraBodies.length ? k.cameraBodies.join(", ") : inputs.camerasAvailable),
    lensesAvailable:
      inputs.lensesAvailable?.trim() ||
      (k.lenses.length ? k.lenses.join(", ") : inputs.lensesAvailable),
    lightingAvailable:
      inputs.lightingAvailable?.trim() ||
      (k.lights.length ? k.lights.join(", ") : inputs.lightingAvailable),
    equipmentAvailable:
      inputs.equipmentAvailable?.trim() ||
      (otherGearLabel(k) || inputs.equipmentAvailable),
  };
  if (!inputs.shootingKit || !shootingKitHasGear(inputs.shootingKit)) {
    next.shootingKit = k;
  }
  return next;
}

/** Active equipment catalog → full company kit (default for Content Plans). */
export function kitFromEquipmentCatalog(
  items: Pick<EquipmentCatalogItem, "name" | "category" | "active">[]
): ProductionShootingKit {
  const map: Partial<Record<ShootingKitCategory, string[]>> = {};
  for (const item of items) {
    if (item.active === false) continue;
    const cat = EQUIPMENT_CATEGORY_TO_KIT[item.category] ?? "other";
    const label = item.name?.trim();
    if (!label) continue;
    const list = (map[cat] ??= []);
    if (!list.includes(label)) list.push(label);
  }
  for (const key of Object.keys(map) as ShootingKitCategory[]) {
    map[key]!.sort((a, b) => a.localeCompare(b));
  }
  return normalizeShootingKit({
    ...EMPTY_SHOOTING_KIT,
    ...map,
  });
}

export function equipmentOptionsByKitCategory(
  items: Pick<EquipmentCatalogItem, "name" | "category" | "active">[]
): Partial<Record<ShootingKitCategory, string[]>> {
  const map: Partial<Record<ShootingKitCategory, string[]>> = {};
  for (const item of items) {
    if (item.active === false) continue;
    const cat = EQUIPMENT_CATEGORY_TO_KIT[item.category] ?? "other";
    const label = item.name?.trim();
    if (!label) continue;
    const list = (map[cat] ??= []);
    if (!list.includes(label)) list.push(label);
  }
  for (const key of Object.keys(map) as ShootingKitCategory[]) {
    map[key]!.sort((a, b) => a.localeCompare(b));
  }
  return map;
}
