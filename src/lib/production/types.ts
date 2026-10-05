import { Timestamp } from "firebase/firestore";
import { ProductionChecklistItem, ProductionChecklistMode } from "@/lib/production/checklist";
import { CrewPrintoutPacket } from "@/lib/production/crewPacketTypes";
import type { SceneCoverageChecklist } from "@/lib/production/sceneCoverageChecklist";
import { ProductionShootingKit } from "@/lib/production/shootingKit";
import type { ProductionIngestSession, TakeGroup } from "@/lib/production/ingestTypes";

export type { SceneCoverageChecklist } from "@/lib/production/sceneCoverageChecklist";

export type ProductionPersonGroup = "cast" | "production_team" | "camera_department";

export interface ProductionPerson {
  id: string;
  group: ProductionPersonGroup;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  storagePath?: string;
  crewMemberId?: string;
  /** Links this cast/crew slot to a canonical creator roster record. */
  creatorId?: string;
  notes?: string;
  callTime?: string;
  sortOrder: number;
}

export interface ProductionStoryLink {
  id: string;
  label: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  storagePath?: string;
  sortOrder: number;
}

export interface ProductionInspirationImage {
  id: string;
  imageUrl: string;
  storagePath?: string;
  caption?: string;
  sourceUrl?: string;
  sortOrder: number;
}

export interface ProductionLocationEntry {
  id: string;
  name: string;
  address?: string;
  parkingNotes?: string;
  photoUrl?: string;
  storagePath?: string;
  status: "booked" | "needed";
  notes?: string;
}

export interface ProductionDayScheduleBlock {
  id: string;
  label: string;
  locationName?: string;
  address?: string;
  startTime?: string;
  endTime?: string;
  parkingNotes?: string;
  notes?: string;
  sortOrder: number;
}

export type ProductionShotImageSource =
  | "inspiration"
  | "upload"
  | "script_match"
  | "scene_migrate"
  | "ai_generate";

/** On-set status. Separate from Scene Builder visual status. */
export const PRODUCTION_SHOT_STATUSES = ["planned", "ready", "shot", "needs_pickup", "complete"] as const;
export type ProductionShotStatus = (typeof PRODUCTION_SHOT_STATUSES)[number];
export const PRODUCTION_SHOT_STATUS_LABELS: Record<ProductionShotStatus, string> = {
  planned: "Planned",
  ready: "Ready",
  shot: "Shot",
  needs_pickup: "Needs Pickup",
  complete: "Complete",
};

export type ProductionShotMediaRole = "planned_reference" | "ai_previs" | "captured_footage";

export type TakeDecision = "unreviewed" | "best" | "alternate" | "reject";

/** Editorial decision for one captured clip or one confirmed Take Group. Media is not deleted. */
export interface ShotTakeReview {
  id: string;
  source: "clip" | "group";
  decision: TakeDecision;
  rating?: number | null;
  note?: string;
  preferredVideoClipId?: string | null;
  preferredAudioClipId?: string | null;
  reviewedAt?: string;
  updatedAt: string;
}

export type ShotReviewState = "unreviewed" | "in_review" | "reviewed" | "needs_pickup";

export interface ProductionShotMedia {
  id: string;
  role: ProductionShotMediaRole;
  url: string;
  storagePath?: string;
  label?: string;
  mimeType?: string;
  projectId?: string;
  productionShotId?: string;
  fileName?: string;
  mediaType?: string;
  createdAt?: string;
  camera?: string;
  takeNumber?: number | null;
  /** Clip length when known. Separate from the shot's planned duration. */
  clipDuration?: string;
  notes?: string;
  rating?: number | null;
  preferred?: boolean;
  /** Room for later ingest: timecode, source card, camera body, reel. */
  metadata?: Record<string, string>;
}

/**
 * Coverage unit: one shot = one storyboard frame.
 * Rich DP fields mirror ScriptSuggestedShot so apply/refresh no longer collapses into notes only.
 */
