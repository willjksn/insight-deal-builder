import {
  type CreativeStylePreset,
  type ShootGuide,
  type ShootGuideCreateInput,
  type ShootGuideSetup,
  type ShootGuideShot,
  type ShootGuideShotCountMode,
  type VisualPriority,
} from "./types";
import { applyShotSequence, buildOverview, buildSetup, buildShotSequence } from "./autofill";

export { buildOverview } from "./autofill";

export const AUTO_SHOT_COUNT = 5;

export function resolveShotCount(
  mode: ShootGuideShotCountMode | undefined,
  custom?: number
): number {
  if (mode === "3") return 3;
  if (mode === "5") return 5;
  if (mode === "8") return 8;
  if (mode === "custom") {
    const n = Math.round(Number(custom));
    if (Number.isFinite(n) && n >= 1 && n <= 40) return n;
  }
  return AUTO_SHOT_COUNT;
}

export function titleFromPrompt(prompt: string, fallback = "Untitled scene"): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  const first = cleaned.split(/[.!?]/)[0]?.trim() || cleaned;
  return first.length > 72 ? `${first.slice(0, 69).trimEnd()}…` : first;
}

export function emptyShot(
  shotNumber: number,
  sceneLabel?: string | null
): ShootGuideShot {
  const n = String(shotNumber).padStart(2, "0");
  return {
    id: crypto.randomUUID(),
    sceneId: null,
    sceneLabel: sceneLabel || undefined,
    shotNumber,
    setupLabel: `Setup ${n}`,
    title: `Shot ${n}`,
    purpose: "",
    status: "planned",
    framing: "",
    composition: "",
    cameraAngle: "",
    cameraHeight: "",
    cameraDistance: "",
    cameraPosition: "",
    cameraId: null,
    lensId: null,
    focalLength: "",
    aperture: "",
    focusStrategy: "",
    supportId: null,
    camera: "",
    lens: "",
    support: "",
    movement: "",
    lightingChanges: "",
    cameraSettings: "",
    blocking: "",
    performanceDirection: "",
    audioRequirements: "",
    continuityRequirements: "",
    specialRequirements: "",
    reason: "",
    duration: "",
    previewIntent: null,
    previewNote: "",
    visualStatus: "planned",
    visualAssets: [],
    takeRecords: [],
  };
}

export function placeholderShots(
  count: number,
  sceneLabel?: string | null
): ShootGuideShot[] {
  return Array.from({ length: count }, (_, i) => emptyShot(i + 1, sceneLabel));
}

export function emptySetup(): ShootGuideSetup {
  return {
    locationNotes: "",
    lightingNotes: "",
    cameraSettings: "",
    equipmentList: "",
    cameraPlacement: "",
  };
}

export function normalizeCreateInput(raw: ShootGuideCreateInput): {
  title: string;
  sourceType: ShootGuideCreateInput["sourceType"];
  sourceScriptId: string | null;
  sourceSceneId: string | null;
  sourceSceneLabel: string | null;
  prompt: string;
  creativeStylePreset: CreativeStylePreset;
  creativeIntent: string;
  visualPriorities: VisualPriority[];
  shotCountMode: ShootGuideShotCountMode;
  desiredShotCount: number;
  useMyEquipment: boolean;
  showIdealWhenNotOwned: boolean;
  projectId: string | null;
} {
  const sourceType = raw.sourceType ?? "quick_scene";
  const prompt = String(raw.prompt || "").trim();
  const sceneLabel = raw.sourceSceneLabel?.trim() || null;
  const shotCountMode = raw.shotCountMode ?? "auto";
  const desiredShotCount = resolveShotCount(shotCountMode, raw.desiredShotCount);
  const preset = raw.creativeStylePreset ?? "cinematic";
  const creativeIntent =
    String(raw.creativeIntent || "").trim() ||
    (preset === "custom" ? "" : preset);
  const visualPriorities = Array.isArray(raw.visualPriorities)
    ? raw.visualPriorities
    : [];
  const useMyEquipment = Boolean(raw.useMyEquipment);
  return {
    title: String(raw.title || "").trim() || titleFromPrompt(prompt, sceneLabel || "Untitled scene"),
    sourceType,
    sourceScriptId: raw.sourceScriptId?.trim() || null,
    sourceSceneId: raw.sourceSceneId?.trim() || null,
    sourceSceneLabel: sceneLabel,
    prompt,
    creativeStylePreset: preset,
    creativeIntent,
    visualPriorities,
    shotCountMode,
    desiredShotCount,
    useMyEquipment,
    showIdealWhenNotOwned: useMyEquipment
      ? raw.showIdealWhenNotOwned !== false
      : Boolean(raw.showIdealWhenNotOwned),
    projectId: raw.projectId?.trim() || null,
  };
}

export function createGuideDocument(
  uid: string,
  input: ShootGuideCreateInput
): Omit<ShootGuide, "id" | "createdAt" | "updatedAt"> {
  const normalized = normalizeCreateInput(input);
  const autofill = {
    prompt: normalized.prompt,
    creativeIntent: normalized.creativeIntent,
    visualPriorities: normalized.visualPriorities,
    shotCount: normalized.desiredShotCount,
    useMyEquipment: normalized.useMyEquipment,
    showIdealWhenNotOwned: normalized.showIdealWhenNotOwned,
  };
  const shots = applyShotSequence(
    placeholderShots(normalized.desiredShotCount, normalized.sourceSceneLabel),
    buildShotSequence(
      normalized.desiredShotCount,
      normalized.visualPriorities,
      normalized.creativeIntent
    )
  );
  return {
    userId: uid,
    createdBy: uid,
    projectId: normalized.projectId,
    title: normalized.title,
    sourceType: normalized.sourceType,
    sourceScriptId: normalized.sourceScriptId,
    sourceSceneId: normalized.sourceSceneId,
    sourceSceneLabel: normalized.sourceSceneLabel,
    prompt: normalized.prompt,
    outputType:
      input.outputType === "real" || input.outputType === "ai" || input.outputType === "hybrid"
        ? input.outputType
        : "hybrid",
    status: "draft",
    mode: "plan",
    creativeStylePreset: normalized.creativeStylePreset,
    creativeIntent: normalized.creativeIntent,
    visualPriorities: normalized.visualPriorities,
    shotCountMode: normalized.shotCountMode,
    desiredShotCount: normalized.desiredShotCount,
    useMyEquipment: normalized.useMyEquipment,
    showIdealWhenNotOwned: normalized.showIdealWhenNotOwned,
    currentShotId: shots[0]?.id ?? null,
    references: [],
    sceneAnalysis: null,
    locationAnalysis: null,
    visualAnalysis: null,
    lightingPlan: null,
    placementPlan: null,
    equipmentPlan: null,
    overview: buildOverview(autofill),
    setup: buildSetup(autofill),
    shots,
    checklist: [],
    slateRecords: [],
    continuityRecords: [],
    notes: [],
  };
}

export function completedShotCount(shots: ShootGuideShot[]): number {
  return shots.filter((s) => s.status === "complete").length;
}
