/** Production-ready content plan (upgraded Reel Prompt Director). */

export type ContentStyle =
  | "ugc"
  | "cinematic_reel"
  | "hybrid"
  | "commercial"
  | "brand_reel"
  | "lifestyle"
  | "product_ad"
  | "beauty"
  | "fashion"
  | "documentary"
  | "narrative"
  | "horror_suspense"
  | "short_film"
  | "custom";

export type ContentDurationPreset =
  | "15"
  | "30"
  | "45"
  | "60"
  | "90"
  | "custom";

export type ContentPlatform =
  | "instagram_reel"
  | "tiktok"
  | "youtube_short"
  | "youtube"
  | "website"
  | "paid_social"
  | "commercial"
  | "other";

export type ContentOrientation = "9:16" | "16:9" | "1:1" | "4:5";

export type ContentEnergy =
  | "slow_elegant"
  | "natural"
  | "emotional"
  | "energetic"
  | "aggressive"
  | "suspenseful"
  | "luxury"
  | "playful"
  | "custom";

export type ContentDialogueMode =
  | "none"
  | "voiceover"
  | "direct_to_camera"
  | "scene_dialogue"
  | "vo_plus_dialogue"
  | "custom";

export type ContentCta =
  | "none"
  | "learn_more"
  | "shop_now"
  | "follow"
  | "book"
  | "visit_website"
  | "custom";

export type ShotSize =
  | "ECU"
  | "CU"
  | "MCU"
  | "MS"
  | "MWS"
  | "WS"
  | "EWS"
  | "OTS"
  | "POV"
  | "Insert"
  | "Product Hero";

export type CameraMovement =
  | "Locked"
  | "Handheld"
  | "Push In"
  | "Pull Out"
  | "Dolly"
  | "Slider"
  | "Pan"
  | "Tilt"
  | "Orbit"
  | "Tracking"
  | "Whip Pan"
  | "Reveal"
  | "Custom";

export type ShotStatus =
  | "planned"
  | "ready"
  | "shooting"
  | "completed"
  | "needs_pickup"
  | "dropped";

export type ContentPlanSection =
  | "brief"
  | "beats"
  | "script"
  | "shots"
  | "coverage"
  | "lighting"
  | "edit"
  | "sound"
  | "music"
  | "look"
  | "shoot_order"
  | "checklist"
  | "davinci";

export type ContentPlanInputs = {
  contentStyle: ContentStyle;
  idea: string;
  durationPreset: ContentDurationPreset;
  /** Seconds; derived from preset or custom */
  durationSeconds: number;
  customDurationLabel?: string;
  platform: ContentPlatform;
  orientation: ContentOrientation;
  energy: ContentEnergy;
  customEnergy?: string;
  dialogueMode: ContentDialogueMode;
  customDialogue?: string;
  cta: ContentCta;
  customCta?: string;
  brand?: string;
  product?: string;
  creatorName?: string;
  creatorId?: string | null;
  /** Short catalog notes injected into AI prompts when a creator is picked. */
  creatorCatalogNotes?: string;
  location?: string;
  locationId?: string | null;
  /** Short catalog notes injected into AI prompts when a location is picked. */
  locationCatalogNotes?: string;
  wardrobe?: string;
  existingScript?: string;
  talkingPoints?: string;
  requiredPhrases?: string;
  avoid?: string;
  equipmentAvailable?: string;
  camerasAvailable?: string;
  lensesAvailable?: string;
  lightingAvailable?: string;
  useAvailableGearOnly: boolean;
  teachMe: boolean;
};

export type CreativeBrief = {
  workingTitle: string;
  coreConcept: string;
  objective: string;
  targetViewer: string;
  hook: string;
  mainMessage: string;
  emotionalGoal: string;
  productBrandMoment: string;
  cta: string;
  visualStyle: string;
  cameraPhilosophy: string;
  editingPhilosophy: string;
  soundPhilosophy: string;
  whyItWorks: string;
};

export type StoryBeat = {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  description: string;
};

export type ScriptLine = {
  id: string;
  speaker: string;
  dialogue: string;
  timing?: string;
  delivery?: string;
  onScreenText?: string;
  kind?: "dialogue" | "vo" | "direct" | "text_only" | "action";
};

export type HowToShoot = {
  steps: string[];
  commonMistakes: string[];
  continuity: string[];
};

