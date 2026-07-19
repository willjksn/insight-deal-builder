import { Timestamp } from "firebase/firestore";
import { ProductionChecklistItem, ProductionChecklistMode } from "@/lib/production/checklist";
import { CrewPrintoutPacket } from "@/lib/production/crewPacketTypes";
import { ProductionShootingKit } from "@/lib/production/shootingKit";

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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
