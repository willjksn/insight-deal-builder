/** Structured shoot-day equipment — feeds detailed shot lists and crew packets. */

export type ShootingKitCategory =
  | "cameraBodies"
  | "lenses"
  | "supports"
  | "lights"
  | "grip"
  | "audio"
  | "props"
  | "other";

export interface ProductionShootingKit {
  cameraBodies: string[];
  lenses: string[];
  /** Dolly, slider, gimbal, tripod, steadicam, etc. */
  supports: string[];
  lights: string[];
  grip: string[];
  audio: string[];
  props: string[];
  other: string[];
  /** e.g. FX3 · 24p · S-Cinetone · 4300K WB locked */
  cameraSettingsNotes?: string;
}

export const SHOOTING_KIT_CATEGORY_LABELS: Record<ShootingKitCategory, string> = {
  cameraBodies: "Camera bodies",
  lenses: "Lenses",
  supports: "Support (dolly, gimbal, sticks…)",
  lights: "Lights",
  grip: "Grip & modifiers",
  audio: "Audio",
  props: "Props & set",
  other: "Other gear",
};

export const SHOOTING_KIT_PLACEHOLDERS: Record<ShootingKitCategory, string> = {
  cameraBodies: "Sony FX3, FX6…",
  lenses: "24mm, 35mm, 50mm, 85mm…",
  supports: "Dolly + track, gimbal, tripod, slider…",
  lights: "Aputure 600d, tube lights, practicals…",
  grip: "C-stands, flags, diffusion, apple boxes…",
  audio: "Boom, lavs, recorder…",
  props: "Remote, blanket, figure wardrobe…",
  other: "Monitors, batteries, media…",
};

export const EMPTY_SHOOTING_KIT: ProductionShootingKit = {
  cameraBodies: [],
  lenses: [],
  supports: [],
  lights: [],
  grip: [],
  audio: [],
  props: [],
  other: [],
};

export function normalizeShootingKit(
  kit?: Partial<ProductionShootingKit> | null
): ProductionShootingKit {
  if (!kit) return { ...EMPTY_SHOOTING_KIT };
  return {
    cameraBodies: kit.cameraBodies ?? [],
    lenses: kit.lenses ?? [],
    supports: kit.supports ?? [],
    lights: kit.lights ?? [],
    grip: kit.grip ?? [],
    audio: kit.audio ?? [],
    props: kit.props ?? [],
    other: kit.other ?? [],
    cameraSettingsNotes: kit.cameraSettingsNotes?.trim() || undefined,
  };
}

/** Merge legacy flat gearItems into shooting kit.other (deduped). */
export function shootingKitFromLegacy(
  kit: ProductionShootingKit | undefined | null,
  gearItems: string[] = []
): ProductionShootingKit {
  const base = normalizeShootingKit(kit);
  if (!gearItems.length) return base;
  const seen = new Set(
    [...Object.values(base).flat(), ...gearItems].filter((x) => typeof x === "string").map((s) => s.toLowerCase())
  );
  const other = [...base.other];
  for (const item of gearItems) {
    const t = item.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    other.push(t);
    seen.add(t.toLowerCase());
  }
  return { ...base, other };
}

export function flattenShootingKit(kit: ProductionShootingKit): string[] {
  const k = normalizeShootingKit(kit);
  const lines: string[] = [];
  const push = (prefix: string, items: string[]) => {
    for (const item of items) {
      const t = item.trim();
      if (t) lines.push(`${prefix}: ${t}`);
    }
  };
  push("Camera", k.cameraBodies);
  push("Lens", k.lenses);
  push("Support", k.supports);
  push("Light", k.lights);
  push("Grip", k.grip);
  push("Audio", k.audio);
  push("Prop", k.props);
  push("Gear", k.other);
  if (k.cameraSettingsNotes) lines.push(`Camera settings: ${k.cameraSettingsNotes}`);
  return lines;
}

export function shootingKitItemCount(kit: ProductionShootingKit): number {
  const k = normalizeShootingKit(kit);
  return (
    k.cameraBodies.length +
    k.lenses.length +
    k.supports.length +
    k.lights.length +
    k.grip.length +
    k.audio.length +
    k.props.length +
    k.other.length
  );
}

export function shootingKitHasGear(kit: ProductionShootingKit): boolean {
  return shootingKitItemCount(kit) > 0 || Boolean(kit.cameraSettingsNotes?.trim());
}
