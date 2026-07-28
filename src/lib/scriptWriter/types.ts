import { Timestamp } from "firebase/firestore";
import { ScriptWriterBrief, ScriptContentType } from "@/lib/scriptWriter/brief";
import { ScriptElement } from "@/lib/screenplay/types";
import { ProductionShootingKit } from "@/lib/production/shootingKit";
import { ScriptSeriesEntryKind, ScriptTrailerSceneRef } from "@/lib/scriptWriter/series/types";

export type ScriptWriterSessionStatus =
  | "interviewing"
  | "analysis_ready"
  | "script_ready"
  | "applied";

export type ScriptWriterWorkflowMode = "text" | "inspiration";

export type ScriptVideoReferenceMode = "inspired_by" | "match_structure" | "transcribe_expand";

export type ScriptImageTag = "location" | "mood" | "lighting" | "character_look";

export type ScriptDetailLevel = "standard" | "production" | "trailer";

export interface ScriptWriterMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ScriptInspirationImage {
  id: string;
  storageUrl: string;
  storagePath: string;
  tag: ScriptImageTag;
  label?: string;
}

export interface ScriptInspirationVideo {
  id: string;
  storageUrl: string;
  storagePath: string;
  referenceMode: ScriptVideoReferenceMode;
  fileName?: string;
}

export type ScriptInspirationUrlTag = ScriptImageTag | "reference_clip";

export interface ScriptInspirationUrl {
  id: string;
  url: string;
  tag: ScriptInspirationUrlTag;
  label?: string;
  referenceMode?: ScriptVideoReferenceMode;
  /** Server-resolved media URL (direct file or thumbnail) */
  fetchUrl?: string;
  fetchKind?: "image" | "video";
  pageTitle?: string;
  pageDescription?: string;
  provider?: string;
}

export interface ScriptInspirationAnalysis {
  summary: string;
  detectedMood?: string;
  detectedCast?: string;
  locationsFromImages: string[];
  storyBeats?: string[];
  videoNotes?: string;
  suggestedTitle?: string;
  inferredSettings?: string;
  userConfirmedAt?: string;
  userNotes?: string;
}

export interface ScriptDialogueLine {
  character: string;
  parenthetical?: string;
  line: string;
}

export interface ScriptScene {
  sceneNumber: string;
  heading: string;
  action: string;
  dialogue: ScriptDialogueLine[];
}

export interface ScriptCharacter {
  name: string;
  role: string;
  description?: string;
}

export interface ScriptSuggestedShot {
  sceneNumber: string;
  shotNumber: number;
  shotType: string;
  shotName?: string;
  description: string;
  subjectAction?: string;
  cameraMovement?: string;
  lens?: string;
  lighting?: string;
  purpose?: string;
  /** Composition: screen direction, headroom, lead room, angle. */
  framing?: string;
  /** Eye level, low/high angle, tabletop, etc. */
  cameraHeight?: string;
  /** Talent/prop positions relative to camera and set. */
  blocking?: string;
  /** Shutter, T-stop, EI, IRE targets. */
  exposureNotes?: string;
  audioNotes?: string;
  /** Flags, diffusion, plates, slate, gear notes. */
  setupNotes?: string;
  /** Approx hold length e.g. "3–5 sec". */
  duration?: string;
  /** From pre-production kit — body used for this shot. */
  cameraBody?: string;
  /** Dolly, gimbal, slider, tripod/sticks, handheld, locked. */
  support?: string;
  /** Lights from kit assigned to this shot. */
  assignedLights?: string[];
  /** Props from kit visible in frame. */
  assignedProps?: string[];
  /** Links to productionPack.dollyMoves id when shot uses a planned move. */
  dollyMoveRef?: string;
  /** Post/edit note for this shot (selects, speed ramp, sound cue). */
  editNote?: string;
}

/** One storyboard panel per scene — hero frame for grid view / client PDF. */
export interface ScriptStoryboardFrame {
  sceneNumber: string;
  sceneHeading?: string;
  shotType: string;
  shotName?: string;
  caption: string;
  audioCue?: string;
  /** Id from session inspirationImages when AI matches a reference. */
  inspirationImageId?: string;
}

