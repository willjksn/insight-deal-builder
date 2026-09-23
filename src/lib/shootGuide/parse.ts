import { emptyShot } from "./defaults";
import type {
  ShootGuideLightingFixture,
  ShootGuideLightingPlan,
  ShootGuideSceneAnalysis,
  ShootGuideSetup,
  ShootGuideShot,
  ShootGuideShotStatus,
  ShootGuideVisualAnalysis,
} from "./types";

function asObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function parseShotStatus(v: unknown, fallback: ShootGuideShotStatus = "planned"): ShootGuideShotStatus {
  const s = str(v).toLowerCase();
  if (s === "planned" || s === "ready" || s === "in_progress" || s === "complete") return s;
  return fallback;
}

export function parseSceneAnalysis(raw: unknown): ShootGuideSceneAnalysis {
  const o = asObject(raw);
  const nested = asObject(o.sceneAnalysis);
  const src = Object.keys(nested).length ? nested : o;
  return {
    subject: str(src.subject) || undefined,
    action: str(src.action) || undefined,
    emotionalGoal: str(src.emotionalGoal) || undefined,
    environment: str(src.environment) || undefined,
    genreTone: str(src.genreTone) || undefined,
  };
}

export function parseVisualAnalysis(raw: unknown): ShootGuideVisualAnalysis {
  const o = asObject(raw);
  return {
    lightingDirection: str(o.lightingDirection) || undefined,
    contrast: str(o.contrast) || undefined,
    colorTemperature: str(o.colorTemperature) || undefined,
    composition: str(o.composition) || undefined,
    depth: str(o.depth) || undefined,
    lensCharacter: str(o.lensCharacter) || undefined,
    cameraAngle: str(o.cameraAngle) || undefined,
    palette: str(o.palette) || undefined,
    energy: str(o.energy) || undefined,
  };
}

function parseFixture(raw: unknown, index: number): ShootGuideLightingFixture | null {
  const o = asObject(raw);
  const fixture = str(o.fixture);
  const placement = str(o.placement);
  const role = str(o.role);
  if (!fixture && !placement) return null;
  const allowed = ["key", "fill", "edge", "accent", "practical", "negative"] as const;
  return {
    id: str(o.id, `fx_${String(index + 1).padStart(2, "0")}`),
    fixture: fixture || undefined,
    ownedFixtureId: str(o.ownedFixtureId) || null,
    role: allowed.includes(role as (typeof allowed)[number])
      ? (role as ShootGuideLightingFixture["role"])
      : undefined,
    placement: placement || undefined,
    height: str(o.height) || undefined,
    direction: str(o.direction) || undefined,
    kelvin: str(o.kelvin) || undefined,
    modifier: str(o.modifier) || undefined,
    notes: str(o.notes) || undefined,
  };
}

export function parseLightingPlan(raw: unknown): ShootGuideLightingPlan {
  const o = asObject(raw);
  const list = Array.isArray(o.fixtures) ? o.fixtures : [];
  return {
    cameraWb: str(o.cameraWb) || undefined,
    summary: str(o.summary) || undefined,
    fixtures: list
      .map((item, i) => parseFixture(item, i))
      .filter((x): x is ShootGuideLightingFixture => Boolean(x)),
  };
}

export interface ParsedShootGuideStrategy {
  overview: {
    sceneSummary: string;
    toneStyle: string;
    visualObjective: string;
    recommendedShotCount: number;
    visualStrategy: string;
    gearSummary: string;
  };
  setup: ShootGuideSetup;
  visualAnalysis: ShootGuideVisualAnalysis;
  lightingPlan: ShootGuideLightingPlan;
}

