import type { EquipmentCatalogItem } from "@/lib/types";
import type {
  LiveEquipmentMatchRow,
  LiveEquipmentRequirement,
} from "@/lib/liveProduction/types";

/** Map free-text requirement labels onto catalog categories / name tokens. */
const CATEGORY_HINTS: Array<{ tokens: string[]; categories: string[] }> = [
  { tokens: ["led", "video wall", "wall"], categories: ["LED", "Video", "Monitor", "Other"] },
  { tokens: ["processor", "scaler"], categories: ["LED", "Video", "Other"] },
  { tokens: ["switcher", "atem", "playback", "media server"], categories: ["Video", "Other"] },
  { tokens: ["camera", "imag"], categories: ["Camera"] },
  { tokens: ["lens"], categories: ["Lens"] },
  { tokens: ["projector", "screen", "monitor", "confidence"], categories: ["Monitor", "Other"] },
  {
    tokens: ["console", "mixer", "line array", "speaker", "sub", "pa", "wireless", "microphone", "mic", "audio"],
    categories: ["Audio"],
  },
  {
    tokens: ["light", "lighting", "moving head", "uplight", "spotlight"],
    categories: ["Lighting"],
  },
  { tokens: ["truss", "motor", "rigging"], categories: ["Support", "Grip", "Truss", "Rigging", "Other"] },
  { tokens: ["stage", "staging", "deck"], categories: ["Staging", "Other"] },
  { tokens: ["generator", "power", "distro"], categories: ["Power", "Other"] },
  { tokens: ["intercom", "comms"], categories: ["Audio", "Other"] },
  { tokens: ["stream", "encoder"], categories: ["Video", "Other"] },
];

function qtyOwned(item: EquipmentCatalogItem): number {
  const q = item.quantityOwned ?? item.quantityAvailable;
  if (typeof q === "number" && Number.isFinite(q) && q > 0) return Math.floor(q);
  return item.active === false ? 0 : 1;
}

function scoreItem(req: LiveEquipmentRequirement, item: EquipmentCatalogItem): number {
  const label = `${req.label} ${req.categoryHint || ""}`.toLowerCase();
  const hay = `${item.name} ${item.category} ${item.brand || ""} ${item.model || ""}`.toLowerCase();
  let score = 0;
  for (const word of label.split(/[^a-z0-9]+/).filter((w) => w.length > 2)) {
    if (hay.includes(word)) score += 2;
  }
  const hint = CATEGORY_HINTS.find((h) => h.tokens.some((t) => label.includes(t)));
  if (hint && hint.categories.some((c) => item.category.toLowerCase() === c.toLowerCase())) {
    score += 3;
  }
  if (item.active === false) score -= 5;
  return score;
}

export function matchEquipmentRequirements(
  requirements: LiveEquipmentRequirement[],
  catalog: EquipmentCatalogItem[]
): { rows: LiveEquipmentMatchRow[]; ownedCoveragePct: number; matchPct: number; subRentalSummary: string } {
  const active = catalog.filter((c) => c.active !== false);
  const rows: LiveEquipmentMatchRow[] = requirements.map((req) => {
    const ranked = active
      .map((item) => ({ item, score: scoreItem(req, item) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.item;
    const owned = best ? qtyOwned(best) : 0;
    const needed = Math.max(1, req.quantity || 1);
    let status: LiveEquipmentMatchRow["status"] = "unmatched";
    if (best && owned >= needed) status = "owned";
    else if (best && owned > 0) status = "partial";
    else if (best) status = "subrent";
    else status = "subrent";

    return {
      requirementId: req.id,
      label: req.label,
      quantityNeeded: needed,
      quantityOwned: owned,
      status: best ? status : "subrent",
      catalogItemIds: best ? [best.id] : [],
      estimatedDailyRate: best?.dailyRate,
      notes:
        status === "partial"
          ? `Own ${owned} / need ${needed}`
          : status === "owned"
            ? "Owned"
            : best
              ? "Need additional units"
              : "Not in catalog",
    };
  });

  const required = rows.filter((r) => {
    const req = requirements.find((x) => x.id === r.requirementId);
    return !req || req.priority !== "preferred";
  });
  const pool = required.length ? required : rows;
  const ownedUnits = pool.reduce((n, r) => n + Math.min(r.quantityOwned, r.quantityNeeded), 0);
  const neededUnits = pool.reduce((n, r) => n + r.quantityNeeded, 0) || 1;
  const ownedCoveragePct = Math.round((ownedUnits / neededUnits) * 100);
  const fullOwned = pool.filter((r) => r.status === "owned").length;
  const matchPct = Math.round((fullOwned / (pool.length || 1)) * 100);

  const gaps = rows
    .filter((r) => r.status !== "owned")
    .map((r) =>
      r.status === "partial"
        ? `${r.label} (+${r.quantityNeeded - r.quantityOwned})`
        : r.label
    );
  const subRentalSummary = gaps.length ? gaps.slice(0, 6).join(" · ") : "None — full coverage";

  return { rows, ownedCoveragePct, matchPct, subRentalSummary };
}