/** An AI-generated storyboard still, persisted per scene on the session. */
export interface ScriptStoryboardImage {
  /** Durable Firebase download URL. */
  url: string;
  /** Storage path (for future cleanup). */
  storagePath?: string;
  /** The prompt used to generate the image. */
  prompt?: string;
  /** ISO timestamp of generation. */
  createdAt: string;
}

export interface ScriptTimedBeat {
  startSec: number;
  endSec: number;
  visual: string;
  audio?: string;
  dialogue?: string;
  onScreenText?: string;
}

export interface ScriptEditTimelineRow {
  time: string;
  visual: string;
  audio: string;
}

export interface ScriptLensPlanRow {
  lens: string;
  use: string;
}

export interface ScriptDollyMove {
  id: string;
  track: string;
  lens: string;
  purpose: string;
  execution: string;
}

export interface ScriptCameraSetupRow {
  setting: string;
  value: string;
  why?: string;
}

export interface ScriptEditPlanStep {
  step: number | string;
  action: string;
}

export interface ScriptProductionPack {
  premise?: string;
  tone?: string;
  timedBeats?: ScriptTimedBeat[];
  cinematicLook?: {
    lighting?: string;
    color?: string;
    cameraStyle?: string;
  };
  soundDesign?: string[];
  props?: string[];
  editTimeline?: ScriptEditTimelineRow[];
  cameraGearNotes?: string;
  /** Per-lens story beat assignment (PDF lens plan). */
  lensPlan?: ScriptLensPlanRow[];
  /** Named dolly moves with track, lens, purpose, execution. */
  dollyMoves?: ScriptDollyMove[];
  /** ASCII/text blocking map — talent, props, dolly start. */
  blockingMap?: string;
  /** Camera body settings table (codec, fps, profile, WB, ISO). */
  cameraSetup?: ScriptCameraSetupRow[];
  /** Picture edit + sound design steps. */
  editPlan?: ScriptEditPlanStep[];
  locationNotes?: string[];
}

export interface ScriptDocument {
  title: string;
  logline: string;
  author?: string;
  draftLabel?: string;
  lookAndFeel?: string;
  references?: string;
  idealRuntime?: string;
  genre?: string;
  /** Legacy Fountain string — kept in sync with structured elements. */
  fountain: string;
  /** Industry-standard screenplay blocks for edit, preview, and export. */
  elements?: ScriptElement[];
  showPageOneNumber?: boolean;
  scenes: ScriptScene[];
  characters: ScriptCharacter[];
  suggestedShots: ScriptSuggestedShot[];
  storyboardFrames?: ScriptStoryboardFrame[];
  productionPack?: ScriptProductionPack;
}

export interface ScriptWriterChatResponse {
  message: string;
  questions?: string[];
  readyToWrite: boolean;
}

/** A character developed during the feature outline pass. */
export interface FeatureCharacterBio {
  name: string;
  role?: string;
  description: string;
  arc?: string;
}

/** One act / sequence in the feature beat sheet. */
export interface FeatureAct {
  index: number;
  title: string;
  goal: string;
  beats: string[];
}

/** Output of the development (outline) pass. */
export interface FeatureOutline {
  title?: string;
  logline: string;
  theme: string;
  genre?: string;
  toneStatement?: string;
  characters: FeatureCharacterBio[];
  acts: FeatureAct[];
  createdAt: string;
}

/** Output of one act-expansion pass — carries a continuity summary forward. */
export interface FeatureActDraft {
  index: number;
  title: string;
  scenes: ScriptScene[];
  /** Running "what happened / where characters stand" continuity note. */
  summary: string;
  createdAt: string;
}

export type FeatureBuildStatus = "idle" | "outlined" | "expanding" | "assembled";

/** Persisted state for the multi-pass feature build (resumable). */
export interface FeatureBuildState {
  status: FeatureBuildStatus;
  totalActs: number;
  outline: FeatureOutline | null;
  acts: FeatureActDraft[];
  updatedAt?: string;
}

