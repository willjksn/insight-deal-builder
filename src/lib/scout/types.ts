import { Timestamp } from "firebase/firestore";

export type ScoutSceneType =
  | "creator_reel"
  | "podcast"
  | "interview"
  | "horror"
  | "commercial"
  | "lifestyle"
  | "car_scene"
  | "music_video"
  | "short_film"
  | "product_video"
  | "social_reel"
  | "trailer";

export type ScoutMood =
  | "warm"
  | "natural"
  | "luxury"
  | "scary"
  | "dramatic"
  | "romantic"
  | "moody"
  | "clean_commercial"
  | "gritty"
  | "soft_beauty"
  | "suspense"
  | "high_energy"
  | "documentary";

export type ScoutPlatform =
  | "instagram_reels"
  | "tiktok"
  | "youtube"
  | "youtube_shorts"
  | "portfolio"
  | "client_commercial"
  | "podcast_platform"
  | "website";

export type ScoutAspectRatio = "9:16" | "16:9" | "1:1" | "both";

export type ScoutSkillLevel = "beginner" | "intermediate" | "pro";

export type ScoutPreferredLook =
  | "s_cinetone"
  | "s_log3"
  | "natural"
  | "commercial"
  | "horror"
  | "beauty"
  | "moody_look"
  | "high_contrast";

export type ScoutProjectStatus =
  | "draft"
  | "needs_images"
  | "needs_questions"
  | "ready_to_plan"
  | "ready_to_shoot"
  | "shot"
  | "archived"
  | "uploading"
  | "analyzed"
  | "planning"
  | "planned"
  | "previs_ready";

export type ScoutImageLabel =
  | "doorway"
  | "left_corner"
  | "right_corner"
  | "opposite_wall"
  | "main_background"
  | "window_light"
  | "ceiling_overhead"
  | "detail_background"
  | "unlabeled";

export type ScoutAppMode =
  | "quick"
  | "pro"
  | "creator"
  | "horror"
  | "commercial"
  | "podcast";

export type ScoutColorGradingPref = "minimal" | "light" | "full";

export type LightFixtureType =
  | "COB"
  | "panel"
  | "tube"
  | "practical"
  | "led_bulb"
  | "rgb"
  | "rgbww"
  | "on_camera"
  | "other";

export type LightColorType =
  | "daylight_only"
  | "bi_color"
  | "rgb"
  | "rgbww"
  | "full_color"
  | "unknown";

export type LightBestUse =
  | "key"
  | "fill"
  | "hair"
  | "background"
  | "practical"
  | "eye_light"
  | "product"
  | "accent"
  | "special_effect";

export type LightingAssignmentRole =
  | "key"
  | "fill"
  | "negative_fill"
  | "hair"
  | "background"
  | "practical"
  | "eye_light"
  | "ambient_control"
  | "accent"
  | "special_effect";