export function parseStrategy(raw: unknown, shotCount: number): ParsedShootGuideStrategy {
  const o = asObject(raw);
  const overview = asObject(o.overview);
  const setup = asObject(o.setup);
  return {
    overview: {
      sceneSummary: str(overview.sceneSummary) || str(o.sceneSummary),
      toneStyle: str(overview.toneStyle) || str(o.toneStyle),
      visualObjective: str(overview.visualObjective) || str(o.visualObjective),
      recommendedShotCount: num(overview.recommendedShotCount, num(o.recommendedShotCount, shotCount)),
      visualStrategy: str(overview.visualStrategy) || str(o.visualStrategy),
      gearSummary: str(overview.gearSummary) || str(o.gearSummary),
    },
    setup: {
      locationNotes: str(setup.locationNotes) || str(o.locationNotes),
      lightingNotes: str(setup.lightingNotes) || str(o.lightingNotes),
      cameraSettings: str(setup.cameraSettings) || str(o.cameraSettings),
      equipmentList: str(setup.equipmentList) || str(o.equipmentList),
      cameraPlacement: str(setup.cameraPlacement) || str(o.cameraPlacement),
    },
    visualAnalysis: parseVisualAnalysis(o.visualAnalysis ?? o),
    lightingPlan: parseLightingPlan(o.lightingPlan ?? o),
  };
}

function parseShotFields(o: Record<string, unknown>, index: number, sceneLabel?: string | null): ShootGuideShot {
  const n = num(o.shotNumber, index + 1);
  const title = str(o.title, `Shot ${String(n).padStart(2, "0")}`);
  return {
    ...emptyShot(n, sceneLabel),
    id: str(o.id) || crypto.randomUUID(),
    sceneId: str(o.sceneId) || null,
    sceneLabel: str(o.sceneLabel, sceneLabel || "") || undefined,
    shotNumber: n,
    setupLabel: str(o.setupLabel, `Setup ${String(n).padStart(2, "0")}`),
    title,
    purpose: str(o.purpose),
    status: parseShotStatus(o.status),
    framing: str(o.framing),
    composition: str(o.composition),
    cameraAngle: str(o.cameraAngle),
    cameraHeight: str(o.cameraHeight),
    cameraDistance: str(o.cameraDistance),
    cameraPosition: str(o.cameraPosition),
    focalLength: str(o.focalLength),
    aperture: str(o.aperture),
    focusStrategy: str(o.focusStrategy),
    camera: str(o.camera) || str(o.cameraBody),
    lens: str(o.lens),
    support: str(o.support),
    movement: str(o.movement),
    lightingChanges: str(o.lightingChanges),
    cameraSettings: str(o.cameraSettings),
    blocking: str(o.blocking),
    performanceDirection: str(o.performanceDirection),
    audioRequirements: str(o.audioRequirements),
    continuityRequirements: str(o.continuityRequirements),
    specialRequirements: str(o.specialRequirements),
    reason: str(o.reason),
    takeRecords: [],
  };
}

export function parseGeneratedShots(raw: unknown, sceneLabel?: string | null): ShootGuideShot[] {
  const o = asObject(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(o.shots)
      ? o.shots
      : o.shot
        ? [o.shot]
        : [];
  const shots: ShootGuideShot[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = asObject(list[i]);
    const title = str(item.title);
    const purpose = str(item.purpose);
    if (!title && !purpose) continue;
    shots.push(parseShotFields(item, i, sceneLabel));
  }
  return shots.map((s, i) => ({ ...s, shotNumber: i + 1 }));
}

export function parseGeneratedShot(raw: unknown, sceneLabel?: string | null): ShootGuideShot | null {
  const shots = parseGeneratedShots(raw, sceneLabel);
  return shots[0] ?? null;
}

export function mergeGeneratedShots(
  existing: ShootGuideShot[],
  generated: ShootGuideShot[]
): ShootGuideShot[] {
  return generated.map((g, i) => {
    const prev = existing[i];
    return {
      ...g,
      id: prev?.id ?? g.id,
      shotNumber: i + 1,
      sceneLabel: g.sceneLabel || prev?.sceneLabel,
      takeRecords: prev?.takeRecords ?? [],
      status: prev && prev.status !== "planned" ? prev.status : g.status,
    };
  });
}

export function replaceGeneratedShot(
  existing: ShootGuideShot[],
  shotId: string,
  next: ShootGuideShot
): ShootGuideShot[] {
  return existing.map((s) => {
    if (s.id !== shotId) return s;
    return {
      ...next,
      id: s.id,
      shotNumber: s.shotNumber,
      setupLabel: next.setupLabel || s.setupLabel,
      sceneId: next.sceneId ?? s.sceneId,
      sceneLabel: next.sceneLabel || s.sceneLabel,
      takeRecords: s.takeRecords,
      status: s.status !== "planned" ? s.status : next.status,
    };
  });
}