export type ContentShot = {
  id: string;
  shotNumber: number;
  shotName: string;
  storyPurpose: string;
  startTime: string;
  endTime: string;
  estimatedDuration: string;
  visualDescription: string;
  shotSize: ShotSize | string;
  cameraBody?: string;
  lens?: string;
  focalLength?: string;
  frameRate?: string;
  shutter?: string;
  aperture?: string;
  isoStrategy?: string;
  whiteBalance?: string;
  ndRecommendation?: string;
  cameraHeight?: string;
  cameraDistance?: string;
  cameraAngle?: string;
  movement: CameraMovement | string;
  movementInstructions?: string;
  composition?: string;
  subjectPlacement?: string;
  foreground?: string;
  background?: string;
  depthNotes?: string;
  headroom?: string;
  lookRoom?: string;
  focusStrategy?: string;
  focusStart?: string;
  focusEnd?: string;
  lightingIntent?: string;
  keyLightDirection?: string;
  fillStrategy?: string;
  backlightStrategy?: string;
  practicals?: string;
  motivatedSource?: string;
  performanceDirection?: string;
  blocking?: string;
  propAction?: string;
  productionAudio?: string;
  editorNotes?: string;
  transitionInto?: string;
  transitionOut?: string;
  /** Speed ramp / retiming note for edit (e.g. “slow push 80%”). */
  speedRampNotes?: string;
  /** Optional reference still / frame URL for the shot card. */
  referenceImageUrl?: string;
  cutTrigger?: string;
  soundEffects?: string;
  foley?: string;
  musicCue?: string;
  graphics?: string;
  colorLook?: string;
  coveragePriority?: string;
  takesRecommended?: number;
  safetyShot?: boolean;
  pickupNeeded?: boolean;
  howToShoot: HowToShoot;
  status: ShotStatus;
  teachMeNotes?: string;
  /** Shoot Mode: which take numbers are checked off (1-based). */
  takesCompleted?: number[];
  /** Shoot Mode freeform notes. */
  shootNotes?: string;
  /** Shoot Mode coverage checkboxes keyed by label. */
  coverageChecks?: Record<string, boolean>;
};

export type ContentPlanStatus =
  | "draft"
  | "generating"
  | "ready"
  | "partial"
  | "error";

export type EditInstruction = {
  id: string;
  fromShotId: string;
  toShotId: string;
  fromShotLabel?: string;
  toShotLabel?: string;
  approximateTimelinePosition: string;
  editType: string;
  cutTrigger: string;
  why: string;
  speedNotes?: string;
  teachMeNotes?: string;
};

export type EditMapItem = {
  id: string;
  startTime: string;
  endTime: string;
  shotId: string;
  shotLabel: string;
  note?: string;
  transitionToNext?: string;
};

export type EditPlan = {
  philosophy: string;
  instructions: EditInstruction[];
  map: EditMapItem[];
  davinciTracks?: {
    video: string[];
    audio: string[];
  };
  timelineNotes?: string[];
};

export type SoundCueType = "production" | "foley" | "designed_sfx" | "ambience";

export type SoundCue = {
  id: string;
  soundName: string;
  soundType: SoundCueType;
  timelinePosition: string;
  associatedShotId?: string;
  associatedShotLabel?: string;
  purpose: string;
  levelDirection?: string;
  fadeDirection?: string;
};

export type SoundPlan = {
  overview: string;
  productionAudio: SoundCue[];
  foley: SoundCue[];
  designedSfx: SoundCue[];
  mixNotes?: string[];
};

export type MusicStructureBeat = {
  time: string;
  note: string;
};

export type MusicPlan = {
  style: string;
  mood: string;
  bpm: string;
  instrumentation: string;
  energyCurve: string;
  structure: MusicStructureBeat[];
  beatCutOpportunities: string[];
  beginAt?: string;
  liftAt?: string;
  dropAt?: string;
  resolveAt?: string;
};

export type ColorPlan = {
  lookName: string;
  contrast: string;
  saturation: string;
  skinToneDirection: string;
  highlightTreatment: string;
  shadowTreatment: string;
  whiteBalanceIntent: string;
  colorTemperatureContrast?: string;
  grain?: string;
  halation?: string;
  vignette?: string;
  notes?: string[];
};

export type LightingSetup = {
  location: string;
  setup: string;
};

export type LightingPlan = {
  overview: string;
  motivatedSource: string;
  key: string;
  fill: string;
  negativeFill?: string;
  backlight?: string;
  practicals?: string;
  backgroundSeparation?: string;
  colorTemperature?: string;
  exposurePriorities?: string;
  setupByLocation?: LightingSetup[];
  gearRecommendations?: string[];
  teachMeNotes?: string;
};