export interface LightFixture {
  id: string;
  userId: string;
  brand: string;
  model: string;
  fixtureType: LightFixtureType;
  wattage?: number;
  outputNotes?: string;
  colorType: LightColorType;
  cctMin?: number;
  cctMax?: number;
  fixedCct?: number;
  cri?: number;
  tlci?: number;
  mountType?: string;
  modifiersOwned: string[];
  beamAngleMin?: number;
  beamAngleMax?: number;
  controlMethod?:
    | "manual"
    | "sidus_link"
    | "smallgogo"
    | "dmx"
    | "bluetooth"
    | "remote"
    | "none"
    | "unknown";
  batteryCapable?: boolean;
  bestUses: LightBestUse[];
  roomSizeRating?: "small" | "medium" | "large";
  userNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LightingAssignment {
  role: LightingAssignmentRole;
  fixtureId?: string;
  fixtureName: string;
  placement: string;
  direction: string;
  height: string;
  distanceEstimate: string;
  powerStartingRange: string;
  cctStartingPoint: string;
  modifier: string;
  spillControl: string;
  controlNotes: string;
  reasonChosen: string;
}

export interface FixtureAwareLightingPlan {
  lookName: string;
  mood: string;
  lightingMotivation: string;
  whiteBalanceRecommendation: string;
  contrastLevel: "low" | "medium" | "high";
  assignments: LightingAssignment[];
  lightsToTurnOff: string[];
  practicalsToUse: string[];
  negativeFillPlan: string;
  safetyNotes: string[];
  troubleshooting: string[];
  beginnerExplanation: string;
  proNotes: string[];
}

export interface ScoutCreativeBrief {
  subjectAction?: string;
  peopleCount?: number;
  subjectPose?: string;
  cameraMovement?: string;
  avoidHeavyGrading?: boolean;
  completedAt?: string;
}

export interface ScoutBackgroundPlan {
  remove: string[];
  add: string[];
  move: string[];
  practicals: string[];
}

export interface LightingRecipe {
  id: string;
  userId: string;
  lookName: string;
  mood: string;
  camera: string;
  lens: string;
  frameRate: string;
  pictureProfile: string;
  whiteBalance: string;
  lightAssignments: LightingAssignment[];
  powerRanges: string;
  cctValues: string;
  modifiers: string;
  subjectPosition: string;
  cameraPosition: string;
  backgroundNotes: string;
  troubleshootingNotes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScoutGearProfile {
  id: string;
  userId: string;
  name: string;
  cameraBodies: string[];
  sensorType?: string;
  lenses: string[];
  lights: string[];
  modifiers: string[];
  audio: string[];
  stabilizers: string[];
  tripods?: string[];
  preferredProfiles: string[];
  preferredFrameRates: number[];
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScoutImageAnalysis {
  imageId: string;
  roomType: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  backgroundPotential: string;
  lightingPotential: string;
  cameraPlacementPotential: string;
  subjectPlacementPotential: string;
  clutterIssues: string[];
  practicalLightSources: string[];
  suggestedImprovements: string[];
  /** Extended scoring 1–100 */
  depthScore?: number;
  backgroundScore?: number;
  lightingScore?: number;
  blockingScore?: number;
  soundRiskScore?: number;
  verticalPotentialScore?: number;
  horizontalPotentialScore?: number;
  suggestedRemovals?: string[];
  suggestedAdditions?: string[];
  recommendedCameraPosition?: string;
  recommendedSubjectPosition?: string;
  reflectionRisk?: string;
  audioRisk?: string;
}

export interface ScoutBestAngleAnalysis {
  bestImageId: string;
  reasonBestAngle: string;
  whyOtherAnglesAreWeaker: string[];
  recommendedCameraPosition: string;
  recommendedSubjectPosition: string;
  recommendedBackgroundChanges: string[];
  recommendedLightingMotivation: string;
}

export interface ScoutLocationAnalysis {
  id: string;
  perImage: ScoutImageAnalysis[];
  bestAngle: ScoutBestAngleAnalysis;
  missingQuestions: string[];
  createdAt: Timestamp;
}

export interface ScoutBlockingPlan {
  subjectStartingPosition: string;
  subjectMovement: string;
  heroMark: string;
  emotionalBeat: string;
  finalPosition: string;
  cameraMovement: string;
  propActions?: string[];
}

export interface ScoutBackgroundPlan {
  remove: string[];
  add: string[];
  move: string[];
  practicals: string[];
}

export interface ScoutLightingPlan {
  lightingMotivation: string;
  keyLightPlacement: string;
  fillOrNegativeFill: string;
  hairBackLight: string;
  backgroundPracticalLights: string;
  practicalLights: string;
  lightsToTurnOff: string[];
  flagOrBlock: string[];
  whiteBalanceRecommendation: string;
}

export interface ScoutCameraSettings {
  lensRecommendation: string;
  frameRate: string;
  shutter: string;
  apertureStartingPoint: string;
  isoGuidance: string;
  pictureProfileRecommendation: string;
  ndFilterRecommendation: string;
  focusMode: string;
  stabilizationRecommendation: string;
}

export interface ScoutDpPlan {
  id: string;
  sceneIdea: string;
  mood: string;
  theme: string;
  bestAngle: string;
  whyThisAngleWorks: string;
  whyOtherAnglesWeaker?: string[];
  backgroundRecommendations: string[];
  backgroundPlan?: ScoutBackgroundPlan;
  whatToRemove: string[];
  whatToAdd: string[];
  whatToMove?: string[];
  onSetWorkflow: string[];
  blockingPlan: ScoutBlockingPlan;
  lightingPlan: ScoutLightingPlan;
  fixtureAwareLighting?: FixtureAwareLightingPlan;
  cameraSettings: ScoutCameraSettings;
  audioNotes: string;
  rehearsalNotes: string;
  commonMistakes: string[];
  beginnerExplanation: string;
  proNotes: string;
  previewPrompt?: string;
  createdAt: Timestamp;
}

export type ScoutShotType =
  | "master_wide"
  | "medium_shot"
  | "close_up"
  | "insert_shot"
  | "reaction_shot"
  | "movement_shot"
  | "vertical_social_shot"
  | "thumbnail_shot"
  | "bts_shot"
  | "room_tone"
  | "wild_line";

export interface ScoutShotListItem {
  shotNumber: number;
  shotName?: string;
  scene: string;
  shotType: ScoutShotType;
  camera: string;
  lens: string;
  frameRate: string;
  cameraMovement: string;
  subjectAction: string;
  blockingNotes: string;
  lightingNotes: string;
  audioDialogueNotes: string;
  priority: "must_have" | "nice_to_have" | "optional";
  status: "planned" | "captured" | "skipped" | "shot" | "needs_reshoot";
  notes: string;
}

export interface ScoutShotList {
  id: string;
  shots: ScoutShotListItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ScoutPreviewType =
  | "cinematic_frame"
  | "lighting_diagram"
  | "room_layout"
  | "storyboard"
  | "vertical_social_frame";

export interface ScoutPreview {
  id: string;
  prompt: string;
  imageUrl?: string;
  type: ScoutPreviewType;
  /** Shot list number when this previs matches a planned shot */
  shotNumber?: number;
  /** Human label e.g. "Hallway wide" or "Master wide" */
  shotLabel?: string;
  /** Set when prompt was saved but image generation failed */
  imageGenerationError?: string;
  createdAt: Timestamp;
}

export interface ScoutProjectImage {
  id: string;
  storagePath: string;
  storageUrl: string;
  label: ScoutImageLabel;
  aiScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  selectedAsBest?: boolean;
  createdAt: Timestamp;
}

export interface ScoutProject {
  id: string;
  userId: string;
  /** Optional link to production project in Deal Builder */
  linkedProjectId?: string;
  linkedProjectName?: string;
  projectName: string;
  sceneType: ScoutSceneType;
  sceneIdea: string;
  mood: ScoutMood;
  theme: string;
  platform: ScoutPlatform;
  aspectRatio: ScoutAspectRatio;
  skillLevel: ScoutSkillLevel;
  preferredLook: ScoutPreferredLook;
  selectedGearProfileId?: string;
  /** Inline gear when no profile selected */
  cameraBody?: string;
  lensOptions?: string;
  lightingGear?: string;
  audioGear?: string;
  stabilizationGear?: string;
  crewSize?: number;
  timeOfDay?: string;
  colorGradingPreference?: ScoutColorGradingPref;
  appMode?: ScoutAppMode;
  creativeBrief?: ScoutCreativeBrief;
  selectedLightFixtureIds?: string[];
  selectedLightingRecipeId?: string;
  sceneLightNotes?: string;
  status: ScoutProjectStatus;
  bestImageId?: string;
  bestImageUrl?: string;
  thumbnailUrl?: string;
  latestAnalysis?: ScoutLocationAnalysis;
  latestDpPlan?: ScoutDpPlan;
  latestShotList?: ScoutShotList;
  latestPreviews?: ScoutPreview[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
