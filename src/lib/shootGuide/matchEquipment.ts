import type { EquipmentCatalogItem } from "@/lib/types";
import type {
  ShootGuide,
  ShootGuideEquipmentItem,
  ShootGuideEquipmentPlan,
  ShootGuideShot,
} from "./types";

export type CatalogGear = Pick<
  EquipmentCatalogItem,
  "id" | "name" | "category" | "brand" | "model" | "active"
>;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
}

function tokens(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 1 && t !== "mm" && t !== "the");
}

export function focalMm(raw: string): number | null {
  const m = raw.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function haystack(item: CatalogGear): string {
  return [item.name, item.brand, item.model].filter(Boolean).join(" ");
}

export function scoreCatalogMatch(query: string, item: CatalogGear): number {
  if (item.active === false) return 0;
  const q = norm(query);
  const h = norm(haystack(item));
  if (!q || !h) return 0;
  if (h === q) return 120;
  if (h.includes(q) || q.includes(h)) return 100;
  const qt = tokens(query);
  const ht = new Set(tokens(haystack(item)));
  if (!qt.length) return 0;
  let overlap = 0;
  for (const t of qt) if (ht.has(t)) overlap += 1;
  let score = (overlap / qt.length) * 70;
  const qMm = focalMm(query);
  const iMm = focalMm(haystack(item));
  if (qMm != null && iMm != null) {
    score += Math.max(0, 55 - Math.abs(qMm - iMm));
  }
  return score;
}

export function bestCatalogMatch(
  query: string,
  catalog: CatalogGear[],
  category?: string
): CatalogGear | null {
  const q = query.trim();
  if (!q) return null;
  const pool = category
    ? catalog.filter((i) => i.active !== false && i.category === category)
    : catalog.filter((i) => i.active !== false);
  let best: CatalogGear | null = null;
  let bestScore = 18;
  for (const item of pool) {
    const s = scoreCatalogMatch(q, item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

function sameGear(ideal: string, ownedName: string): boolean {
  const a = norm(ideal);
  const b = norm(ownedName);
  if (!a || !b) return false;
  if (a === b || b.includes(a) || a.includes(b)) return true;
  const aMm = focalMm(ideal);
  const bMm = focalMm(ownedName);
  if (aMm != null && bMm != null && Math.abs(aMm - bMm) <= 2) return true;
  return false;
}

function lensAdjustment(ideal: string, owned: string): string {
  const want = focalMm(ideal);
  const have = focalMm(owned);
  if (want != null && have != null && want !== have) {
    const closer = have < want;
    return closer
      ? `Use ${owned} and move closer (or open up) to keep similar isolation — ideal was ${ideal}.`
      : `Use ${owned} and step back to keep similar framing — ideal was ${ideal}.`;
  }
  return `Use ${owned} in place of ${ideal}.`;
}

function supportAdjustment(ideal: string, owned: string): string {
  return `Use ${owned} instead of ${ideal}.`;
}

function itemId(category: string, key: string): string {
  return `eq_${category}_${norm(key).replace(/\s+/g, "_")}`.slice(0, 80);
}

export function applyEquipmentMatch(
  shots: ShootGuideShot[],
  catalog: CatalogGear[],
  opts: { useMyEquipment: boolean; showIdealWhenNotOwned?: boolean }
): { shots: ShootGuideShot[]; plan: ShootGuideEquipmentPlan } {
  const items: ShootGuideEquipmentItem[] = [];
  const seen = new Set<string>();

  function pushItem(row: ShootGuideEquipmentItem) {
    const key = `${row.category}:${row.ownedCatalogId || row.ideal || row.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(row);
  }

  const nextShots = shots.map((shot) => {
    const patched = { ...shot };
    const pairs: { field: "camera" | "lens" | "support"; category: string; query: string }[] = [
      { field: "camera", category: "Camera", query: shot.camera || "" },
      { field: "lens", category: "Lens", query: shot.lens || shot.focalLength || "" },
      { field: "support", category: "Support", query: shot.support || "" },
    ];
    for (const pair of pairs) {
      const ideal = pair.query.trim();
      if (!ideal) continue;
      const owned = opts.useMyEquipment ? bestCatalogMatch(ideal, catalog, pair.category) : null;
      const ownedName = owned?.name;
      const match = ownedName && sameGear(ideal, ownedName);
      const adjustment =
        opts.useMyEquipment && ownedName && !match
          ? pair.category === "Lens"
            ? lensAdjustment(ideal, ownedName)
            : pair.category === "Support"
              ? supportAdjustment(ideal, ownedName)
              : `Use ${ownedName} in place of ${ideal}.`
          : undefined;
      if (owned) {
        if (pair.field === "camera") patched.cameraId = owned.id;
        if (pair.field === "lens") patched.lensId = owned.id;
        if (pair.field === "support") patched.supportId = owned.id;
        if (match) {
          patched[pair.field] = owned.name;
        }
      }
      pushItem({
        id: itemId(pair.category, owned?.id || ideal),
        category: pair.category,
        ideal,
        ownedMatch: ownedName,
        ownedCatalogId: owned?.id ?? null,
        adjustment,
      });
    }
    return patched;
  });

  return {
    shots: nextShots,
    plan: {
      summary: summarizePlan(items, opts.useMyEquipment),
      items,
    },
  };
}

function summarizePlan(items: ShootGuideEquipmentItem[], useMyEquipment: boolean): string {
  if (!items.length) return "No gear listed on shots yet.";
  if (!useMyEquipment) {
    return `Ideal package (${items.length} items). Not limited to the Equipment Catalog.`;
  }
  const matched = items.filter((i) => i.ownedCatalogId).length;
  const subs = items.filter((i) => i.adjustment).length;
  if (!matched) return "Use My Equipment is on, but nothing in the catalog matched these recs.";
  if (subs) {
    return `${matched} owned matches. ${subs} substitution${subs === 1 ? "" : "s"} — keep the owned item and use the adjustment.`;
  }
  return `${matched} items matched to the Equipment Catalog.`;
}

export function needsEquipmentPlan(guide: Pick<ShootGuide, "shots" | "equipmentPlan">): boolean {
  const shots = guide.shots ?? [];
  if (!shots.length) return false;
  return !(guide.equipmentPlan?.items?.length);
}