/**
 * Comparable-works research: abstract craft patterns (structure, tone, visual
 * language) drawn from similar films/videos — NOT plots or dialogue — used to
 * ground and focus generation.
 */
export interface ScriptReferenceResearch {
  query: string;
  provider: "tavily";
  searchedAt: string;
  contentType?: ScriptContentType;
  /** 2–4 comparable works by title, for orientation only. */
  comparableTitles: string[];
  summary: string;
  /** Structural / act / sequence patterns. */
  structure: string[];
  /** Tone & character-dynamic patterns. */
  tone: string[];
  /** Cinematography / visual motifs. */
  visualLanguage: string[];
  /** Specific patterns to lean into for this piece. */
  emulate: string[];
  /** Clichés / traps to skip. */
  avoid?: string[];
  sourceTitles: string[];
}

/**
 * A single AI-suggested story concept for users who don't have an idea yet.
 * Produced by the "idea spark" agent from the format brief + current trends.
 */
export interface ScriptIdeaSuggestion {
  /** Punchy working title. */
  title: string;
  /** 1–2 sentence pitch: who + what happens + the hook. */
  logline: string;
  /** The single thing that makes it stand out. */
  angle?: string;
  /** Why the target audience will respond / trend tie-in. */
  whyItWorks?: string;
  /** Optional genre framing to prefill. */
  genre?: string;
  /** Optional setting/world to prefill. */
  setting?: string;
}

/** Web trend research via Tavily, summarized by Gemini for script generation. */
export interface ScriptTrendsResearch {
  query: string;
  provider: "tavily";
  searchedAt: string;
  /** Weekly snapshot vs session-specific live search */
  source?: "cache" | "live";
  contentType?: ScriptContentType;
  summary: string;
  hooks: string[];
  pacingNotes: string[];
  framingIdeas: string[];
  avoid?: string[];
  sourceTitles: string[];
}

export interface ScriptWriterSession {
  id: string;
  userId: string;
  title: string;
  initialIdea: string;
  brief?: ScriptWriterBrief;
  workflowMode?: ScriptWriterWorkflowMode;
  detailLevel?: ScriptDetailLevel;
  status: ScriptWriterSessionStatus;
  messages: ScriptWriterMessage[];
  script: ScriptDocument | null;
  inspirationImages?: ScriptInspirationImage[];
  inspirationVideo?: ScriptInspirationVideo | null;
  inspirationUrls?: ScriptInspirationUrl[];
  inspirationAnalysis?: ScriptInspirationAnalysis | null;
  trendsResearch?: ScriptTrendsResearch | null;
  referenceResearch?: ScriptReferenceResearch | null;
  /** Multi-pass feature build state (only for feature/long-form sessions). */
  featureBuild?: FeatureBuildState | null;
  refineUsed?: boolean;
  linkedProjectId?: string;
  linkedScoutProjectId?: string;
  appliedProjectId?: string;
  appliedScoutProjectId?: string;
  /** When true, Gemini outputs full WS/MS/CU coverage per scene */
  detailedShotList?: boolean;
  /** When true, Gemini outputs scene storyboardFrames and applies reference images */
  storyboardMode?: boolean;
  /** AI-generated storyboard stills, keyed by scene number. */
  storyboardImages?: Record<string, ScriptStoryboardImage>;
  /** Pre-production shooting kit for this session (also loads from linked project board). */
  shootingKit?: ProductionShootingKit;
  sourceIdeaEngine?: boolean;
  sourceIdeaSessionId?: string;
  sourceIdeaId?: string;
  /** When set, this session is an entry in a series (shared canon + continuity). */
  seriesId?: string;
  /** Entry kind within the series (episode / teaser / trailer). */
  seriesEntryKind?: ScriptSeriesEntryKind;
  /** 1-based ordering of this entry within its series. */
  seriesOrder?: number;
  /** One-line "story so far" recap captured after the script is written. */
  seriesRecap?: string;
  /** For trailer/teaser entries: scenes picked from sibling episodes to assemble from. */
  trailerSources?: ScriptTrailerSceneRef[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
