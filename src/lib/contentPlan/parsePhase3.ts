import type {
  ChecklistItem,
  CoverageItem,
  CoverageItemStatus,
  CoverageMoment,
  CoveragePlan,
  ShootChecklist,
  ShootOrderItem,
  ShootOrderPlan,
} from "@/lib/contentPlan/types";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asCoverageStatus(v: unknown): CoverageItemStatus {
  if (v === "captured" || v === "missing" || v === "optional" || v === "planned") {
    return v;
  }
  return "planned";
}

function parseCoverageItem(raw: unknown, prefix: string, i: number): CoverageItem | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const label = str(o.label);
  if (!label) return null;
  return {
    id: str(o.id, `${prefix}_${String(i + 1).padStart(2, "0")}`),
    label,
    category: str(o.category, "general"),
    why: str(o.why) || undefined,
    relatedShotIds: strArr(o.relatedShotIds),
    status: asCoverageStatus(o.status),
    critical: Boolean(o.critical),
  };
}

function parseItems(raw: unknown, prefix: string): CoverageItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CoverageItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = parseCoverageItem(raw[i], prefix, i);
    if (item) out.push(item);
  }
  return out;
}

export function parseCoveragePlan(raw: unknown): CoveragePlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const momentsRaw = Array.isArray(o.moments) ? o.moments : [];
  const moments: CoverageMoment[] = [];
  for (let i = 0; i < momentsRaw.length; i++) {
    const m = (momentsRaw[i] && typeof momentsRaw[i] === "object"
      ? momentsRaw[i]
      : {}) as Record<string, unknown>;
    const title = str(m.title, `Moment ${i + 1}`);
    moments.push({
      id: str(m.id, `moment_${String(i + 1).padStart(2, "0")}`),
      title,
      description: str(m.description) || undefined,
      required: parseItems(m.required, `m${i + 1}_req`),
      optional: parseItems(m.optional, `m${i + 1}_opt`),
    });
  }

  return {
    overview: str(o.overview),
    moments,
    planned: parseItems(o.planned, "planned"),
    missing: parseItems(o.missing, "missing").map((item) =>
      item.status === "planned" ? { ...item, status: "missing" as const } : item
    ),
    pickupsBeforeWrap: strArr(o.pickupsBeforeWrap),
    warnings: strArr(o.warnings),
  };
}

function parseOrderItems(raw: unknown): ShootOrderItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShootOrderItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const o = (raw[i] && typeof raw[i] === "object" ? raw[i] : {}) as Record<
      string,
      unknown
    >;
    const shotId = str(o.shotId);
    const shotName = str(o.shotName, `Shot ${i + 1}`);
    if (!shotId && !shotName) continue;
    out.push({
      shotId: shotId || `shot_${String(i + 1).padStart(2, "0")}`,
      shotNumber: num(o.shotNumber, i + 1),
      shotName,
      groupLabel: str(o.groupLabel) || undefined,
      reason: str(o.reason) || undefined,
    });
  }
  return out;
}

export function parseShootOrderPlan(raw: unknown): ShootOrderPlan {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    storyOrder: parseOrderItems(o.storyOrder),
    shootOrder: parseOrderItems(o.shootOrder),
    setupChangeCount:
      typeof o.setupChangeCount === "number" ? o.setupChangeCount : undefined,
    groupingNotes: strArr(o.groupingNotes),
    efficiencyReason: str(o.efficiencyReason) || undefined,
  };
}

function parseChecklistItems(raw: unknown, prefix: string): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ChecklistItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === "string" && item.trim()) {
      out.push({
        id: `${prefix}_${String(i + 1).padStart(2, "0")}`,
        label: item.trim(),
        done: false,
      });
      continue;
    }
    const o = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const label = str(o.label);
    if (!label) continue;
    out.push({
      id: str(o.id, `${prefix}_${String(i + 1).padStart(2, "0")}`),
      label,
      done: Boolean(o.done),
    });
  }
  return out;
}

export function parseShootChecklist(raw: unknown): ShootChecklist {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    beforeShooting: parseChecklistItems(o.beforeShooting, "bs"),
    beforeMovingCamera: parseChecklistItems(o.beforeMovingCamera, "bmc"),
    beforeWrap: parseChecklistItems(o.beforeWrap, "bw"),
  };
}
