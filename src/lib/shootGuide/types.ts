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

export type ShootGuideReferenceKind = "location" | "mood" | "subject" | "product" | "wardrobe";

export const SCENE_OUTPUT_TYPES = ["real", "ai", "hybrid"] as const;

export type SceneOutputType = (typeof SCENE_OUTPUT_TYPES)[number];

export const SCENE_OUTPUT_LABELS: Record<SceneOutputType, string> = {
  real: "Real",
  ai: "AI",
  hybrid: "Hybrid",
};

export const SHOT_PREVIEW_INTENTS = ["storyboard", "ai_still", "animation", "real"] as const;

export type ShotPreviewIntent = (typeof SHOT_PREVIEW_INTENTS)[number];

/** Visual workflow status. Separate from the older on-set `status` field. */
export const SHOT_VISUAL_STATUSES = [
  "planned",
  "storyboarded",
  "ai_previs",
  "real_footage",
  "ready",
] as const;

export type ShotVisualStatus = (typeof SHOT_VISUAL_STATUSES)[number];

export const SHOT_VISUAL_STATUS_LABELS: Record<ShotVisualStatus, string> = {
  planned: "Planned",
  storyboarded: "Storyboarded",
  ai_previs: "AI Previs",
  real_footage: "Real Footage",
  ready: "Ready",
};

export const SHOT_ASSET_TYPES = ["storyboard", "ai_still", "ai_motion", "real_footage"] as const;

export type ShotAssetType = (typeof SHOT_ASSET_TYPES)[number];

export const SHOT_ASSET_TYPE_LABELS: Record<ShotAssetType, string> = {
  storyboard: "Storyboard Frame",
  ai_still: "AI Still",
  ai_motion: "AI Motion Previs",
  real_footage: "Real Footage",
};

export const SHOT_ASSET_STATUSES = ["pending", "ready", "failed"] as const;

export type ShotAssetStatus = (typeof SHOT_ASSET_STATUSES)[number];

export interface ShotVisualAsset {
  id: string;
  sceneId: string;
  shotId: string;
  type: ShotAssetType;
  /** Provider id such as "upload", or a future generator name. Null when queued. */
  provider: string | null;
  createdAt: string;
  storageUrl: string | null;
  storagePath: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  prompt: string | null;
  status: ShotAssetStatus;
  error?: string | null;
  providerTaskId?: string | null;
  model?: string | null;
  quality?: "fast" | "high" | null;
  estimatedCredits?: number | null;
  actualCredits?: number | null;
  durationSeconds?: number | null;
}

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

export const TAKE_STATUS_LABELS: Record<ShootGuideTakeStatus, string> = {
  GOOD: "GOOD",
  HOLD: "HOLD",
  NG: "NG",
  "FALSE START": "FALSE START",
  CIRCLE: "CIRCLE / BEST",
};

export const CHECKLIST_GROUP_LABELS: Record<ShootGuideChecklistGroup, string> = {
  room: "Room",
  camera: "Camera",
  lighting: "Lighting",
  audio: "Audio",
  continuity: "Continuity",
  shot: "Shot",
  wrap: "Wrap",
};

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
  clutter?: string;
  cameraZones?: string;
  lightZones?: string;
  cameraDirection?: string;
  geometry?: string;
}

export const PLACEMENT_MARKER_KINDS = [
  "camera",
  "subject",
  "key",
  "fill",
  "negative",
  "accent",
  "practical",
  "movement",
  "set",
] as const;

export type ShootGuidePlacementKind = (typeof PLACEMENT_MARKER_KINDS)[number];

export const PLACEMENT_MARKER_LABELS: Record<ShootGuidePlacementKind, string> = {
  camera: "Camera",
  subject: "Subject",
  key: "Key",
  fill: "Fill",
  negative: "Neg fill",
  accent: "Accent",
  practical: "Practical",
  movement: "Move",
  set: "Set",
};

export interface ShootGuidePlacementMarker {
  id: string;
  kind: ShootGuidePlacementKind;
  label: string;
  x: number;
  y: number;
  note?: string;
  shotId?: string | null;
}

export interface ShootGuidePlacementView {
  referenceId?: string | null;
  markers: ShootGuidePlacementMarker[];
}

export interface ShootGuidePlacementPlan {
  summary?: string;
  photoView: ShootGuidePlacementView | null;
  topDown: ShootGuidePlacementView | null;
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
  /** Scene Builder visual workflow. Omitted on older shots. */
  visualStatus?: ShotVisualStatus;
  visualAssets?: ShotVisualAsset[];
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
  duration?: string;
  previewIntent?: ShotPreviewIntent | null;
  previewNote?: string;
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
  outputType?: SceneOutputType;
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
  placementPlan: ShootGuidePlacementPlan | null;
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
  outputType?: SceneOutputType;
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
  outputType?: SceneOutputType;
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
  locationAnalysis?: ShootGuideLocationAnalysis | null;
  visualAnalysis?: ShootGuideVisualAnalysis | null;
  lightingPlan?: ShootGuideLightingPlan | null;
  placementPlan?: ShootGuidePlacementPlan | null;
  equipmentPlan?: ShootGuideEquipmentPlan | null;
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
  "execution",
  "vision",
] as const;

export type ShootGuideGenerateStage = (typeof SHOOT_GUIDE_GENERATE_STAGES)[number];

export const SHOT_VARIANT_INSTRUCTIONS = {
  different_lens:
    "Try a different lens for this shot. Keep the story purpose. Put the new lens in lens/focalLength and explain why in reason.",
  change_angle:
    "Change the camera angle and height for this shot. Keep the story purpose. Explain the new angle in reason.",
  simplify:
    "Simplify this setup: fewer lights, simpler support, easier to execute on a small crew. Keep the story purpose.",
  less_gear:
    "Use less gear: stay on catalog, one key, sticks not gimbal unless the beat requires it. Keep the story purpose.",
  more_cinematic:
    "Make this shot more cinematic: stronger angle, lens, or motivated move. Do not add exotic rentals. Keep the story purpose.",
} as const;

export type ShotVariantKey = keyof typeof SHOT_VARIANT_INSTRUCTIONS;

export interface ShootGuideGenerateRequest {
  stage?: ShootGuideGenerateStage;
  shotId?: string;
  instruction?: string;
}
