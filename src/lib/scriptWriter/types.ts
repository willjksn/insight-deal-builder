import { Timestamp } from "firebase/firestore";
import { ScriptWriterBrief, ScriptContentType } from "@/lib/scriptWriter/brief";

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
  locationNotes?: string[];
}

export interface ScriptDocument {
  title: string;
  logline: string;
  lookAndFeel?: string;
  references?: string;
  idealRuntime?: string;
  genre?: string;
  fountain: string;
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
  refineUsed?: boolean;
  linkedProjectId?: string;
  linkedScoutProjectId?: string;
  appliedProjectId?: string;
  appliedScoutProjectId?: string;
  /** When true, Gemini outputs full WS/MS/CU coverage per scene */
  detailedShotList?: boolean;
  /** When true, Gemini outputs scene storyboardFrames and applies reference images */
  storyboardMode?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
