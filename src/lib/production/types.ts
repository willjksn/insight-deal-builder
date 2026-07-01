import { Timestamp } from "firebase/firestore";
import { ProductionChecklistItem, ProductionChecklistMode } from "@/lib/production/checklist";
import { CrewPrintoutPacket } from "@/lib/production/crewPacketTypes";

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

export interface ProductionDayShot {
  id: string;
  label: string;
  sceneRef?: string;
  done: boolean;
  scoutShotNumber?: number;
  notes?: string;
  sortOrder: number;
  /** e.g. master_wide, medium_shot, close_up */
  shotType?: string;
  shotName?: string;
  subjectAction?: string;
  cameraMovement?: string;
}

export type ProductionSceneFrameImageSource = "inspiration" | "upload" | "script_match";

/** One storyboard card per scene — grid view and client print. */
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
