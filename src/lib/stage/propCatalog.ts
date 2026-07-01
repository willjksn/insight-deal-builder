import { StagePropDefinition } from "@/lib/stage/types";

function p(
  partial: Omit<StagePropDefinition, "width" | "height"> & Partial<Pick<StagePropDefinition, "width" | "height">>
): StagePropDefinition {
  return {
    width: 48,
    height: 48,
    ...partial,
  };
}

export const STAGE_PROP_CATALOG: StagePropDefinition[] = [
  // Lighting
  p({ id: "softbox-square", name: "Softbox (square)", category: "lighting", tags: ["softbox", "key", "fill"], shape: "softbox", color: "#94a3b8", width: 56, height: 40 }),
  p({ id: "softbox-strip", name: "Strip softbox", category: "lighting", tags: ["strip", "rim", "edge"], shape: "strip-softbox", color: "#94a3b8", width: 24, height: 64 }),
  p({ id: "octabox", name: "Octabox", category: "lighting", tags: ["octa", "octabox", "key"], shape: "octabox", color: "#cbd5e1", width: 56, height: 56 }),
  p({ id: "umbrella-shoot", name: "Shoot-through umbrella", category: "lighting", tags: ["umbrella", "bounce"], shape: "umbrella", color: "#e2e8f0", width: 52, height: 52 }),
  p({ id: "umbrella-reflect", name: "Reflective umbrella", category: "lighting", tags: ["umbrella", "silver"], shape: "umbrella", color: "#64748b", width: 52, height: 52 }),
  p({ id: "beauty-dish", name: "Beauty dish", category: "lighting", tags: ["beauty", "dish"], shape: "beauty-dish", color: "#f1f5f9", width: 44, height: 44 }),
  p({ id: "open-face", name: "Open face / bare bulb", category: "lighting", tags: ["bare", "hard"], shape: "open-face", color: "#fbbf24", width: 36, height: 36 }),
  p({ id: "fresnel", name: "Fresnel / spotlight", category: "lighting", tags: ["spot", "fresnel"], shape: "fresnel", color: "#78716c", width: 40, height: 32 }),
  p({ id: "led-panel", name: "LED panel", category: "lighting", tags: ["led", "panel", "1x1"], shape: "led-panel", color: "#38bdf8", width: 48, height: 48 }),
  p({ id: "led-tube", name: "LED tube", category: "lighting", tags: ["tube", "accent"], shape: "led-tube", color: "#38bdf8", width: 64, height: 16 }),
  p({ id: "practical-lamp", name: "Practical lamp", category: "lighting", tags: ["practical", "lamp", "desk"], shape: "practical-lamp", color: "#fcd34d", width: 28, height: 28 }),
  p({ id: "boom-light", name: "Boom light", category: "lighting", tags: ["boom", "overhead"], shape: "softbox", color: "#94a3b8", width: 48, height: 48 }),
  p({ id: "ring-light", name: "Ring light", category: "lighting", tags: ["ring", "beauty"], shape: "ring-light", color: "#f472b6", width: 40, height: 40 }),

  // Modifiers
  p({ id: "diffuser-silk", name: "Silk / diffuser frame", category: "modifiers", tags: ["silk", "diffusion", "soften"], shape: "diffuser", color: "#fafafa", width: 56, height: 40 }),
  p({ id: "scrim", name: "Scrim", category: "modifiers", tags: ["scrim", "reduce"], shape: "scrim", color: "#e5e7eb", width: 48, height: 36 }),
  p({ id: "grid-eggcrate", name: "Soft grid / egg crate", category: "modifiers", tags: ["grid", "eggcrate", "control"], shape: "eggcrate", color: "#6b7280", width: 48, height: 36 }),
  p({ id: "bounce-white", name: "Bounce (white)", category: "modifiers", tags: ["bounce", "fill", "white"], shape: "bounce", color: "#ffffff", width: 40, height: 32 }),
  p({ id: "bounce-silver", name: "Bounce (silver)", category: "modifiers", tags: ["bounce", "silver"], shape: "bounce", color: "#9ca3af", width: 40, height: 32 }),
  p({ id: "bounce-gold", name: "Bounce (gold)", category: "modifiers", tags: ["bounce", "warm", "gold"], shape: "bounce", color: "#d97706", width: 40, height: 32 }),
  p({ id: "reflector-5in1", name: "Reflector (5-in-1)", category: "modifiers", tags: ["reflector", "fill"], shape: "reflector", color: "#f3f4f6", width: 36, height: 36 }),
  p({ id: "flag-solid", name: "Flag (solid / black)", category: "modifiers", tags: ["flag", "negative fill", "black", "cutter"], shape: "flag", color: "#1f2937", width: 40, height: 32 }),
  p({ id: "flag-finger", name: "Finger / dot", category: "modifiers", tags: ["finger", "dot", "flag", "small"], shape: "finger-flag", color: "#111827", width: 20, height: 12 }),
  p({ id: "floppy", name: "Floppy / overhead", category: "modifiers", tags: ["floppy", "overhead", "flag"], shape: "flag", color: "#374151", width: 56, height: 40 }),
  p({ id: "cutter", name: "Cutter", category: "modifiers", tags: ["cutter", "flag", "block"], shape: "flag", color: "#1f2937", width: 48, height: 28 }),
  p({ id: "barn-doors", name: "Barn doors", category: "modifiers", tags: ["barn doors", "barndoor", "control"], shape: "barn-doors", color: "#44403c", width: 36, height: 28 }),
  p({ id: "snoot", name: "Snoot", category: "modifiers", tags: ["snoot", "spot", "narrow"], shape: "snoot", color: "#292524", width: 24, height: 24 }),
  p({ id: "cookie", name: "Cookie / cucaloris", category: "modifiers", tags: ["cookie", "pattern", "shadow"], shape: "cookie", color: "#57534e", width: 48, height: 32 }),

  // Grip
  p({ id: "c-stand", name: "C-stand", category: "grip", tags: ["stand", "c-stand"], shape: "c-stand", color: "#71717a", width: 24, height: 24 }),
  p({ id: "sandbag", name: "Sandbag", category: "grip", tags: ["sandbag", "weight"], shape: "sandbag", color: "#a8a29e", width: 28, height: 20 }),
  p({ id: "apple-box", name: "Apple box", category: "grip", tags: ["apple box", "grip"], shape: "apple-box", color: "#d6d3d1", width: 32, height: 24 }),

  // Camera
  p({ id: "camera-body", name: "Camera", category: "camera", tags: ["camera", "fx6", "fx3", "body"], shape: "camera", color: "#1e293b", width: 40, height: 32 }),
  p({ id: "tripod", name: "Tripod", category: "camera", tags: ["tripod", "sticks"], shape: "tripod", color: "#334155", width: 36, height: 36 }),
  p({ id: "gimbal", name: "Gimbal", category: "camera", tags: ["gimbal", "stabilizer"], shape: "gimbal", color: "#475569", width: 32, height: 32 }),
  p({ id: "slider", name: "Slider", category: "camera", tags: ["slider", "rail"], shape: "slider", color: "#64748b", width: 80, height: 16 }),
  p({ id: "monitor", name: "Monitor", category: "camera", tags: ["monitor", "director"], shape: "monitor", color: "#0f172a", width: 36, height: 24 }),

  // Subject
  p({ id: "person", name: "Person", category: "subject", tags: ["person", "talent", "subject", "model"], shape: "person", color: "#64748b", width: 36, height: 36 }),
  p({ id: "person-two", name: "Two people", category: "subject", tags: ["person", "two", "couple"], shape: "person-two", color: "#64748b", width: 56, height: 36 }),

  // Furniture
  p({ id: "chair", name: "Chair", category: "furniture", tags: ["chair", "seat"], shape: "chair", color: "#a16207", width: 28, height: 28 }),
  p({ id: "couch", name: "Couch", category: "furniture", tags: ["couch", "sofa"], shape: "couch", color: "#92400e", width: 72, height: 32 }),
  p({ id: "bed", name: "Bed", category: "furniture", tags: ["bed"], shape: "bed", color: "#b45309", width: 80, height: 48 }),
  p({ id: "nightstand", name: "Nightstand", category: "furniture", tags: ["nightstand", "bedside"], shape: "nightstand", color: "#78350f", width: 28, height: 24 }),
  p({ id: "table", name: "Table", category: "furniture", tags: ["table"], shape: "table", color: "#854d0e", width: 48, height: 32 }),
  p({ id: "desk", name: "Desk", category: "furniture", tags: ["desk", "office"], shape: "desk", color: "#713f12", width: 56, height: 32 }),

  // Set
  p({ id: "backdrop", name: "Backdrop / seamless", category: "set", tags: ["backdrop", "seamless", "cyc"], shape: "backdrop", color: "#f8fafc", width: 120, height: 24 }),
  p({ id: "wall", name: "Wall", category: "set", tags: ["wall"], shape: "wall", color: "#e2e8f0", width: 96, height: 16 }),
  p({ id: "window", name: "Window", category: "set", tags: ["window", "daylight"], shape: "window", color: "#bae6fd", width: 48, height: 12 }),
  p({ id: "door", name: "Door", category: "set", tags: ["door", "entry"], shape: "door", color: "#d4d4d8", width: 32, height: 16 }),

  // Audio
  p({ id: "boom-mic", name: "Boom mic", category: "audio", tags: ["boom", "mic", "audio"], shape: "boom-mic", color: "#374151", width: 48, height: 48 }),
  p({ id: "lav", name: "Lav pack", category: "audio", tags: ["lav", "wireless"], shape: "lav", color: "#4b5563", width: 16, height: 16 }),
];

export function findStageProp(id: string): StagePropDefinition | undefined {
  return STAGE_PROP_CATALOG.find((p) => p.id === id);
}

export function searchStageProps(query: string, category?: string): StagePropDefinition[] {
  const q = query.trim().toLowerCase();
  return STAGE_PROP_CATALOG.filter((prop) => {
    if (category && prop.category !== category) return false;
    if (!q) return true;
    return (
      prop.name.toLowerCase().includes(q) ||
      prop.tags.some((t) => t.toLowerCase().includes(q)) ||
      prop.category.includes(q)
    );
  });
}
