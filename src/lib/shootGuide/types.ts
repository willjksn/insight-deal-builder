export const SHOOT_GUIDE_TABS = [
  "overview",
  "setup",
  "shots",
  "slate",
  "checklist",
  "notes",
] as const;

export type ShootGuideTab = (typeof SHOOT_GUIDE_TABS)[number];

export type ShootGuideSourceType = "quick_scene" | "script" | "blank";

export type ShootGuideStatus = "draft" | "ready" | "in_progress" | "complete";

export type ShootGuideMode = "plan" | "set" | "shoot";

export type ShootGuideShotStatus = "planned" | "ready" | "in_progress" | "complete";

export type ShootGuideShotCountMode = "auto" | "3" | "5" | "8" | "custom";

export type ShootGuideReferenceKind = "location" | "mood" | "subject" | "product";

export const CREATIVE_STYLE_PRESETS = [
  "cinematic",
  "horror",
  "suspense",
  "energetic",
  "luxury",
  "intimate",
  "commercial",
  "natural",
  "romantic",
  "documentary",
  "dramatic",
  "custom",
] as const;

export type CreativeStylePreset = (typeof CREATIVE_STYLE_PRESETS)[number];

export function creativeStyleSelectOptions() {
  return CREATIVE_STYLE_PRESETS.map((s) => ({
    value: s,
    label: s === "custom" ? "Custom" : s.charAt(0).toUpperCase() + s.slice(1),
  }));
}

export function isNamedCreativeStyle(
  value: string
): value is Exclude<CreativeStylePreset, "custom"> {
  return (CREATIVE_STYLE_PRESETS as readonly string[]).includes(value) && value !== "custom";
}

export function presetFromToneStyle(
  toneStyle: string | undefined,
  stored?: CreativeStylePreset | null
): CreativeStylePreset {
  if (stored === "custom") return "custom";
  const tone = (toneStyle || "").trim().toLowerCase();
  if (isNamedCreativeStyle(tone)) return tone;
  if (stored) return stored;
  if (tone && tone !== "not set yet") return "custom";
  return stored ?? "cinematic";
}

export const VISUAL_PRIORITY_OPTIONS = [
  "emotion",
  "performance",
  "face",
  "movement",
  "environment",
  "product",
  "dialogue",
  "suspense",
  "action",
] as const;

export type VisualPriority = (typeof VISUAL_PRIORITY_OPTIONS)[number];

export const CHECKLIST_GROUPS = [
  "room",
  "camera",
  "lighting",
  "audio",
  "continuity",
  "shot",
  "wrap",
] as const;

export type ShootGuideChecklistGroup = (typeof CHECKLIST_GROUPS)[number];

export const TAKE_STATUSES = [
  "GOOD",
  "HOLD",
  "NG",
  "FALSE START",
  "CIRCLE",
] as const;

export type ShootGuideTakeStatus = (typeof TAKE_STATUSES)[number];

export interface ShootGuideReference {
  id: string;
  kind: ShootGuideReferenceKind;
  storageUrl: string;
  storagePath: string;
  fileName?: string;
}

export interface ShootGuideSceneAnalysis {
  subject?: string;
  action?: string;
  emotionalGoal?: string;
  environment?: string;
  genreTone?: string;
}

export interface ShootGuideLocationAnalysis {
  layout?: string;
  subjectPlacement?: string;
  practicals?: string;
  windows?: string;
  obstacles?: string;
  backgrounds?: string;
  cameraZones?: string;
  lightZones?: string;
}

export interface ShootGuideVisualAnalysis {
  lightingDirection?: string;
  contrast?: string;
  colorTemperature?: string;
  composition?: string;
  depth?: string;
  lensCharacter?: string;
  cameraAngle?: string;
  palette?: string;
  energy?: string;
}

export interface ShootGuideLightingFixture {
  id: string;
  fixture?: string;
  ownedFixtureId?: string | null;
  role?: "key" | "fill" | "edge" | "accent" | "practical" | "negative";
  placement?: string;
  height?: string;
  direction?: string;
  kelvin?: string;
  modifier?: string;
  notes?: string;
}

export interface ShootGuideLightingPlan {
  cameraWb?: string;
  summary?: string;
  fixtures: ShootGuideLightingFixture[];
}

export interface ShootGuideEquipmentItem {
  id: string;
  category: string;
  ideal?: string;
  ownedMatch?: string;
  ownedCatalogId?: string | null;
  adjustment?: string;
}

export interface ShootGuideEquipmentPlan {
  summary?: string;
  items: ShootGuideEquipmentItem[];
}

export interface ShootGuideTakeRecord {
  id: string;
  takeNumber: number;
  timestamp?: string;
  status?: ShootGuideTakeStatus | null;
  note?: string;
  cameraIds?: string[];
  soundRoll?: string;
  flags?: {
    focus?: boolean;
    camera?: boolean;
    audio?: boolean;
    lighting?: boolean;
    performance?: boolean;
    continuity?: boolean;
  };
}

export interface ShootGuideShot {
  id: string;
  sceneId?: string | null;
  sceneLabel?: string;
  shotNumber: number;
  setupLabel?: string;
  title: string;
  purpose: string;
  status: ShootGuideShotStatus;
  framing?: string;
  composition?: string;
  cameraAngle?: string;
  cameraHeight?: string;
  cameraDistance?: string;
  cameraPosition?: string;
  cameraId?: string | null;
  lensId?: string | null;
  focalLength?: string;
  aperture?: string;
  focusStrategy?: string;
  supportId?: string | null;
  camera?: string;
  lens?: string;
  support?: string;
  movement?: string;
  lightingChanges?: string;
  cameraSettings?: string;
  blocking?: string;
  performanceDirection?: string;
  audioRequirements?: string;
  continuityRequirements?: string;
  specialRequirements?: string;
  reason?: string;
  takeRecords: ShootGuideTakeRecord[];
}