export interface ProductionDayShot {
  id: string;
  label: string;
  sceneRef?: string;
  sceneHeading?: string;
  done: boolean;
  scoutShotNumber?: number;
  /** Stable Content Plan shot id when seeded from Content Plan director. */
  contentPlanShotId?: string;
  /** Freeform / legacy notes; structured fields preferred when present. */
  notes?: string;
  sortOrder: number;
  /** e.g. master_wide, medium_shot, close_up */
  shotType?: string;
  shotName?: string;
  /** What we see / caption */
  description?: string;
  subjectAction?: string;
  cameraMovement?: string;
  lens?: string;
  lighting?: string;
  purpose?: string;
  framing?: string;
  cameraHeight?: string;
  blocking?: string;
  exposureNotes?: string;
  audioNotes?: string;
  audioCue?: string;
  setupNotes?: string;
  duration?: string;
  cameraBody?: string;
  support?: string;
  assignedLights?: string[];
  assignedProps?: string[];
  dollyMoveRef?: string;
  editNote?: string;
  /** Storyboard frame image for this shot */
  referenceImageUrl?: string;
  referenceImageStoragePath?: string;
  referenceImageSource?: ProductionShotImageSource;
  inspirationImageId?: string;
  /** Scene Builder scene this shot was copied from. */
  sourceSceneId?: string;
  /** Scene Builder shot this production shot was copied from. */
  sourceShotId?: string;
  sourceSceneTitle?: string;
  /** When Scene Builder last pushed this shot. */
  sourceSyncedAt?: string;
  /** Set when the source scene or shot can no longer be found. The production shot is kept. */
  sourceUnavailable?: boolean;
  cameraAngle?: string;
  /** Planning notes copied from Scene Builder. Production `notes` are left alone on later syncs. */
  sceneNotes?: string;
  productionStatus?: ProductionShotStatus;
  /** Editorial review progress. Separate from productionStatus. */
  reviewState?: ShotReviewState;
  /** Why a shot needs to be picked up. Kept separate from Scene Builder notes. */
  pickupReason?: string;
  /** Human review decisions for captured takes and take groups. */
  takeReviews?: ShotTakeReview[];
  /** Planned references, AI previs, and later captured footage. */
  media?: ProductionShotMedia[];
}

export type ProductionSceneFrameImageSource = "inspiration" | "upload" | "script_match";

/**
 * Legacy scene-level storyboard card (one per scene).
 * Prefer shot-level images on ProductionDayShot; kept for migration + older boards.
 */
export interface ProductionSceneFrame {
  id: string;
  sceneRef: string;
  sceneHeading?: string;
  shotType?: string;
  shotName?: string;
  caption?: string;
  audioCue?: string;
  referenceImageUrl?: string;
  referenceImageStoragePath?: string;
  referenceImageSource?: ProductionSceneFrameImageSource;
  inspirationImageId?: string;
  sortOrder: number;
}

export interface ProductionDay {
  id: string;
  title: string;
  shootDate?: string;
  dayNumber: number;
  scenes: string[];
  schedule: ProductionDayScheduleBlock[];
  shots: ProductionDayShot[];
  /** Scene-level storyboard cards (one per scene). */
  sceneFrames?: ProductionSceneFrame[];
  /**
   * Required coverage checklist per scene — seeded from script-writer settings
   * (detailed shot list, content type, cast size, mood).
   */
  coverageChecklists?: SceneCoverageChecklist[];
  /** Generated crew printout packet (master list + per-role sections). */
  crewPacket?: CrewPrintoutPacket;
  crewCall?: string;
  breakfast?: string;
  lunch?: string;
  wrapTime?: string;
  weatherNotes?: string;
  sunrise?: string;
  sunset?: string;
  primaryLocation?: string;
  primaryAddress?: string;
  producerName?: string;
  adName?: string;
  directorName?: string;
  dpName?: string;
}

export interface ProductionBoard {
  id: string;
  projectId: string;
  userId: string;
  filmTitle?: string;
  logline?: string;
  idealRuntime?: string;
  lookAndFeel?: string;
  references?: string;
  people: ProductionPerson[];
  storyLinks: ProductionStoryLink[];
  inspirationImages: ProductionInspirationImage[];
  locations: ProductionLocationEntry[];
  gearItems: string[];
  /** Structured pre-production kit — drives detailed shot list gear assignment. */
  shootingKit?: ProductionShootingKit;
  gearNotes?: string;
  filmingNotes?: string;
  musicLink?: string;
  budgetLink?: string;
  productionDays: ProductionDay[];
  linkedScoutProjectIds: string[];
  /** Linked script writer session when applied from AI script */
  scriptSessionId?: string;
  scriptFountain?: string;
  /** Pre-production → post checklist (portfolio vs client template) */
  checklistMode?: ProductionChecklistMode;
  checklistItems?: ProductionChecklistItem[];
  /** Camera-card ingest sessions. Originals stay on the selected drive. */
  ingestSessions?: ProductionIngestSession[];
  /** Suggested and confirmed multicam/audio groups. Members point at ingest clips. */
  takeGroups?: TakeGroup[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