/** Lightweight Resolve track blueprint stored with the edit plan. */
export type DavinciBlueprint = {
  videoTracks: string[];
  audioTracks: string[];
  assemblyNotes: string[];
  events: Array<{
    timelineStart: string;
    timelineEnd?: string;
    shotId?: string;
    shotLabel?: string;
    note: string;
  }>;
};

export type CoverageItemStatus = "planned" | "captured" | "missing" | "optional";

export type CoverageItem = {
  id: string;
  label: string;
  category: string;
  why?: string;
  relatedShotIds?: string[];
  status: CoverageItemStatus;
  critical?: boolean;
};

export type CoverageMoment = {
  id: string;
  title: string;
  description?: string;
  required: CoverageItem[];
  optional: CoverageItem[];
};

export type CoveragePlan = {
  overview: string;
  moments: CoverageMoment[];
  planned: CoverageItem[];
  missing: CoverageItem[];
  pickupsBeforeWrap: string[];
  warnings: string[];
};

export type ShootOrderItem = {
  shotId: string;
  shotNumber: number;
  shotName: string;
  groupLabel?: string;
  reason?: string;
};

export type ShootOrderPlan = {
  storyOrder: ShootOrderItem[];
  shootOrder: ShootOrderItem[];
  setupChangeCount?: number;
  groupingNotes?: string[];
  efficiencyReason?: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ShootChecklist = {
  beforeShooting: ChecklistItem[];
  beforeMovingCamera: ChecklistItem[];
  beforeWrap: ChecklistItem[];
};

export type ContentPlanProgress = {
  brief: boolean;
  beats: boolean;
  script: boolean;
  shots: boolean;
  edit: boolean;
  sound: boolean;
  music: boolean;
  look: boolean;
  lighting: boolean;
  coverage: boolean;
  shootOrder: boolean;
  checklist: boolean;
};

/** Firestore document — Phase 1–3 production planning. */
export type ContentPlan = {
  id: string;
  userId: string;
  projectId?: string | null;
  creatorId?: string | null;
  scriptSessionId?: string | null;
  /** Weekly Idea Engine provenance when developed from an idea. */
  sourceIdeaSessionId?: string | null;
  sourceIdeaId?: string | null;
  title: string;
  status: ContentPlanStatus;
  inputs: ContentPlanInputs;
  creativeBrief?: CreativeBrief | null;
  beats: StoryBeat[];
  scriptLines: ScriptLine[];
  shots: ContentShot[];
  coveragePlan?: CoveragePlan | null;
  editPlan?: EditPlan | null;
  soundPlan?: SoundPlan | null;
  musicPlan?: MusicPlan | null;
  colorPlan?: ColorPlan | null;
  lightingPlan?: LightingPlan | null;
  davinciBlueprint?: DavinciBlueprint | null;
  shootOrderPlan?: ShootOrderPlan | null;
  /** @deprecated use shootOrderPlan */
  shootOrder?: unknown;
  checklist?: ShootChecklist | null;
  progress: ContentPlanProgress;
  lastError?: string | null;
  teachMe: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ContentPlanGenerateSection =
  | "all"
  | "phase1"
  | "brief"
  | "beats"
  | "script"
  | "shots"
  | "phase2"
  | "edit"
  | "sound"
  | "music"
  | "look"
  | "lighting"
  | "phase3"
  | "coverage"
  | "shoot_order"
  | "checklist";

export type CompletionStats = {
  totalShots: number;
  completedShots: number;
  criticalRemaining: number;
  pickups: number;
  coveragePercent: number;
  needsPickupShots: number;
};

export const CONTENT_STYLE_OPTIONS: { value: ContentStyle; label: string }[] = [
  { value: "hybrid", label: "Hybrid UGC + Cinematic" },
  { value: "ugc", label: "UGC" },
  { value: "cinematic_reel", label: "Cinematic Reel" },
  { value: "commercial", label: "Commercial" },
  { value: "brand_reel", label: "Brand Reel" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "product_ad", label: "Product Ad" },
  { value: "beauty", label: "Beauty" },
  { value: "fashion", label: "Fashion" },
  { value: "documentary", label: "Documentary" },
  { value: "narrative", label: "Narrative" },
  { value: "horror_suspense", label: "Horror / Suspense" },
  { value: "short_film", label: "Short Film" },
  { value: "custom", label: "Custom" },
];

export const DURATION_OPTIONS: {
  value: ContentDurationPreset;
  label: string;
  seconds: number;
}[] = [
  { value: "15", label: "15 sec", seconds: 15 },
  { value: "30", label: "30 sec", seconds: 30 },
  { value: "45", label: "45 sec", seconds: 45 },
  { value: "60", label: "60 sec", seconds: 60 },
  { value: "90", label: "90 sec", seconds: 90 },
  { value: "custom", label: "Custom", seconds: 30 },
];

export const PLATFORM_OPTIONS: { value: ContentPlatform; label: string }[] = [
  { value: "instagram_reel", label: "Instagram Reel" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_short", label: "YouTube Short" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website" },
  { value: "paid_social", label: "Paid Social Ad" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

export const ORIENTATION_OPTIONS: { value: ContentOrientation; label: string }[] = [
  { value: "9:16", label: "9:16" },
  { value: "16:9", label: "16:9" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
];

export const ENERGY_OPTIONS: { value: ContentEnergy; label: string }[] = [
  { value: "natural", label: "Natural" },
  { value: "slow_elegant", label: "Slow / Elegant" },
  { value: "emotional", label: "Emotional" },
  { value: "energetic", label: "Energetic" },
  { value: "aggressive", label: "Aggressive" },
  { value: "suspenseful", label: "Suspenseful" },
  { value: "luxury", label: "Luxury" },
  { value: "playful", label: "Playful" },
  { value: "custom", label: "Custom" },
];

export const DIALOGUE_OPTIONS: { value: ContentDialogueMode; label: string }[] = [
  { value: "direct_to_camera", label: "Direct to Camera" },
  { value: "voiceover", label: "Voiceover" },
  { value: "scene_dialogue", label: "Scene Dialogue" },
  { value: "vo_plus_dialogue", label: "VO + Scene Dialogue" },
  { value: "none", label: "None" },
  { value: "custom", label: "Custom" },
];

export const CTA_OPTIONS: { value: ContentCta; label: string }[] = [
  { value: "none", label: "None" },
  { value: "learn_more", label: "Learn More" },
  { value: "shop_now", label: "Shop Now" },
  { value: "follow", label: "Follow" },
  { value: "book", label: "Book" },
  { value: "visit_website", label: "Visit Website" },
  { value: "custom", label: "Custom" },
];

export function defaultContentPlanInputs(
  partial?: Partial<ContentPlanInputs>
): ContentPlanInputs {
  return {
    contentStyle: "hybrid",
    idea: "",
    durationPreset: "30",
    durationSeconds: 30,
    platform: "instagram_reel",
    orientation: "9:16",
    energy: "natural",
    dialogueMode: "direct_to_camera",
    cta: "none",
    useAvailableGearOnly: true,
    teachMe: true,
    ...partial,
  };
}

export function emptyProgress(): ContentPlanProgress {
  return {
    brief: false,
    beats: false,
    script: false,
    shots: false,
    edit: false,
    sound: false,
    music: false,
    look: false,
    lighting: false,
    coverage: false,
    shootOrder: false,
    checklist: false,
  };
}

export function computeCompletionStats(plan: ContentPlan): CompletionStats {
  const shots = plan.shots || [];
  const totalShots = shots.length;
  const completedShots = shots.filter((s) => s.status === "completed").length;
  const needsPickupShots = shots.filter(
    (s) => s.status === "needs_pickup" || s.pickupNeeded
  ).length;
  const criticalRemaining = shots.filter(
    (s) =>
      (s.coveragePriority === "required" || s.coveragePriority === "critical") &&
      s.status !== "completed" &&
      s.status !== "dropped"
  ).length;

  const coverageItems = [
    ...(plan.coveragePlan?.planned || []),
    ...(plan.coveragePlan?.missing || []),
    ...(plan.coveragePlan?.moments || []).flatMap((m) => [
      ...m.required,
      ...m.optional,
    ]),
  ];
  const unique = new Map<string, CoverageItem>();
  for (const item of coverageItems) {
    if (item?.id) unique.set(item.id, item);
  }
  const items = [...unique.values()];
  const captured = items.filter((i) => i.status === "captured").length;
  const coveragePercent =
    items.length > 0 ? Math.round((captured / items.length) * 100) : 0;
  const pickups =
    needsPickupShots +
    (plan.coveragePlan?.pickupsBeforeWrap?.length || 0) +
    items.filter((i) => i.status === "missing" && i.critical).length;

  return {
    totalShots,
    completedShots,
    criticalRemaining,
    pickups,
    coveragePercent,
    needsPickupShots,
  };
}