export interface ShootGuideChecklistItem {
  id: string;
  group: ShootGuideChecklistGroup;
  label: string;
  done: boolean;
}

export interface ShootGuideSlateRecord {
  id: string;
  shotId?: string | null;
  roll?: string;
  scene?: string;
  shot?: string;
  take?: number;
  camera?: string;
  cameraRoll?: string;
  soundRoll?: string;
  fps?: string;
  audioSync?: "sync" | "mos" | "";
  timecode?: string;
  date?: string;
  notes?: string;
}

export interface ShootGuideContinuityRecord {
  id: string;
  shotId?: string | null;
  photoUrl?: string;
  actorPosition?: string;
  propPosition?: string;
  wardrobe?: string;
  lightingState?: string;
  cameraState?: string;
}

export interface ShootGuideNote {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShootGuideOverview {
  sceneSummary: string;
  toneStyle: string;
  visualObjective: string;
  recommendedShotCount: number;
  visualStrategy: string;
  gearSummary: string;
}

export interface ShootGuideSetup {
  locationNotes: string;
  lightingNotes: string;
  cameraSettings: string;
  equipmentList: string;
  cameraPlacement: string;
}

export interface ShootGuide {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  sourceType: ShootGuideSourceType;
  sourceScriptId: string | null;
  sourceSceneId: string | null;
  sourceSceneLabel: string | null;
  prompt: string;
  status: ShootGuideStatus;
  mode: ShootGuideMode;
  creativeStylePreset: CreativeStylePreset;
  creativeIntent: string;
  visualPriorities: VisualPriority[];
  shotCountMode: ShootGuideShotCountMode;
  desiredShotCount: number;
  useMyEquipment: boolean;
  showIdealWhenNotOwned: boolean;
  currentShotId: string | null;
  createdBy: string;
  createdAt: unknown;
  updatedAt: unknown;
  references: ShootGuideReference[];
  sceneAnalysis: ShootGuideSceneAnalysis | null;
  locationAnalysis: ShootGuideLocationAnalysis | null;
  visualAnalysis: ShootGuideVisualAnalysis | null;
  lightingPlan: ShootGuideLightingPlan | null;
  equipmentPlan: ShootGuideEquipmentPlan | null;
  overview: ShootGuideOverview;
  setup: ShootGuideSetup;
  shots: ShootGuideShot[];
  checklist: ShootGuideChecklistItem[];
  slateRecords: ShootGuideSlateRecord[];
  continuityRecords: ShootGuideContinuityRecord[];
  notes: ShootGuideNote[];
}

export interface ShootGuideCreateInput {
  title?: string;
  sourceType: ShootGuideSourceType;
  sourceScriptId?: string | null;
  sourceSceneId?: string | null;
  sourceSceneLabel?: string | null;
  prompt?: string;
  creativeStylePreset?: CreativeStylePreset;
  creativeIntent?: string;
  visualPriorities?: VisualPriority[];
  shotCountMode?: ShootGuideShotCountMode;
  desiredShotCount?: number;
  useMyEquipment?: boolean;
  showIdealWhenNotOwned?: boolean;
  projectId?: string | null;
}

export interface ShootGuidePatch {
  title?: string;
  prompt?: string;
  status?: ShootGuideStatus;
  mode?: ShootGuideMode;
  creativeStylePreset?: CreativeStylePreset;
  creativeIntent?: string;
  visualPriorities?: VisualPriority[];
  shotCountMode?: ShootGuideShotCountMode;
  desiredShotCount?: number;
  useMyEquipment?: boolean;
  showIdealWhenNotOwned?: boolean;
  currentShotId?: string | null;
  projectId?: string | null;
  references?: ShootGuideReference[];
  sceneAnalysis?: ShootGuideSceneAnalysis | null;
  visualAnalysis?: ShootGuideVisualAnalysis | null;
  lightingPlan?: ShootGuideLightingPlan | null;
  overview?: Partial<ShootGuideOverview>;
  setup?: Partial<ShootGuideSetup>;
  shots?: ShootGuideShot[];
  checklist?: ShootGuideChecklistItem[];
  slateRecords?: ShootGuideSlateRecord[];
  continuityRecords?: ShootGuideContinuityRecord[];
  notes?: ShootGuideNote[];
}

export const SHOOT_GUIDE_GENERATE_STAGES = [
  "all",
  "scene",
  "strategy",
  "shots",
  "shot",
] as const;

export type ShootGuideGenerateStage = (typeof SHOOT_GUIDE_GENERATE_STAGES)[number];

export const SHOT_VARIANT_INSTRUCTIONS = {
  different_lens:
    "Try a different lens for this shot. Keep the story purpose. Put the new lens in lens/focalLength and explain why in reason.",
  change_angle:
    "Change the camera angle and height for this shot. Keep the story purpose. Explain the new angle in reason.",
  simplify:
    "Simplify this setup: fewer lights, simpler support, easier to execute on a small crew. Keep the story purpose.",
} as const;

export type ShotVariantKey = keyof typeof SHOT_VARIANT_INSTRUCTIONS;

export interface ShootGuideGenerateRequest {
  stage?: ShootGuideGenerateStage;
  shotId?: string;
  instruction?: string;
}
